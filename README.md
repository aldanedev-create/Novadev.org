# NovaDev Education Website

This folder contains a Vercel-ready static education website for NovaDev. It is structured like a small language learning portal: home, language guide, project compiler guide, package manager guide, examples, and reference.

## File Structure

```txt
nova website/
  index.html
  learn.html
  projects.html
  packages.html
  examples.html
  reference.html
  assets/
    css/styles.css
    js/site.js
    js/novadev-scene.js
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
- `projects.html` explains ProjectIR, modes, custom mode, Vue/Tailwind generation, Flask backends, workflows, routes, and custom modules.
- `packages.html` explains `novapm`, local installation, package manifests, registry JSON, and website-hosted downloads.
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

That command installs the language, configures `novapm` to use `downloads/registry.json`, and installs the bundled packages listed in the registry.

For the Windows setup app, build this first:

```powershell
.\installer\windows\build-installer.ps1
```

Then redeploy this website folder so users can download:

```txt
https://novadev-org.vercel.app/downloads/NovaDevSetup.exe
```
