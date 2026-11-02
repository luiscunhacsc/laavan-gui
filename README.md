# Forma · SEM application

Forma's target is a complete application for SEM, CFA and observed-variable
path analysis using datasets supplied by the user. It includes a spreadsheet-style
data viewer, model specification through syntax and drawing, lavaan estimation,
annotated diagrams and analysis results. Data-free diagramming is also supported.

Standalone desktop packages are available in
`releases/desktop/Forma-1.0.0-rc.1/` for **Windows, macOS and Linux**, with
**x64 and ARM64** editions. They include Chromium, Node.js, R/lavaan, import
readers and fonts: no separate runtime installation or internet connection is
needed. Extract the archive and open `Forma.exe` on Windows, `Forma.app` on
macOS, or `Start-Forma.sh` on Linux. See the [desktop instructions](desktop/README.md)
for building, project migration and validation limits.

**The local release candidate, 1.0.0-rc.1, is ready** in `app/` and
`releases/Forma-1.0.0-rc.1.zip`. It includes the data viewer, two-way model editor,
SEM/CFA/path estimation, advanced analyses and publication exports, plus a
self-contained R engine, offline cache and saved fitted results.

- [Open Forma](http://127.0.0.1:8000/app/dist/).
- [Portable ZIP](releases/Forma-1.0.0-rc.1.zip): extract and run `Start-Forma.cmd`
  on Windows, `Start-Forma.command` on macOS, or `sh Start-Forma.sh` on Linux.
  Python 3.8 or newer is the only launcher
  dependency; R and Node are unnecessary for using the portable app.
- [User guide](docs/user-guide.md) and [release validation](docs/release.md).
- [Phase 4 workflows, verification and limits](docs/phase-4.md).
- [Seven fixed models plus fitted, Greek-notation and RAM-loop examples](docs/phase-4-gallery.html).
- [Run, build and deploy the application](app/README.md).

The 12/12 browser check is recorded as VS Code embedded Chromium 150/Electron 43.
The complete Chrome/Edge/Firefox/Safari release matrix remains open, including
browser-level offline checks of the final package. No public deployment has
been made.

The same three launchers are in this project folder and start the built app at
<http://127.0.0.1:8765/> in your default browser. Keep the launcher terminal open;
press Ctrl+C to stop. If Forma is already running, starting again reopens it.
The source checkout needs `app/dist/`; run `npm ci` and `npm run build` in `app/`
once if the launcher reports that the build is missing.

To start the development server from a new terminal:

```powershell
cd app
npm ci
npm run dev
```

The static application is `app/dist/`; the root `dist/` belongs to the earlier
research harness. The portable package contains only the production app,
launchers, documentation, validation summary and dependency notices.

## Phase 0 research package

The earlier **Phase 0 feasibility and review package** is retained below.
User-run experiments in **Firefox 159** and VS Code's
embedded Chromium/Electron browser installed webR/lavaan and passed the
native-R comparison. Firefox took **5.966 seconds** for the full experiment
and **0.948 seconds** for R initialisation. Embedded Chromium took 5.214 and
0.996 seconds respectively. Cache conditions were not recorded, so these
are not labelled cold-load benchmarks. Chrome, Edge and Safari numerical
checks, plus full application compatibility in all four browsers, remain
v1 release requirements.

- [Read the Phase 0 findings](docs/phase-0.md).
- [Read the proposed architecture and phase gates](docs/architecture.md).
- [Review all seven diagram studies](docs/gallery.html).
- [Inspect the native/WASM numerical comparison](evidence/node/comparison.json).
- [Inspect the native lavaan plotting baseline](docs/lavaan-baseline.html).

The accepted product choices are desktop Chrome, Edge, Firefox **and Safari**
from v1, and explicit CFA/SEM/Path analysis presets with **SEM initially selected**. The test
fixtures deliberately record their own preset; the CFA examples use CFA.

## Run the browser experiment

Requires Python 3 and an internet connection for the official webR CDN and R
package repository. No npm install and no native R installation are needed.

```powershell
python scripts/serve.py
```

Open <http://127.0.0.1:8000/spike/>. It automatically downloads pinned webR
0.6.0, installs lavaan, compiles seven models with lavaan itself, and fits the
first three using public or synthetic data. Leave the page open until complete.

Results are saved under `evidence/browser/<run-id>/`. The Python process serves
static files and records benchmark evidence on loopback only; it does not run R.
The analysis runs in the browser worker. The extra JSON package is timed
separately from lavaan installation. Stop the local server with Ctrl+C.

For each of the four target browsers, collect at least three fresh-profile
runs and three repeat visits. Use a dedicated profile rather than clearing your
normal browser's data. Record browser version, network, machine, and cache
conditions; do not label an ordinary reload a cold-cache measurement. Safari
requires a Mac. Raw timings and package versions are retained in each run.

Compare a completed browser run against native R:

```powershell
python scripts/compare.py evidence/browser/<run-id>
```

A measured Holzinger–Swineford fit now passes in Firefox and embedded
Chromium/Electron, along with the two other numerical fixtures. The full
four-browser matrix is a v1 release requirement.
[Recorded browser measurements](docs/browser-measurements.md).

To validate and summarise locally saved runs:

```powershell
python scripts/browser-results.py
```

For a JSON download from static hosting, import the bundle first:

```powershell
python scripts/browser-results.py --import path/to/sem-phase0-download.json
```

## Reproduce native R and Node.js checks

Requires native R, Python 3, and Node.js >= 20. Commands below assume `Rscript`
is on PATH; on this machine it is
`D:\Program Files\R\R-4.4.3\bin\Rscript.exe`.

```powershell
Rscript --vanilla scripts/setup-native.R
Rscript --vanilla scripts/run-native.R
npm ci --prefix spike
node scripts/patch-webr-windows.mjs
node spike/run-node.mjs
python scripts/compare.py
```

`patch-webr-windows.mjs` is only needed on Windows. webR 0.6.0 passes a drive
path to Node's dynamic import loader; the script changes that loader argument
to a `file:` URL in two installed dependency files. It is narrow, checked and
idempotent. **The browser harness uses the unmodified upstream CDN module.**
Node timings include package downloads and local WASM initialization, not a
browser's network transfer of the R runtime. They are never browser timings.

The setup script pins lavaan 0.7-3, installs into `.Rlib/`, and records dependency
versions in the results. The webR package repository is mutable: if a future
run supplies a different lavaan release, the comparison intentionally fails.
The long-term application needs an immutable package image with hashes.

## Regenerate the reference images

```powershell
python scripts/render-references.py
node spike/rasterize.mjs
```

The reference renderer reads **native lavaan parameter tables**, not lavaan
text. Its explicitly specified fixture positions are Phase 0 studies. It is
not an automatic layout engine and has no editor, drag or round-trip behavior.
All canonical rows are accounted for as paths or annotations. SVG and PNG
versions are under `docs/references/`; English review strings are in
`fixtures/reference.en.json`.

To reproduce the separate upstream automatic-layout experiment:

```powershell
Rscript --vanilla scripts/run-plot-baselines.R
node spike/rasterize.mjs evidence/lavaan-baseline/syntax
node spike/rasterize.mjs evidence/lavaan-baseline/table
node spike/rasterize.mjs evidence/lavaan-baseline/residuals
python scripts/build-baseline-gallery.py
```

Failed upstream SVG attempts can be incomplete files. The rasterizer consults
each baseline's `status.json` and does not present those as valid images.

## Package and deploy the research harness

```powershell
python scripts/package-static.py
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:8080/>. The `dist/` directory can be uploaded unchanged
to GitHub Pages or another HTTPS static host. All application file paths are
relative and work under a repository subpath. This packages the experiment
and reference gallery, **not a finished SEM application**. Nothing has been
published in this phase.

On a static host there is no evidence-write endpoint: the browser still shows
the benchmark and offers a JSON evidence download. Use the loopback server
when automatically collecting evidence in the workspace. The PostMessage
channel does not require COOP/COEP headers. Offline use on a first visit is
not provided; immutable assets and caching belong to the application plan.

## Structure

| Location | Purpose |
|---|---|
| `fixtures/models.json` | Seven fixed models, order and analysis preset |
| `spike/run.R` | Shared native/WASM compilation and fitting workload |
| `spike/spike.js`, `spike/en.json` | Browser harness and translated interface strings |
| `spike/run-node.mjs` | Separately labelled Node/WASM experiment |
| `spike/plot-baselines.R` | Upstream lavaan layout experiment |
| `scripts/compare.py` | Four-decimal agreement and semantic assertions |
| `evidence/native/`, `evidence/node/` | Actual retained numeric results |
| `docs/references/` | Seven review studies in SVG and PNG |

The Phase 0 tools remain available as reference and reproducibility checks.
Current converter modules and limits are documented in the Phase 1 findings.
