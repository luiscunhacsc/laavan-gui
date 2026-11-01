# Forma · SEM, CFA and path analysis

Forma is being built as a complete dataset-based SEM application, including a
spreadsheet-style data viewer, lavaan estimation, results and diagrams. The
current [Phase 3 review build](../docs/phase-3.md) implements dataset import,
a virtualised viewer, visual and syntax model editing, fitting, result tables,
annotated diagrams and dataset-aware projects. The data-free converter remains
available. [Phase 3 diagrams and generated syntax](../docs/phase-3-gallery.html).

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
- In **Model**, choose Observed or Latent and click the canvas. Use Regression,
  Loading, Covariance or Formative, selecting the source and then the target.
  Formative inputs point into the composite. A new latent is marked as having no
  indicators until connected; fitting/identification remains lavaan's responsibility.
- Select a variable or parameter to rename/delete it or change its fixed/free
  status, value or label. The right-hand inspector lists related parameters.
  Data-derived fitted parameters absent from the syntax are read-only; declare
  them explicitly in syntax to edit them. Structure edits apply to all groups;
  parameter edits can target one group or all groups.
- Select Dataset variables in the library to search, drag or click to add them.
  Visual edits regenerate grouped syntax and replace custom comments/formatting.
  lavaan checks round-trip meaning before commit; unsupported editing constructs
  and dangling parameter-label dependencies receive a clear message.
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
  Model undo/redo also restores valid syntax and options, with the latest 100
  transactions retained in memory. Ctrl/Cmd+Z and redo shortcuts work in the
  editor/canvas; an invalid draft can be returned to the last valid model.
- Save/open `.forma.json` projects. The file retains the canonical table,
  current draft, model/analysis options and positions. Version 2 includes the
  original dataset source and measurement-type choices by default; Model options
  can exclude the dataset from exported projects. Version 1 files remain readable.
  IndexedDB autosave retains the matching model/source/type settings locally and
  restores them after reload. Fitted results must be rerun after reopening; analysis
  JSON and R scripts remain separate exports. Dataset contents are not uploaded.
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

For Phase 3, run `Rscript --vanilla scripts/check-editing.R` from `app/`.
From the root, run `node spike/phase3-editing.mjs` followed by
`python scripts/compare-phase3.py`. These compare all seven fixed models plus
eight extra specifications through actual native and WASM edit/format operations.
They also check dependency guards, group-specific editing and transactional data
restore. The GUI-created mediation specification is numerically compared with
the reference model.

With the development server running, open
<http://127.0.0.1:5173/?verify=editing>. Its persistent status badge reports
**Editing and project verification: 15/15** on success. It additionally checks
portable source bytes, SPSS type/label/missing-code restoration, real IndexedDB,
worker restart recovery and a drawn model's fit. Compare its saved report from
the root:

```powershell
python scripts/compare-phase3.py evidence/phase-3/browser-<timestamp>.json
```

This check has passed in Firefox 159. The browser harness invokes real editing
and storage APIs; manual drag/drop and file-dialog coverage remains limited.
The [Phase 3 notes](../docs/phase-3.md) describe the coverage boundaries.

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

Data import, viewing, fitting and annotated estimates are implemented in Phase 2.
Visual relationships, parameter editing, model undo/redo, portable data attachments
and browser workspace recovery are implemented in Phase 3. Advanced estimation,
full exports and typography polish remain Phase 4. See the
[current validation and limits](../docs/phase-3.md), including unsupported visual
syntax families, per-origin autosave, source-file/model size limits and remaining
browser checks. Dense diagrams/manual placement may still create crossings or
geometry conflicts; these are reported rather than silently reinterpreted.
