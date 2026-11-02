# Forma SEM Studio

Version **1.0.0-rc.1**. Local SEM, CFA and observed-variable path analysis with
lavaan, a dataset viewer, syntax/drawing synchronisation and publication exports.
See the [user guide](../docs/user-guide.md), [release record](../docs/release.md)
and [13 reference figures](../docs/phase-4-gallery.html).

## Use the portable application

For a desktop application with everything included, use the
[standalone desktop packages](../desktop/README.md) under
`releases/desktop/Forma-1.0.0-rc.1/`. Windows, macOS and Linux editions include
their own browser/runtime and require no Python, Node.js or R installation.
The browser-based package below is retained as an alternative.

Extract `releases/Forma-1.0.0-rc.1.zip`. Run `Start-Forma.cmd` on Windows,
double-click `Start-Forma.command` on macOS, or run `sh Start-Forma.sh` on Linux.
The launcher opens <http://127.0.0.1:8765/> and binds to loopback only. Python 3.8
or newer is required; R and Node are not. The same launchers in the project
root start `app/dist/` after a build. Keep their terminal open; Ctrl+C stops the
server. Starting again reopens the existing Forma instance.

The complete webR 0.6.0/R 4.6.0 runtime, lavaan 0.7-3, semTools 0.5-10, Excel/SPSS
readers and fonts are bundled. No remote R package installation is performed.
The initial local transfer is approximately 84 MiB. After precaching succeeds,
the status bar reports offline readiness. Full browser-level offline certification
is pending; restricted browser storage can prevent precaching or autosave.

Projects now use schema 3 and retain fitted results, annotation choices and
the selected workspace alongside the canonical table, syntax, positions, options
and optional original dataset. Opening a fit checks a SHA-256 fingerprint of
its data/import/type settings. Changed or missing data leave historical results
out of date. Schema 1/2 projects remain readable. IndexedDB autosave is local to
the exact browser origin; save a project file as a portable backup.

## Develop

```powershell
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. Source is TypeScript/React; R adapters under
`src/r/` call the real lavaan parser, estimator and parameter table. The editor
tokenizer supplies highlighting only. All interface text is in `src/en.json`.
The source and vendored engine are sufficient for an application build;
native R is used only for independent reference verification.

## Build and deploy

```powershell
npm test
npm run build
node scripts/check-build.mjs
```

The build compiles TypeScript, bundles production JavaScript, hashes all static
assets and generates an integrity-bound service worker. `check-build.mjs` checks
asset bytes/hashes and simulates cache installation, offline navigation,
application-only caching and failed-install cleanup under Node. It does not
certify browser service-worker behaviour.

Deploy **only the contents of `app/dist/`** to HTTPS static hosting. Keep all
engine files. Vite uses relative URLs, including runtime and service-worker
paths, so subdirectory hosting is supported. PostMessage workers do not need
cross-origin isolation headers. Cancellation recreates the worker and restores
the dataset. No public deployment is performed by the build or launcher.

## Verify statistics and exports

From the workspace root:

```powershell
node spike/check-packaged.mjs
python scripts/compare-release.py
```

This executes the **bundled** engine without package installation: all import,
analysis, editing and advanced R checks run in its WebAssembly runtime. The
comparison requires native reference evidence under `evidence/phase-2/` and
`evidence/phase-4/`. To refresh the native references, use the installed Rscript
from `app/` after the phase-specific setup scripts have installed their local
reference dependencies:

```powershell
Rscript --vanilla scripts/check-analysis.R
Rscript --vanilla scripts/check-editing.R
Rscript --vanilla scripts/check-advanced.R
Rscript --vanilla scripts/check-reproduction.R
```

`npx tsx scripts/render-phase4.ts` produces the 13 SVG/PNG/PDF/TikZ examples and
three Word/LaTeX reports using production modules. Optional QA scripts under
`scripts/` at the workspace root inspect PDF/vector/glyph output and compile
TeX. These QA tools are not application dependencies.

Development-only `?verify=analysis`, `?verify=editing` and `?verify=advanced`
harnesses exercise the real browser runtime/storage with public or synthetic
fixtures. Their bounded loopback evidence endpoints and fixture routes are
absent from the production bundle. See the phase notes for their exact scope.

## Runtime provenance and packaging

`public/engine/manifest.json` records package versions and runtime hashes.
`src/engine-spec.json` pins loader/library sizes and SHA-256 hashes. The loader
checks those assets and required package versions before compiling a model.
The library is mounted read-only through WORKERFS; datasets remain in the worker's
separate writable filesystem.

`spike/package-release.mjs` rebuilds this library from the pinned webR npm
distribution and official R package binaries. It requires network access and
rejects dependency versions that differ from the existing lock. Retain the
vendored image when those historical package versions are unavailable.
`scripts/patch-webr-windows.mjs` records the Node-only Windows import correction.
No statistical algorithm is changed.

`python scripts/package-release.py` from the workspace root packages the verified
build, local server, guide, validation summary and original dependency licenses.
It emits per-file checksums and a ZIP SHA-256 file. It does not publish anything.

## Coverage boundaries

The full Chrome/Edge/Firefox/Safari release matrix remains open. Earlier real
checks passed in Firefox and embedded Chromium; the final offline/cache and
saved-result additions have automated Node coverage and require browser matrix
validation. Dense diagrams can retain crossings. The data viewer does not edit
cells. Feedback, multilevel and EFA diagrams are explicitly unsupported; the
[guide](../docs/user-guide.md) describes supported invariance/reliability designs
and remaining limits.
