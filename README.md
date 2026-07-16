# NovaDev Education Website

This folder contains the Vercel-ready NovaDev education and download website. It documents the current compiler, three web targets, project workflow, package manager, Nova IDE curriculum, and Windows installation experience.

## File Structure

```txt
nova website/
  index.html
  learn.html
  projects.html
  packages.html
  windows.html
  examples.html
  reference.html
  assets/
    css/styles.css
    js/site.js
    icons/novadev.ico
    js/novadev-scene-fixed.js
    novadev-hero.png
  downloads/
    install-novadev.py
    NovaDevSetup.exe
    novadev.zip
    registry.json
    checksums.json
    packages/
      hello-ui.zip
      auth-kit.zip
      dashboard-kit.zip
  vercel.json
  README.md
```

## Pages

- `index.html` introduces NovaDev and shows the Three.js compiler-pipeline hero.
- `learn.html` teaches variables, data, control flow, functions, classes, modules, Python bridge usage, and shell commands.
- `projects.html` explains ProjectIR, modes, custom mode, Vue/Tailwind generation, Express/Node backends, workflows, routes, and custom modules.
- `packages.html` explains `novapm`, local installation, package manifests, registry JSON, and website-hosted downloads.
- `windows.html` explains the Setup executable, PATH registration, `.nova` file icons, NovaDev Manager, the protected source workspace, diagnostics, and uninstall choices.
- `examples.html` shows ecommerce, construction, security, school, CRM, custom, and general-purpose examples.
- `reference.html` collects CLI commands, shell commands, compiler pipeline, FAQ, and file structures.

## UI Libraries

The site uses CDN libraries so it can stay static:

- Three.js for the animated compiler pipeline background.
- Shoelace UI for tabs, details, and polished web components.
- Highlight.js for code highlighting.

## Local Preview

Open `index.html` in a browser, or run a small static server from this folder:

```bash
python -m http.server 8080
```

## Deploying to Vercel

Create a Vercel project and use this folder as the project root. No build command is required because the site is plain HTML, CSS, and JavaScript.

After deployment, users can install NovaDev from the website with:

```bash
python install-novadev.py --zip-url https://novadev-org.vercel.app/downloads/novadev.zip --install-all-packages
```

That command installs the language, configures `novapm` to use `downloads/registry.json`, installs the bundled packages, registers `.nova` files on Windows, and creates `Downloads\Nova source code` for projects made with `nova new`.

For the Windows setup app, compile the Inno Setup definition first:

```powershell
& "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe" ".\installer\windows\NovaDevSetup.iss"
```

Then rebuild the portable zip, package registry, and checksums:

```powershell
python .\scripts\build_website_downloads.py
```

Then redeploy this website folder so users can download:

```txt
https://novadev-org.vercel.app/downloads/NovaDevSetup.exe
```
