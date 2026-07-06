from __future__ import annotations

"""Bootstrap installer for NovaDev.

This file is meant to be downloaded from the NovaDev education website. It
installs a local copy of the language into ~/.novadev and creates small command
launchers so users can run nova, nova-shell, and novapm from their terminal.
"""

import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from urllib.parse import urljoin
import urllib.request
import zipfile
from pathlib import Path


EXCLUDED_NAMES = {
    ".git",
    ".novadev",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    "dist",
    "generated_backend",
    "generated_project",
    "generated_projects",
    ".tmp-novapm-home",
}


def should_copy(path: Path) -> bool:
    if any(part.startswith(".tmp-") for part in path.parts):
        return False
    return not any(part in EXCLUDED_NAMES for part in path.parts)


def copy_tree(source: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    target_resolved = target.resolve()

    def is_target_related(item: Path) -> bool:
        item_resolved = item.resolve()
        return (
            item_resolved == target_resolved
            or target_resolved in item_resolved.parents
            or item_resolved in target_resolved.parents
        )

    def copy_item(item: Path, destination: Path) -> None:
        relative = item.relative_to(source)
        if is_target_related(item) or not should_copy(relative):
            return

        if item.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
            for child in item.iterdir():
                copy_item(child, destination / child.name)
        elif item.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)

    for item in source.iterdir():
        copy_item(item, target / item.name)


def download_to_temp(url: str) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="novadev-install-"))
    target = temp_dir / "novadev-source.zip"
    urllib.request.urlretrieve(url, target)
    return target


def prepare_source(source: str | None, zip_url: str | None) -> tuple[Path, Path | None]:
    cleanup_dir = None

    if zip_url:
        archive = download_to_temp(zip_url)
        cleanup_dir = archive.parent
        extract_dir = cleanup_dir / "source"
        with zipfile.ZipFile(archive, "r") as zip_file:
            zip_file.extractall(extract_dir)
        return find_project_root(extract_dir), cleanup_dir

    if not source:
        raise SystemExit("Provide --source PATH or --zip-url URL.")

    source_path = Path(source).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Source not found: {source_path}")

    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        cleanup_dir = Path(tempfile.mkdtemp(prefix="novadev-install-"))
        extract_dir = cleanup_dir / "source"
        with zipfile.ZipFile(source_path, "r") as zip_file:
            zip_file.extractall(extract_dir)
        return find_project_root(extract_dir), cleanup_dir

    return source_path, None


def find_project_root(path: Path) -> Path:
    if (path / "nova.py").exists() or (path / "novapm.py").exists():
        return path

    children = [child for child in path.iterdir() if child.is_dir()]
    if len(children) == 1:
        return find_project_root(children[0])

    raise SystemExit("Could not find NovaDev project root in the provided source.")


def write_text_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")
    current_mode = path.stat().st_mode
    path.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def write_launchers(home: Path) -> None:
    bin_dir = home / "bin"
    language_dir = home / "language"
    python_exe = sys.executable
    bin_dir.mkdir(parents=True, exist_ok=True)

    launchers = {
        "nova": language_dir / "nova.py",
        "nova-shell": language_dir / "shell.py",
        "novapm": language_dir / "novapm.py",
        "novadev-manager": language_dir / "novadev_manager.py",
    }

    for command, script in launchers.items():
        write_text_executable(
            bin_dir / f"{command}.cmd",
            f'@echo off\r\nset "NOVADEV_HOME={home}"\r\n"{python_exe}" "{script}" %*\r\n',
        )
        write_text_executable(
            bin_dir / command,
            f'#!/usr/bin/env sh\nexport NOVADEV_HOME="{home}"\nexec "{python_exe}" "{script}" "$@"\n',
        )


def infer_registry_url(zip_url: str | None) -> str | None:
    if not zip_url:
        return None
    return urljoin(zip_url, "registry.json")


def configure_registry(home: Path, registry_url: str | None) -> None:
    if not registry_url:
        return
    home.mkdir(parents=True, exist_ok=True)
    config_path = home / "config.json"
    config_path.write_text(json.dumps({"registry": registry_url}, indent=2) + "\n", encoding="utf-8")


def read_registry(registry_url: str) -> dict:
    if registry_url.startswith(("http://", "https://")):
        with urllib.request.urlopen(registry_url, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            data.setdefault("_registry_base_url", registry_url.rsplit("/", 1)[0] + "/")
            return data
    registry_path = Path(registry_url).expanduser().resolve()
    data = json.loads(registry_path.read_text(encoding="utf-8"))
    data.setdefault("_registry_base_path", str(registry_path.parent))
    return data


def package_names_from_registry(registry_url: str) -> list[str]:
    registry = read_registry(registry_url)
    return [package["name"] for package in registry.get("packages", []) if package.get("name")]


def run_novapm(home: Path, args: list[str]) -> None:
    novapm = home / "language" / "novapm.py"
    command = [sys.executable, str(novapm), *args, "--home", str(home)]
    subprocess.run(command, check=True)


def install_packages(home: Path, packages: list[str]) -> None:
    for package in packages:
        print(f"Installing package: {package}", flush=True)
        run_novapm(home, ["install", package])


def normalize_path_item(value: str) -> str:
    return str(Path(value).expanduser()).rstrip("\\/").lower()


def add_to_user_path(bin_dir: Path) -> str:
    """Add NovaDev bin to the current user's PATH on Windows.

    The current PowerShell/CMD process will not see this change until the user
    opens a new terminal. We still print a current-session command below.
    """

    if os.name != "nt":
        return "not-supported"

    import ctypes
    import winreg

    bin_value = str(bin_dir)
    key_path = "Environment"
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ | winreg.KEY_WRITE) as key:
        try:
            current_path, value_type = winreg.QueryValueEx(key, "Path")
        except FileNotFoundError:
            current_path = ""
            value_type = winreg.REG_EXPAND_SZ

        items = [item for item in current_path.split(";") if item.strip()]
        normalized = {normalize_path_item(item) for item in items}
        if normalize_path_item(bin_value) in normalized:
            return "already-present"

        next_path = current_path.rstrip(";")
        next_path = f"{next_path};{bin_value}" if next_path else bin_value
        winreg.SetValueEx(key, "Path", 0, value_type, next_path)

    # Broadcast the environment change for newly opened apps.
    hwnd_broadcast = 0xFFFF
    wm_settingchange = 0x001A
    smto_abortifhung = 0x0002
    ctypes.windll.user32.SendMessageTimeoutW(
        hwnd_broadcast,
        wm_settingchange,
        0,
        "Environment",
        smto_abortifhung,
        5000,
        None,
    )
    return "updated"


def associate_nova_files(home: Path) -> str:
    """Register the .nova file extension with the NovaDev launcher on Windows."""

    if os.name != "nt":
        return "not-supported"

    try:
        import ctypes
        import winreg

        nova_cmd = home / "bin" / "nova.cmd"
        icon_path = home / "language" / "assets" / "icons" / "novadev.ico"
        if not icon_path.exists():
            icon_path = home / "assets" / "novadev.ico"

        if not nova_cmd.exists():
            return "launcher-missing"

        icon_value = f"{icon_path},0" if icon_path.exists() else f"{nova_cmd},0"
        open_command = f'"{nova_cmd}" run "%1"'
        edit_command = 'notepad.exe "%1"'

        values = {
            r".nova": "NovaDev.SourceFile",
            r"NovaDev.SourceFile": "NovaDev Source File",
            r"NovaDev.SourceFile\DefaultIcon": icon_value,
            r"NovaDev.SourceFile\shell\open\command": open_command,
            r"NovaDev.SourceFile\shell\edit\command": edit_command,
        }

        for subkey, value in values.items():
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{subkey}") as key:
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, value)

        # Tell Explorer to refresh file icons and extension associations.
        shcne_assocchanged = 0x08000000
        ctypes.windll.shell32.SHChangeNotify(shcne_assocchanged, 0, None, None)
        return "updated"
    except Exception as exc:  # noqa: BLE001 - installer should keep going.
        return f"failed: {exc}"


def install_vscode_extension(language_dir: Path) -> str:
    """Install NovaDev's local VS Code language/icon extension when available."""

    source = language_dir / "tools" / "vscode" / "novadev"
    if not source.exists():
        return "missing"

    try:
        target = Path.home() / ".vscode" / "extensions" / "novadev.novadev-language-1.1.0"
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source, target)
        return "updated"
    except Exception as exc:  # noqa: BLE001 - editor setup should not abort install.
        return f"failed: {exc}"


def install(
    source: str | None,
    zip_url: str | None,
    home: Path,
    registry_url: str | None,
    package_names: list[str],
    install_all_packages: bool,
    update_path: bool,
    associate_files: bool,
    install_editor_extension: bool,
) -> None:
    project_source, cleanup_dir = prepare_source(source, zip_url)
    language_dir = home / "language"
    registry_url = registry_url or infer_registry_url(zip_url)
    bin_dir = home / "bin"

    try:
        home.mkdir(parents=True, exist_ok=True)
        copy_tree(project_source, language_dir)
        write_launchers(home)
        configure_registry(home, registry_url)
        packages_to_install = package_names
        if install_all_packages and registry_url:
            packages_to_install = package_names_from_registry(registry_url)
        if packages_to_install:
            install_packages(home, packages_to_install)
    finally:
        if cleanup_dir and cleanup_dir.exists():
            shutil.rmtree(cleanup_dir)

    path_status = add_to_user_path(bin_dir) if update_path else "skipped"
    association_status = associate_nova_files(home) if associate_files else "skipped"
    vscode_status = install_vscode_extension(language_dir) if install_editor_extension else "skipped"

    print("NovaDev installed.")
    print(f"Home: {home}")
    print(f"Language: {language_dir}")
    print(f"Launchers: {bin_dir}")
    if registry_url:
        print(f"Registry: {registry_url}")
    print()
    if os.name == "nt":
        if path_status == "updated":
            print("PATH updated for new PowerShell/CMD windows.")
        elif path_status == "already-present":
            print("PATH already contains the NovaDev bin folder.")
        elif path_status == "skipped":
            print("PATH update skipped.")
        if association_status == "updated":
            print(".nova files now use the NovaDev icon and open with nova run.")
        elif association_status == "launcher-missing":
            print(".nova file association skipped because nova.cmd was not found.")
        elif association_status.startswith("failed:"):
            print(f".nova file association skipped: {association_status}")
        elif association_status == "skipped":
            print(".nova file association skipped.")
        if vscode_status == "updated":
            print("VS Code NovaDev language/icon extension installed. Restart VS Code to see it.")
        elif vscode_status == "missing":
            print("VS Code extension skipped because tools/vscode/novadev was not found.")
        elif vscode_status.startswith("failed:"):
            print(f"VS Code extension install skipped: {vscode_status}")
        elif vscode_status == "skipped":
            print("VS Code extension install skipped.")
        print("For this current PowerShell window, run:")
        print(f'$env:Path = "{bin_dir};" + $env:Path')
    else:
        print("Add this folder to PATH if the commands are not found:")
        print(str(bin_dir))
    print()
    print("Try:")
    print("  nova shell")
    print("  nova run examples/hello.nova")
    print("  novapm doctor")
    if registry_url:
        print("  novapm search")


def main() -> int:
    parser = argparse.ArgumentParser(description="Install NovaDev locally.")
    parser.add_argument("--source", help="Local NovaDev source folder or zip file.")
    parser.add_argument("--zip-url", help="Download a NovaDev source zip from this URL.")
    parser.add_argument("--registry-url", help="NovaDev package registry URL or local registry path.")
    parser.add_argument("--install-package", action="append", default=[], help="Install one package after language install. Can be used more than once.")
    parser.add_argument("--install-all-packages", action="store_true", help="Install every package listed in the configured registry.")
    parser.add_argument("--no-path", action="store_true", help="Do not add NovaDev bin to the Windows user PATH.")
    parser.add_argument("--no-file-association", action="store_true", help="Do not register .nova files with the NovaDev icon on Windows.")
    parser.add_argument("--no-vscode-extension", action="store_true", help="Do not install the NovaDev VS Code language/icon extension.")
    parser.add_argument("--home", default=str(Path.home() / ".novadev"), help="Install location.")
    args = parser.parse_args()

    install(
        args.source,
        args.zip_url,
        Path(args.home).expanduser().resolve(),
        args.registry_url,
        args.install_package,
        args.install_all_packages,
        not args.no_path,
        not args.no_file_association,
        not args.no_vscode_extension,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
