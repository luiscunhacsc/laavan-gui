# Phase 2 · data, estimation and results

Historical Phase 2 review. The current [Phase 3 build](phase-3.md) adds visual
editing and projects/autosave that retain datasets and variable settings.

Status: implemented and ready for Phase 2 review. Open
[Forma](http://127.0.0.1:8000/app/dist/) and the
[seven-model plus fitted-diagram gallery](phase-2-gallery.html).

The build passes TypeScript/Vite compilation and **31 frontend tests**. A real
Firefox 159 run fits all three numerical reference models and matches native
R/lavaan to four decimal places for estimates, SEs and standardised values.
The largest absolute difference is 3.28 × 10⁻⁹. See
[Firefox comparison](../evidence/phase-2/browser-comparison.json).
Excel/SPSS metadata and displayed reference cells match native R exactly.

The [native/WASM comparison](../evidence/phase-2/comparison.json) additionally
checks Excel/SPSS fitting, MLR/FIML, ordinal WLSMV and covariance input in Node's
actual WASM runtime. Node execution is not counted as a browser UI check.
Native checks execute the generated R scripts and compare their estimates.
A separate [user-reported smoke check](../evidence/phase-2/manual-smoke.json)
confirmed the 400-case grid and a converged mediation analysis in the product UI.

Forma's target is a complete SEM, CFA and observed-variable path-analysis
application powered by lavaan. A spreadsheet-style data viewer, familiar to
users of JASP or jamovi, is part of the core analysis workflow. Users can also
create model diagrams before attaching data.

## Connected workspaces implemented

- **Data:** import a dataset, inspect its cases and variable metadata, check
  missing values and choose measurement types.
- **Model:** specify SEM, CFA or path analysis, inspect the diagram and choose
  estimation options. Dataset variables are available to editor completion.
- **Results:** run lavaan, review warnings and convergence, inspect fit measures
  and parameter tables, and display estimates on the diagram.

These workspaces share an explicit dataset and model revision. Changing data,
syntax, variable types or analysis options marks previous results as out of date.
No previous fit may appear to describe the changed analysis.

## Import and data viewer

Implemented: UTF-8 CSV/TSV through R's table reader, Excel `.xls`/`.xlsx` through
readxl, and SPSS `.sav`/`.zsav` through haven. Excel exposes sheet selection;
CSV exposes delimiters and missing codes. Import failures retain the current
dataset. SPSS variable/value labels and user-defined missing codes are preserved:
the grid can show the stored missing code and its label, while fitting treats it
as missing. Ordered-variable choices remain explicit in the variable inspector.
Reader versions are retained in the analysis result. Package documentation:
[readxl](https://readxl.tidyverse.org/reference/read_excel.html),
[haven](https://haven.tidyverse.org/reference/read_spss.html).

The viewer provides:

- A scrollable grid with virtualised rows and columns, case numbers, headers and
  actual imported cell values, including explicit missing-value display.
- Case and variable counts, column search/navigation and variable details.
- Variable names and labels, numeric/categorical/ordered type information,
  category/value labels, missing counts and basic summaries.
- Visible distinctions between stored values and display labels. Inspection,
  sorting or searching must not silently recode values or change fitted cases.
- Clear handling of nonnumeric columns, duplicate names, conversion errors and
  variables referenced by a model but absent from the dataset.

Covariance input accepts a named full square matrix, N and optional means, with
symmetry/positive-definiteness checks. It has a matrix viewer and is labelled as
sample statistics. ML uses lavaan's default sample-covariance rescaling; supply
the usual covariance matrix computed with divisor N−1.

Dataset editing, recoding and computed columns need explicit changes with
revision tracking; displaying a dataset alone does not imply those operations
have been implemented. The initial viewer must faithfully inspect imported data.

## Estimation and results

The selected SEM, CFA or path specification is fitted by lavaan in the browser.
ML, MLR, WLSMV, listwise deletion, FIML and WLSMV pairwise handling are exposed.
Unsupported combinations are rejected explicitly; the app never substitutes an
estimator or missing-data method. A grouping variable is accepted for a model
with the matching number of groups. Invariance sequences remain Phase 4.
See lavaan's [estimator](https://lavaan.ugent.be/tutorial/est.html) and
[categorical-data](https://lavaan.ugent.be/tutorial/cat.html) documentation.

Results show convergence, lavaan warnings, sample sizes used, excluded cases where
applicable, chi-square, degrees of freedom, p-value, CFI, TLI, RMSEA with its
90% interval, SRMR and parameter tables. Support unstandardised and `std.all`
diagram annotations, optional standard errors/p-values and endogenous R-squared.
Unavailable measures must carry a reason rather than a fabricated value.

The equivalent R script covers dataset import and exact analysis
options, including lavaan/runtime versions. Results retain full numerical precision
internally and in exports. Product strings live in translation resources.

Fitted annotations are display projections of the fitted lavaan parameter table;
they do not overwrite its values or the editable syntax. Standardised diagram
SEs come from `standardizedSolution(type="std.all")`, not unstandardised SEs.
Only a current, converged, admissible result can annotate the diagram. Invalid
drafts and changed data/options cannot masquerade as an up-to-date fit.

## Known limitations

- The viewer inspects data and permits measurement-type selection. Cell editing,
  recoding, computed columns, row sorting and case filtering are not implemented.
  Ordinal order is ascending stored values; recode the source for a different order.
- Dataset contents, fitted results and variable-type selections are not persisted
  in model projects or browser autosave. Reattach data and review types on reopening.
  Analysis JSON and R scripts can be exported separately. Worker cancellation
  restores the in-memory source on the next runtime start; page reloads cannot.
- Files are limited to 50 MB; datasets to 200,000 cases, 500 variables and five
  million cells. CSV/TSV imports currently require UTF-8. Dates and nominal/text
  columns must be recoded appropriately before use as numeric model variables.
- Covariance input supports a single group, positive-definite matrices and ML.
  Robust estimators and ordinal fits need additional sample information and are
  explicitly rejected for matrix input. Mean structures require supplied means.
- In the zero-df MLR/FIML fixture, native R reports some robust fit indices as NA
  while WASM returns boundary values. These availability differences are recorded
  in the comparison report, not hidden. The app retains lavaan's returned values
  and warnings and flags zero-df models: global fit cannot test such a model.
- The supported package versions are recorded, but a permanent offline package
  image is not bundled. First-time runtime/reader installation needs the internet.
- Firefox's numerical/import checks passed. Chrome, Edge and Safari still need
  Phase 2 verification, including file dialogs, scrolling, cancellation and exports.
  Native/Node checks do not establish those browser interactions or performance.
- The original layout coverage limits remain: feedback, multilevel and EFA diagrams
  are rejected; dense covariance graphs may retain crossings/long routes. Very
  long fitted labels can require a reflow. Universal publication quality is not
  established. PNGs in the gallery are QA rasterisations; product PNG/PDF/TikZ
  exports and APA formatting remain Phase 4.

## Rendered fixtures

All ten figures are generated from production layout and SVG modules without
per-fixture coordinates. Open the [full gallery](phase-2-gallery.html) or each PNG:

1. [Three-factor CFA](phase-2-diagrams/01-holzinger-swineford.png)
2. [PoliticalDemocracy](phase-2-diagrams/02-political-democracy.png)
3. [Labelled mediation](phase-2-diagrams/03-mediation.png)
4. [Second-order CFA](phase-2-diagrams/04-second-order.png)
5. [Two groups](phase-2-diagrams/05-two-group.png)
6. [Observed path model](phase-2-diagrams/06-observed-path.png)
7. [Eight factors / forty indicators](phase-2-diagrams/07-large.png)

Fitted examples with std.all, corresponding SEs and R²:
[CFA](phase-2-diagrams/01-holzinger-swineford-fitted.png),
[SEM](phase-2-diagrams/02-political-democracy-fitted.png),
[mediation](phase-2-diagrams/03-mediation-fitted.png).

## Review and reproduction

The commands are in [the app README](../app/README.md). In particular,
`app/scripts/check-analysis.R` verifies imported values and executes the generated
reproduction scripts. `spike/phase2-analysis.mjs` runs those checks in WASM.
`scripts/compare-phase2.py` compares native and WASM/browser output. The opt-in
development URL `http://127.0.0.1:5173/?verify=analysis` runs browser checks using
public/synthetic fixtures and writes bounded loopback-only evidence.

The review checks retained from the Phase 2 requirements are:

1. Import representative CSV, Excel and SPSS files; compare displayed values,
   names, labels, categories, missing values and counts against known references.
2. Scroll a dataset larger than the viewport and inspect distant cells and
   variable metadata without losing case/column alignment or blocking the UI.
3. Fit the fixed Holzinger–Swineford, PoliticalDemocracy and labelled-mediation
   fixtures. Browser estimates, standard errors and `std.all` must agree with
   native R/lavaan to four decimal places under identical options and data.
4. Exercise an observed-only path model, ordinal data and missing data. Confirm
   that visible estimation choices and the generated R script match the fit.
5. Change a dataset, variable type, model or option and confirm that prior
   results are marked out of date. Invalid imports or fits retain the last
   valid state with a clear diagnostic.
6. Re-render all seven fixed diagram fixtures and report limitations. Verify
   the new import/viewer/analysis interactions in Chrome, Edge, Firefox and Safari;
   report missing browser evidence honestly.

Stop for review at the end of Phase 2. Drawing with semantic two-way sync remains
Phase 3. Invariance workflows, bootstrap, modification-index actions, reliability
and advanced export formats remain Phase 4.
