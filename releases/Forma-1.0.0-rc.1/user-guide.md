# Forma SEM Studio

Forma conducts SEM, CFA and observed-variable path analyses with lavaan in your
browser. Data, fitting and project storage run on your computer. The portable
release includes its R/WebAssembly engine, packages and fonts.

## Start and keep your work

Extract the complete release ZIP. On Windows run `Start-Forma.cmd`; on macOS
double-click `Start-Forma.command`; on Linux run `sh Start-Forma.sh` in the
extracted folder. The launcher opens <http://127.0.0.1:8765/> in your browser.
Python 3.8 or newer serves the static files; a native R or Node installation is
unnecessary. Keep the terminal open while using the application and press Ctrl+C
to stop. Starting again reopens the running Forma app. Do not open
`web/index.html` directly.

If your macOS extractor did not retain executable permissions, run
`chmod +x Start-Forma.command Start-Forma.sh` in the extracted folder, or use
`sh Start-Forma.sh`. The same launchers in a source checkout use `app/dist/`;
build it with `npm ci` and `npm run build` in `app/` before the first launch.

The first load transfers approximately 84 MiB from the local server. The status
bar reports when offline caching is ready. Cache/storage availability depends on
the browser. Use the same host and port to recover the same browser workspace.

**Save project** creates a `.forma.json` file with the syntax, canonical model,
positions, options, display choices, dataset and fitted results. Dataset inclusion
is enabled by default and can be disabled in Model options. Imported files are
retained as their original bytes, with import and measurement-type settings.
Open project restores the analysis without needing to refit. A dataset
fingerprint must match before saved results can annotate the current model.
Missing or changed data, syntax or settings leave the historical result visible
and mark it out of date. Versions 1 and 2 of project files remain readable.

IndexedDB autosave also keeps the workspace in this browser. Save a project file
for a portable backup: clearing browser data removes the autosave. Project files
containing a dataset contain that dataset's data and should be stored accordingly.

## Load and inspect data

Use **Light** or **Dark** in the header to change the interface theme. Forma uses
your system appearance on the first visit and remembers your choice in this
browser. The theme also applies to the syntax editor, diagram canvas, data and
results. Journal and Presentation remain separate diagram export styles.

Open **Data**, then import UTF-8 CSV/TSV, Excel (`.xlsx`, `.xls`) or SPSS
(`.sav`, `.zsav`). Choose the Excel sheet, CSV delimiter and missing codes as
needed. SPSS variable/value labels and user-missing definitions are retained.
Alternatively enter a covariance matrix, its sample size and optional means.
The three sample datasets load matching CFA, SEM and mediation models.

The virtualised viewer supports column search, case navigation, stored values
or value labels, and variable summaries. Set each variable's measurement type
to continuous, ordinal or nominal. The viewer inspects data; it does not edit
cell values. Original file imports are limited to 50 MiB, 200,000 cases,
500 columns and five million cells; project files to 100 MiB. Diagrams support
up to 300 variables. Browser memory and model complexity also affect capacity.

## Specify a model

Choose **SEM**, **CFA** or **Path analysis**. SEM is initially selected. Path
analysis accepts observed variables only; latent and composite definitions
receive a message. The selected preset and R options are recorded explicitly.

Write lavaan syntax in **Model** or draw with Observed/Latent and the Regression,
Loading, Covariance and Formative tools. For a relationship, click its source
then its target. Dataset variables can be dragged or added from the library.
Select a variable or path to rename/delete it or change a parameter's label,
fixed/free status or value. Residuals are added automatically. Parameter edits
can target one group or all groups; structural edits apply to every group.

The actual lavaan parser and parameter table determine the model. GUI edits
regenerate grouped syntax, replacing custom formatting/comments, and are checked
by lavaan before commit. Labels, constraints and defined effects must remain
consistent. Unsupported edits receive a message without committing the change.
Data-derived parameters absent from the syntax are read-only until declared.

Loadings (`=~`), regressions (`~`), covariances/variances (`~~`), intercepts,
defined effects (`:=`), fixed/free/label modifiers, equality/inequality
constraints, group vectors, second-order factors, formative composites and
explicit ordinal thresholds are supported. The library contains seven fixed
reference models, including an eight-factor, 40-indicator example.

Drag nodes, Shift-click to select several, align/distribute, zoom/pan and snap
to the grid. Syntax changes preserve existing node positions. **Reflow all**
regenerates the layout and can be undone. Model undo/redo retains 100
transactions in memory. Toggle implicit parameters without changing the model.

## Fit and inspect results

Select ML, MLR or WLSMV, the missing-data method and, for multigroup analyses,
the grouping variable. Choose **Run analysis**. Unsupported combinations receive
a message; settings are never silently substituted. Ordinal model variables use
WLSMV. FIML is available for supported ML/MLR raw-data analyses.

**Results** reports convergence, admissibility and warnings; chi-square, degrees
of freedom, p, CFI, TLI, RMSEA with its 90% interval, SRMR, parameter estimates,
standardised results and R-squared. Tables are sortable. Changes to the dataset,
model or analysis settings mark the retained fit out of date. Cancellation
restarts the worker and restores the dataset.

Advanced options provide:

- **Bootstrap:** ML raw-data percentile confidence intervals, including defined
  indirect effects. Choose 100–10,000 draws, a seed and confidence level
  (80–99%). The default is 2,000 draws and seed 20261101. Failed/inadmissible
  draws are reported. SEs use the bootstrap; z/p remain normal approximations.
- **Measurement invariance:** configural, metric, scalar and strict continuous
  CFA with ML/MLR. Results include actual lavaan difference tests and signed
  changes in CFI/RMSEA. Use simple first-order CFA with marker identification;
  pre-existing equality constraints, fixed variances/means, cross-loadings and
  higher-order designs are guarded. Run bootstrap and invariance separately.
- **Modification indices:** sort/filter and add supported suggested paths to
  the indicated group. Applying a suggestion updates syntax and marks the old
  fit stale. Shared-label equality constraints require an explicit syntax edit.
- **Reliability/validity:** semTools composite reliability/omega, AVE, HTMT2 and
  Fornell–Larcker for admissible simple CFA factors with at least two indicators.
  Complex or unsupported measurement structures report unavailability.

## Diagrams and exports

For an admissible, converged and current fit, show unstandardised or `std.all`
coefficients, optional SE/p/stars, and R-squared. Specification diagrams also work
without data. Select journal/presentation themes, Greek notation and Amos-style
variance values or RAM self-loops. Fixed markers and implicit parameters remain
distinguished from user-declared paths.

Export SVG, PNG at 150/300/600 DPI, vector PDF or standalone TikZ. Choose a
physical width suitable for the diagram's density. SVG/PDF embed Noto Sans;
TikZ uses TeX Gyre Heros and LuaLaTeX or XeLaTeX. Selection
highlights are omitted. APA-style tables export to Word and LaTeX; CSV and
analysis JSON retain full precision. The Results R script reproduces the
estimator, missing-data handling, grouping, seeds and requested analyses.

## Validation and boundaries

The release records its exact build and validation in `VALIDATION.json`. Native
R and the bundled WebAssembly engine agree to four decimals on the reference
fits, bootstrap, invariance, reliability and modification-index output.

Full validation of the final package across Chrome, Edge, Firefox and Safari,
including actual browser offline operation, remains pending. Earlier browser
checks cover Firefox and VS Code's embedded Chromium, with their exact versions
and scope recorded in the repository. A release candidate is provided so this
coverage gap is explicit.

Feedback cycles, multilevel and EFA diagrams receive explicit unsupported
messages. Invariance/reliability support is limited to the designs described
above. Bayesian estimation, Amos `.amw` import, accounts and real-time
collaboration are outside v1. Automatic layout avoids node intersections and
label overlap in the fixed references; dense covariance structures can retain
crossings. Manual node positions can introduce geometry conflicts, which are
reported before export.
