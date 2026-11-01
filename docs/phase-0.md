# Phase 0 · findings for review

Prepared 1 November 2026. **Status: Phase 0 feasibility complete, ready for
review. Phase 1 has not started.**

webR 0.6.0 installed lavaan 0.7-3 and fitted the three required numerical
fixtures in Node.js, **Firefox 159**, and a **Chromium/Electron browser renderer
embedded in VS Code**. Both browser runs were opened by the user. Unstandardised estimates, `std.all` and standard errors
agree with native R to four decimal places; all seven parameter tables match.
The Firefox experiment took **5.966 seconds**, including **0.948 seconds** for
R initialisation; embedded Chromium took 5.214 and 0.996 seconds respectively.
Neither was a controlled cold-cache measurement. Chrome, Edge and Safari
numerical checks and full application compatibility across all four targets
remain to be established.

The proposed direction remains a static TypeScript/React application using
webR and a canonical lavaan parameter table. The recorded browser-engine
experiment supports this direction; v1 still needs its release-browser and
resource-budget checks. A new finding is that
lavaan itself now includes plotting, including SVG and TikZ: it should be a
comparison target and potential source of reusable work. Its tested automatic
layouts do not meet this project's acceptance models without adjustment.
[lavaan plotting documentation](https://yrosseel.r-universe.dev/lavaan/doc/manual.html#lav_plot).

## Assumptions and decisions

Before coding, the working assumptions were: stop at Phase 0; use a separate
research harness; create seven visual studies rather than claim a production
layout algorithm; and let lavaan parse every model.

You selected **Chrome, Edge, Firefox and Safari from v1**, and **explicit
CFA/SEM presets with SEM initially selected**. Individual fixtures retain
their recorded preset. A syntax-only document must also record analysis
options, group count and ordered-variable metadata: syntax alone does not
uniquely determine all automatically added parameters.

## Prior-art review

This is a documentation/source review of the seven requested tools, plus a
hands-on experiment with current lavaan plotting. It is not a measured,
side-by-side UI usability study. Where a limitation is inferred from an
algorithm or exposed controls, it is identified as such.

| Tool | What it already does well | Diagram gap for this project | What to reuse or improve |
|---|---|---|---|
| **lavaangui** | Interactive drawing and fitted-model plots; local or hosted Shiny execution. Current news includes persistent layout/viewport, SVG/PDF export, composites, and mathematical display labels. | Its recommended layouts call semPlot `tree`/`tree2`; source also offers dagre, force and cola. No examined source establishes collision-free labels or incremental preservation for all seven models. This is a gap in the guarantee, not a claim that all its plots are poor. | Preserve its successful distinction between model labels and display labels; use it as the closest comparator. Differentiate with measured browser-local execution and a deterministic, fixture-tested layout pipeline. [README](https://github.com/karchjd/lavaangui), [news](https://github.com/karchjd/lavaangui/blob/main/NEWS.md), [layout source](https://github.com/karchjd/lavaangui/blob/main/R/serverLayout.R). |
| **IBM SPSS Amos** | Clear drawing vocabulary, familiar residual circles, fixed paths and direct manipulation. Its manual explicitly teaches path and covariance drawing and curvature adjustment. | Windows-only; its documented workflow includes manual positioning, page orientation and curvature work. That is useful control, but does not establish a lavaan-text-to-finished-diagram workflow. | Adopt its visual conventions and editing ergonomics. Improve the initial automatic arrangement, open project representation and lavaan reproducibility. [IBM product](https://www.ibm.com/products/structural-equation-modeling-sem), [IBM manual](https://public.dhe.ibm.com/software/analytics/spss/documentation/statistics/24.0/en/amos/Manuals/IBM_SPSS_Amos_User_Guide.pdf). |
| **Ωnyx** | Free cross-platform graphical SEM, auto-layout, grid/snap, and script export including lavaan and LaTeX. It already addresses much of the accessible graphical desktop workflow. | Its manual includes automatic layout and subsequent customisation. The documented R import example is OpenMx-based; no examined source promises faithful coverage of the requested lavaan syntax and collision guarantees. | Reuse the interaction ideas and open-script workflow; do not build a separate estimator. The proposed advantage is direct lavaan semantics and static browser delivery. [project](https://onyx-sem.com/), [author-hosted guide](https://onyx-sem.com/wp-content/uploads/2021/08/userguide.pdf). |
| **JASP SEM** | Approachable analysis controls and results using lavaan; semPlot-based diagram machinery. | The diagram inherits semPlot's layout tradeoffs. A 2026 issue documents a one-edge layout error; current source includes a corresponding patch, so it should not be advertised as a present unfixed failure. The examined material does not establish the standalone converter and stable editable layout required here. | Reuse the analysis/result organisation as a benchmark; require standalone drawing without data and preserve all variable names. [module](https://github.com/jasp-stats/jaspSem), [documented issue](https://github.com/jasp-stats/jasp-issues/issues/4109), [current patch](https://github.com/jasp-stats/jaspSem/blob/master/R/common.R). |
| **semPlot** | Mature SEM extraction, estimates, equality colouring, residual/intercept/threshold controls and multiple layouts. It is already a strong R plotting solution. | `tree2` removes bidirectional edges while finding positions. Therefore its crossing objective cannot account for final covariance arcs. Text and curvature controls permit correction but do not themselves guarantee collision-free output. This is an algorithmic inference, not a new benchmark of semPlot. | Keep it as a visual/semantic comparator; consider its conventions rather than port its dependency tree into the interactive browser path. [maintainer reference](https://sachaepskamp.r-universe.dev/semPlot/doc/manual.html#semPaths). |
| **tidySEM** | Explicit node/edge tables, flexible styling and precise reproducible layout matrices; excellent when an author wants publication control in R. | Its guide shows an automatic arrangement of the HS variables that mixes factors and indicators; it also teaches manual matrices. Automatic layout is a starting point rather than the required SEM-specific finished result. | Adopt separate semantic, geometry and style representations. A manual matrix remains a useful optional import/export idea. [plotting guide](https://cjvanlissa.github.io/tidySEM/articles/Plotting_graphs.html), [layout API](https://cjvanlissa.github.io/tidySEM/reference/get_layout.html). |
| **lavaanPlot** | Convenient lavaan-to-DiagrammeR/Graphviz rendering, graph direction options, coefficients and conditional formatting. Graphviz already solves useful layered graph placement. | Generic graph ranking does not enforce outward indicator order, explicit Amos residual clusters or layout stability after editing. Those are requirements beyond the documented graph options; no claim is made that Graphviz invariably causes overlaps. | Keep Graphviz/lavaanPlot as a baseline. Add SEM constraints around a mature layout engine instead of inventing a general graph algorithm. [project](https://lavaanplot.alexlishinski.com/), [introduction](https://www.stat.ethz.ch/CRAN/web/packages/lavaanPlot/vignettes/Intro_to_lavaanPlot.html). |

The concrete proposed advantage is a set of **testable guarantees**, not a
claim already achieved: every drawable parameter is accounted for; implicit
parameters are distinguishable; model order is respected; regression layers
flow left to right; labels and covariance routes are checked geometrically;
existing positions survive edits; and one scene powers screen and export.
These still need to be demonstrated by Phase 1.

## Additional prior art: lavaan's own plotter

The installed CRAN release exports `lav_plot()` and `lav_plotinfo_*()`;
`lavplot` in a help-page alias should not be used as the exported function
name. Its documented interface accepts syntax, a fitted object or a table;
`varlv=TRUE` draws separate variance circles. Its documentation explicitly
allows node rearrangement. This is substantial existing work worth testing.
[plotting API](https://yrosseel.r-universe.dev/lavaan/doc/manual.html#lav_plot).

The experiment in [plot-baselines.R](../spike/plot-baselines.R) used native
lavaan 0.7-3, no data and no custom positions. For table input, `fixed` contains
a numeric string for fixed values and an empty string for unknown values,
as expected by the plotting interface. Definitions and constraints remain
in the canonical fixture but have no objects in this graph-only baseline.

| Input / mode | SVG completed without an R error | Important qualification |
|---|---:|---|
| Original syntax; default variance loops | 2/7 | A two-group image succeeding did **not** mean correct two-panel semantics: it combined vector labels in one panel. |
| Expanded table; default variance loops | 5/7 | Mediation and two-group inputs errored. PoliticalDemocracy and the large model have substantial line crossings through the measurement area. |
| Expanded table; separate variance circles | 2/7 | Second-order and large fixtures rendered; the other five attempts errored. |

The underlying errors and successful images are retained in the
[baseline gallery](lavaan-baseline.html) and per-mode `status.json` files.
These results are limited to the exact adapter, options and release tested;
they are not a general claim about every invocation of `lav_plot()`.

Recommendation: retain the upstream SVG/TikZ functionality as a comparator
and investigate reuse for export in Phase 4. It does not remove the need for
the semantic coverage checks, group handling and layout constraints here.

## webR numerical feasibility

The actual run used Node.js 23.6.0 on Windows, webR 0.6.0, WASM R 4.6.0,
PostMessage communication and lavaan 0.7-3. Native R was 4.4.3 with the same
lavaan release. Dependency versions are recorded separately; for example,
native and WASM MASS/mnormt versions differ. The observed agreement therefore
supports these fixtures, not a guarantee for all future analyses.

The Node test needed a narrow Windows loader correction: turn a drive path
passed to dynamic `import()` into a `file:` URL. No statistical code or WASM
binary was modified. The browser harness uses the unmodified upstream CDN.

| Measured stage, second successful Node run | Seconds |
|---|---:|
| WASM runtime initialisation from installed npm assets | 0.922 |
| lavaan and dependencies downloaded/installed in a fresh virtual filesystem | 3.059 |
| JSON evidence package installed | 1.042 |
| Seven tables, three fits and six syntax probes | 1.785 |
| Total including orchestration and evidence reads | 6.844 |

This was **not a browser cold load**. Runtime network download was excluded
by using local npm assets; network/CDN cache state was not controlled. A
preceding successful run took 6.963 seconds. Neither run measures warm-browser
startup. [raw benchmark](../evidence/node/benchmark.json).

| Model | Native fitting seconds | WASM fitting seconds | χ² | df | Largest absolute estimate difference |
|---|---:|---:|---:|---:|---:|
| Holzinger–Swineford CFA | 0.120 | 0.381 | 85.3055 | 24 | 0 |
| PoliticalDemocracy | 0.090 | 0.345 | 38.1252 | 35 | 5.33 × 10⁻¹⁵ |
| Synthetic labelled mediation | 0.030 | 0.155 | 0 | 0 | 0 |

All estimates, `std.all` values and SEs have identical four-decimal formatting.
The nine selected fit measures agree within 10⁻⁸, and all seven parameter
tables match exactly. Mediation is saturated; its zero df and perfect fit
indices do not provide evidence of model fit. Its data are a fixed deterministic
synthetic fixture, not empirical observations.
[comparison evidence](../evidence/node/comparison.json).

The probes also verify parsing of formative constructs, single-indicator
latents, explicit thresholds, equality/inequality constraints and `NA*`.
The intentionally malformed model produces lavaan's own line/caret error.
Bounds can be stored in `lower`/`upper` columns rather than standalone `>`/`<`
rows; an operator-only diagram adapter would lose them.

## Browser viability: measured Firefox and Chromium/Electron runs

webR's documented PostMessage channel requires no cross-origin isolation;
its R code cannot be interrupted in place. SharedArrayBuffer requires
isolation headers. The static baseline should use PostMessage, terminate
the worker on cancellation and reinitialise it. This avoids making GitHub
Pages depend on special response headers or an isolation shim.
[worker communication](https://docs.r-wasm.org/webr/latest/communication.html),
[serving guide](https://docs.r-wasm.org/webr/latest/serving.html).

The runnable [browser lab](../spike/index.html) uses that exact channel and
records runtime import/init, lavaan installation, fitting, package versions
and user agent. Windows automation could not control a browser because of
platform URL-policy enforcement, so the user opened the experiment and
confirmed that it completed. The page saved its results directly into the
workspace; the comparison script independently validated them.

Recorded user agents identify **Firefox/159.0** and
`Code/1.144.0 Chrome/150.0.7871.250 Electron/43.8.3` on Windows. The latter is
**embedded Chromium/Electron**, not standalone Google Chrome. In both runs,
cross-origin isolation was false and the actual channel was PostMessage,
matching the static-host proposal.

| Measured browser stage | Firefox seconds | Embedded Chromium seconds |
|---|---:|---:|
| CDN JavaScript module import | 0.102 | 0.099 |
| R runtime initialisation | 0.948 | 0.996 |
| lavaan and dependencies installed | 1.517 | 1.416 |
| JSON evidence package installed | 0.855 | 0.811 |
| Seven tables, three fits and six syntax probes | 2.500 | 1.854 |
| Total from benchmark start through results retrieval | 5.966 | 5.214 |

The benchmark starts after the small page strings/evidence-sink probe; its
total is not navigation-to-complete time. Cache conditions were not recorded,
and zero cross-origin resource sizes cannot establish a cache hit. No cold-load
or warm-load claim is made. All three fits converged, all estimates/`std.all`/SEs
match native R to four decimals, and all seven parameter tables match exactly.
[Firefox benchmark](../evidence/browser/2026-11-01T15-18-43-334Z/benchmark.json),
[Firefox native comparison](../evidence/browser/2026-11-01T15-18-43-334Z/comparison.json),
[embedded Chromium benchmark](../evidence/browser/2026-11-01T15-12-52-356Z/benchmark.json).

The local server records JSON; static hosting offers a JSON download. No
real research data are required. See the [README](../README.md) for commands
and fresh-profile/repeat-visit measurement instructions.

**Still unmeasured:** standalone Chrome, Edge and Safari startup and fitting;
memory peaks; controlled fresh-profile/repeat visits; hosted/subpath execution;
and the browser evidence download. Safari needs a Mac. The two successful
browser runs verify CDN/package fetching, the three fits and local evidence
writes in those browsers, not the entire four-browser application release matrix.

The measured browser-engine spike passes the Phase 0 feasibility gate.
Continue with the static application proposal and keep the broader browser
matrix as a v1 release gate. If those checks fail or startup/resource use
is unacceptable, the proposed fallback is the same frontend and parameter
schema behind a Tauri wrapper with a local, pinned R subprocess. That brings
installation and packaging costs. **Do not switch to that fallback or start
Phase 1 without your review and decision.**

## Seven rendered reference studies

The [gallery](gallery.html) contains all seven diagrams, with original-size
SVG and PNG links and the exact syntax beside each. They use actual native
parameter tables and deliberately specified positions. Every row is
accounted for as a path, variance, intercept, definition or equality annotation.
They are visual review studies, not successful tests of an automatic engine.

1. [Holzinger–Swineford](references/01-holzinger-swineford.png): marker paths, nine errors and three implicit factor covariances.
2. [PoliticalDemocracy](references/02-political-democracy.png): eleven indicators, two disturbances and all six residual covariances.
3. [Mediation](references/03-mediation.png): the X–M–Y triangle, `a`, `b`, `cp`, `ind` and `total`.
4. [Second-order CFA](references/04-second-order.png): `G`, three lower-order factors, their disturbances and nine indicators.
5. [Two groups](references/05-two-group.png): separate panels, equal loadings/intercepts and a free second-group factor mean.
6. [Observed path model](references/06-observed-path.png): two covarying predictors, a mediator and an outcome.
7. [Large model](references/07-large.png): eight factors, forty indicators, seven regressions and 95 parameter rows.

## Known limitations and review boundary

- Firefox and embedded Chromium/Electron pass the numerical workload. Chrome, Edge, Safari, full converter-UI compatibility, and controlled cold/warm timings remain to be verified before v1 release.
- Prior-art UI benchmarking was not performed for all seven tools; source-based inferences are separated from measured results.
- No production converter, CodeMirror editor, ELK integration, GUI sync, estimation UI or final export system exists yet.
- The visual studies use supplied positions. PoliticalDemocracy retains crossing covariance arcs; the large study is very wide. These are not publication-quality layout acceptance passes.
- The seven fixtures are fixed concrete choices for your review. They do not cover all valid lavaan models or prove identification of models 4–7; those four were parsed, not fitted.
- Formative/ordered syntax was probed, but estimation, import of Excel/SPSS files, robust methods, FIML, bootstrap, invariance and reliability tools are untested in WASM.
- Runtime/package images and fonts are not yet bundled for an offline first visit. The browser R package repository is not immutable.
- Native R emitted Windows locale startup warnings; all three fitted models converged with no model-fit warnings. The browser engine and Node timings are recorded separately.

Review the visual conventions, the proposed architecture, and the choice
of fixed fixtures. The browser-engine experiment is now recorded and validated;
the complete four-browser matrix is a v1 release requirement. The current
evidence is summarised in [browser measurements](browser-measurements.md).
This is the requested Phase 0 review stop before starting Phase 1.
