# Phase 4 · advanced analysis and publication exports

Status: implemented and ready for review. Open [Forma](http://127.0.0.1:8000/app/dist/)
and the [seven fixed models plus fitted/notation examples](phase-4-gallery.html).
This is a review build; the complete four-browser release matrix remains open.

## Use the new workflows

- **Invariance:** load Holzinger–Swineford in Data, select CFA in Model, set two
  groups, and select `school` as the grouping variable. In Analysis options,
  select Measurement invariance and run. The mean structure is enabled. Results
  shows configural, metric, scalar and strict models, signed changes in CFI/RMSEA,
  and lavaan's successive difference tests. ML and MLR are supported. Scaled
  statistics are not subtracted to manufacture a robust difference test.
- **Bootstrap:** load Labelled mediation, choose ML, enable bootstrap and choose
  the resample count, seed and confidence level. The default is 2,000 resamples;
  validation uses 100 to keep the check short. Results includes percentile
  confidence intervals for defined effects and counts of failed/inadmissible
  draws. Normal-approximation z/p values are identified as such. Cancel stops
  the worker; the dataset is retained for its restoration.
- **Modification indices:** enable them before fitting. Results supports sorting,
  search and a minimum MI. Add to model frees the selected zero parameter in
  its indicated group, updates syntax/diagram, records undo history and marks
  the previous fit stale. Rerun to assess the changed model. Equality constraints
  are not automatically released; shared-label cases receive a specific message.
- **Reliability and validity:** enable this output for a simple CFA. semTools
  0.5-10 supplies unit-weight omega-type composite reliability, AVE and HTMT2.
  HTMT2 uses absolute correlations and geometric means; ordinal indicators use
  polychoric correlations. The Fornell–Larcker table includes both square roots
  of AVE and the fitted latent correlation, with an explicitly defined comparison.
  These measures are not presented as an automatic validity verdict.
- **Figures:** Export diagram opens SVG, PNG, vector PDF and TikZ options. Current
  annotations, implicit-parameter visibility and theme are retained. PNG has
  physical-resolution metadata and a choice of 150/300/600 DPI. PDF embeds Noto
  Sans fonts and retains vector paths/text. SVG embeds fonts. TikZ is a standalone
  LuaLaTeX/XeLaTeX document with the same geometry and mathematical Greek notation.
  Dense diagrams default to a larger physical page; the dialog reports approximate
  label size for the chosen print width. High DPI alone cannot make tiny print
  labels legible. Exports cover the full scene, not the current zoom/selection.
- **Tables:** the Word and LaTeX actions in Results export APA-style tables with
  captions, horizontal rules, repeated headers, notes, p-value formatting and the
  selected CI level. All retained MI rows are included; the screen's search/MI
  threshold affects its view. Stale/inadmissible output is identified. CSV/JSON
  retain full precision; APA tables round to three decimals.
- **Notation:** Model options offers Greek parameter symbols/subscripts and
  optional RAM variance self-loops. User labels and fixed values take precedence.
  Fitted diagrams can show significance stars and their legend, including defined
  effects. Display changes preserve the canonical parameter table.

## Numerical and export verification

- **48 frontend tests** and TypeScript/Vite compilation pass. Existing model,
  import/display, storage and geometry checks remain in place. New checks cover
  advanced result tables, CI headers, report escaping, stale reports, display
  projections, variance-loop geometry, physical PNG sizes/resolution, Unicode PDF
  output and project validation.
- Native R checks compare the advanced adapter with direct lavaan/semTools calls,
  including MLR difference tests and seeded percentile intervals. Exported standalone
  R scripts reproduce estimates, SEs, standardised values, confidence intervals
  and the four invariance fits. CSV/Excel/SPSS, FIML/MLR, ordinal WLSMV, covariance
  input and all 15 semantic round trips pass their regression checks.
- Actual **Node webR/WASM** agrees with native R on **2,902 values to four decimals**;
  the largest difference is 1.14 × 10⁻¹³.
  [Native/WASM evidence](../evidence/phase-4/comparison.json).
- The user-operated **VS Code embedded Chromium 150 / Electron 43** run passed
  **12/12** checks. Its **2,680 numerical values** agree with native R to four
  decimals, including the first three fixed fits, reliability, MI, invariance and
  bootstrap output; the largest absolute difference is 2.86 × 10⁻⁶.
  [Browser comparison](../evidence/phase-4/browser-comparison.json). The evidence's
  user agent establishes this browser identity; it is not labelled Firefox.
  PNG, PDF, Word, SVG and LaTeX files were saved directly by this browser run.
- The review gallery uses production layout modules with no per-model positions.
  Vector PDFs are checked for node text, missing glyphs and clipped text, then
  rasterised for inspection. Word reports are rendered through LibreOffice.
  The standalone TikZ and LaTeX examples are compiled using Tectonic/XeTeX and
  checked for compilation errors, missing glyphs and overfull boxes.

## Limits and remaining release work

- The automated invariance sequence is for continuous, simple CFA models using
  first-loading marker scaling, free factor/residual variances and default mean
  identification. It rejects pre-existing shared labels, constraints, fixed
  variances/means, higher-order/cross-loading or structural models. Use explicit
  syntax for other designs, partial invariance or ordinal identification schemes.
  Ordinal WLSMV fitting remains available; automated ordinal invariance is absent.
- Bootstrap uses ML with raw data, 100–10,000 resamples and percentile intervals.
  It runs separately from the invariance sequence. Other CI methods and robust/
  ordinal bootstrap workflows are not implemented. Large jobs can take time.
- Reliability/validity output is restricted to admissible simple CFA models with
  at least two indicators per factor. Higher-order, bifactor/cross-loading,
  formative and structural models need explicitly chosen measurement definitions;
  the app does not invent a reliability formula for them. HTMT failures are shown
  as unavailable. Items are not silently reverse-coded.
- Chrome, Edge, Firefox and Safari still need the complete Phase 4 interaction,
  download and persistence matrix before a v1 release. Earlier Firefox checks
  remain recorded under their own phases. The current embedded Chromium check
  exercises production APIs, not every mouse gesture or native file dialog.
- Very dense covariance structures can retain crossings or long routes; a
  universal publication-quality layout guarantee is not established. Existing
  feedback/multilevel/EFA coverage limits still apply. Manual placement can cause
  collisions. Large models need larger print dimensions or editorial layout work.
- PNG dimensions are bounded to 16,384 per side and 64 million pixels. Oversized
  requests receive an error. PDFs use the chosen physical page dimensions; TikZ
  is vector code requiring a TeX installation. SVG font embedding increases file
  size. Report table text can require editorial adjustment for unusually long names.
- Projects retain data, model/options and geometry; rerun fitted results after
  reopening. The data grid remains an inspection viewer. Autosave holds one active
  workspace per origin. A fully offline, immutable R/package distribution remains
  future work; downloaded lavaan and semTools versions are checked before use.

## Reproduce

From `app/`, after installing the existing Phase 2 reader packages and the local
native lavaan library:

```powershell
Rscript --vanilla scripts/setup-phase4.R
Rscript --vanilla scripts/check-analysis.R
Rscript --vanilla scripts/check-editing.R
Rscript --vanilla scripts/check-advanced.R
Rscript --vanilla scripts/check-reproduction.R
```

From the workspace root:

```powershell
node spike/phase4-advanced.mjs
python scripts/compare-phase4.py
cd app
npm test
npm run build
npx tsx scripts/render-phase4.ts
cd ..
python scripts/build-phase4-gallery.py
```

With the development server running, `?verify=advanced` performs the 12 public/
synthetic checks, restores the previous worker dataset and saves bounded evidence
through a loopback-only development endpoint. These routes and fixtures are absent
from the production build. Compare the resulting `results.json` using:

```powershell
python scripts/compare-phase4.py evidence/phase-4/browser-<timestamp>/results.json
```

Validation renderers additionally use project-local QA dependencies, LibreOffice
and the optional portable Tectonic compiler; these are not application dependencies.

Implementation references: [lavaan invariance](https://www.lavaan.ugent.be/tutorial/groups.html),
[modification indices](https://www.lavaan.ugent.be/tutorial/modindices.html),
[bootstrap defined effects](https://www.lavaan.ugent.be/tutorial/mediation.html),
and the semTools authors' documentation for
[composite reliability](https://github.com/simsem/semTools/blob/master/semTools/man/compRelSEM.Rd),
[AVE](https://github.com/simsem/semTools/blob/master/semTools/man/AVE.Rd) and
[HTMT2](https://github.com/simsem/semTools/blob/master/semTools/man/htmt.Rd).

Work stops here for the requested Phase 4 review. Nothing has been published.
