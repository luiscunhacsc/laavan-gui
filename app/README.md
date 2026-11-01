# Forma · SEM, CFA and path analysis

Forma is being built as a complete dataset-based SEM application, including a
spreadsheet-style data viewer, lavaan estimation, results and diagrams. The
current [Phase 2 review build](../docs/phase-2.md) implements dataset import,
a virtualised viewer, model specification, fitting, result tables and annotated
diagrams. The data-free converter remains available.

React/TypeScript provide the workspace, CodeMirror the editor, lavaan the
scientific model, and ELK plus SEM-specific placement/routing the diagram.
There is no R server and no model upload in the production build.

## Run

From this directory, with Node.js 22.12 or newer (23.6 was used here):

```powershell
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. The first visit downloads webR 0.6.0 and installs
lavaan 0.7-3 plus jsonlite. Subsequent edits use the same R worker. The runtime
checks the lavaan version before accepting a model. Network access is needed
for the first runtime/package load. A fully offline distribution and immutable
R package image are not yet implemented.
Excel imports load readxl on demand; SPSS imports load haven. All data parsing
and analysis take place in the browser worker.

## Use

- Open **Data** to import UTF-8 CSV/TSV, Excel or SPSS, choose an Excel sheet,
  configure CSV delimiters/missing codes, or paste a covariance matrix plus N.
  The three public/synthetic dataset buttons also load their matching models.
- Inspect cases in the virtualised grid. Search for a column, jump to a case,
  toggle stored values/value labels and inspect variable labels, missing counts
  and summaries. Select continuous, ordinal or nominal measurement types.
  This is an inspection viewer; it does not edit cell values.
- Write lavaan syntax or choose one of seven fixed examples. Changes compile
  automatically; Ctrl+Enter also updates the diagram.
- Choose SEM, CFA or Path analysis, group count, means and exogenous-variable
  treatment. SEM is the initial preset. The mediation and observed-path examples
  select Path analysis, which uses SEM defaults and accepts observed variables
  only. Latent or composite definitions receive a clear message; switching
  presets keeps your syntax. Path mode also offers a button to load a path example.
- Select ML, MLR or WLSMV, missing-data handling and a grouping variable where
  applicable, then **Run analysis**. Unsupported combinations receive a message;
  options are never silently substituted. Ordinal model variables use WLSMV.
- Open **Results** for convergence/warnings, fit measures, sortable parameter
  tables, R² and the complete R reproduction script. Export parameter CSV,
  analysis JSON or the R script. Changing inputs marks previous results out of date.
- Return to **Model** to show unstandardised or std.all labels, optional SEs or
  p-values, and R². Inadmissible/unconverged results do not annotate the diagram.
- Toggle implicit parameters and journal/presentation colours without changing
  the parameter table or node positions.
- Drag nodes, Shift-click to select several, align/distribute, zoom/pan or fit.
  The canvas routes edges after a drag is released. Reflow regenerates all
  positions and can be undone. Ordinary syntax edits preserve existing positions.
- Save/open `.forma.json` projects. The file retains the canonical table,
  current draft, model/analysis options and positions. Dataset files and fit results
  are kept separately; reattach the source dataset and review variable types after
  reopening. Browser autosave likewise stores the model, not dataset contents.
  On opening, lavaan recompiles the draft;
  an invalid draft leaves the last valid canonical model intact.
- Inspect the complete parameter table or copy the equivalent R script.
- Export SVG from an up-to-date valid model. Selection controls are omitted
  from the export. Full scientific PNG/PDF/TikZ exports belong to Phase 4.

All product text is in `src/en.json`. The lightweight editor tokenizer colours
text only: `src/r/compile.R` calls lavaan's actual parser. The R adapter
retains raw parser metadata, constraints and all expanded parameter rows,
including automatically fixed marker loadings.

## Supported specification

`=~`, `~`, `~~`, intercepts, definitions, fixed/free/label modifiers,
equality/inequality constraints, group-specific vectors, second-order factors,
formative composites, single-indicator factors and explicit ordinal thresholds.
Group count is a document setting. Without data the app cannot infer an
item's number of ordinal categories or prove model identification.

Feedback cycles, multilevel and EFA blocks receive an explicit unsupported
message. Conversion is capped at 300 variables and 16 groups. This is a
coverage boundary, not a claim to render every valid lavaan construct.

## Checks

```powershell
npm test
npm run build
```

Tests use actual native-lavaan compilation fixtures. To regenerate them with R
and the workspace `.Rlib` already set up in Phase 0:

```powershell
Rscript --vanilla scripts/compile-fixtures.R
Rscript --vanilla scripts/check-adapter.R
npm test
npm run render:fixtures
```

Seven core models plus eight additional specifications are checked for
semantic coverage. Core models have independent node/edge and label-box
collision checks; tests also cover deterministic output, edit stability,
explicit versus implicit marker values, formative arrow direction, SVG
escaping and project round trips.

For a user-operated browser check, open the **development** URL
<http://127.0.0.1:5173/?verify=1>. This runs only the seven public fixtures and
saves browser results to `../evidence/phase-1/`. The development-only evidence
endpoint is absent from the production build. Then run from the workspace root:

```powershell
python scripts/verify-phase1.py
```

The browser output is compared against native lavaan table rows and semantic
coverage. This verifies the scientific conversion, not every mouse/keyboard
interaction or browser-specific export behaviour.

For Phase 2, from the workspace root:

```powershell
Rscript --vanilla scripts/phase2-package-check.R
Rscript --vanilla scripts/make-phase2-fixtures.R
cd app
Rscript --vanilla scripts/check-analysis.R
cd ..
python scripts/export-phase2-fixtures.py
node spike/phase2-analysis.mjs
python scripts/compare-phase2.py
```

The Node runner requires the Phase 0 webR dependency and its Windows import-path
patch. It is actual WASM execution, not a browser benchmark. The native adapter
checks also execute generated R scripts for Excel, SPSS, FIML, ordinal and matrix
fits. Frontend tests include fitted diagram geometry and snapshot invalidation.

With the development server running, open
<http://127.0.0.1:5173/?verify=analysis>. This opt-in check runs the first three
fits, uses actual browser font metrics and imports public Excel/SPSS fixtures.
It saves `evidence/phase-2/browser-<timestamp>.json`. Compare from the root:

```powershell
python scripts/compare-phase2.py evidence/phase-2/browser-<timestamp>.json
```

The development fixture/evidence routes are absent from the static production
build. A Firefox 159 run has passed; the other release browsers remain to verify.

## Build and deploy

```powershell
npm run build
npm run preview
```

The static app is in `app/dist/`. Upload that directory to an HTTPS static host,
including GitHub Pages. Vite uses relative asset paths so repository subpaths
work. No special cross-origin isolation headers are needed: webR uses
PostMessage. Cancellation restarts the worker instead of interrupting R in place.
Do not deploy the workspace root or the research harness's separate `dist/`.

## Boundaries for the next phases

Data import, viewing, fitting and annotated estimates are implemented in Phase 2;
see its [validation and limits](../docs/phase-2.md). Drawing new statistical
relationships with two-way syntax sync is Phase 3; dragging currently changes
geometry only. Advanced estimation, full exports and typography polish are
Phase 4. Dense diagrams may retain edge crossings; manual locks can also create
geometry conflicts, which are reported rather than silently reinterpreted.
