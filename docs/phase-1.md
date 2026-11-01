# Phase 1 · converter for review

Historical Phase 1 review. The current [Phase 2 build](phase-2.md) now also
implements dataset import, viewing, fitting and results.

Forma's product scope is a full SEM, CFA and path-analysis application using
user-provided datasets, with a spreadsheet-style data viewer, estimation and
results. This review covers the Phase 1 model workspace. The data-free converter
is one workflow; [Phase 2](phase-2.md) adds dataset import, viewing and analysis.

The working application is in `app/`. Open the
[local review build](http://127.0.0.1:8000/app/dist/) while the workspace server
is running, or follow the [application README](../app/README.md) to start a
new development server.
The [seven automatic diagrams](phase-1-gallery.html) come from the same layout
and SVG modules used by the application, without per-fixture coordinates.

## Implemented

- A React/TypeScript workspace with a CodeMirror lavaan editor, highlighting,
  completion from known model variables, inline lavaan errors and automatic updates.
- Browser-local webR/lavaan compilation into a complete parameter table. Raw
  parser metadata, constraints, bounds and implicit/default provenance are retained.
- Explicit SEM, CFA and Path analysis presets, group count, meanstructure and
  `fixed_x` options. Path analysis uses SEM defaults and checks lavaan's variable
  classification to reject latent/composite constructs. Its mediation and
  observed-path examples use the same canonical parameter tables as SEM.
- Automatic structural ranking through ELK, SEM measurement clusters,
  second-order trees, mediation triangles, covariance routing and label placement.
- Observed rectangles, latent ellipses, residual/disturbance circles with
  fixed-1 attachments, fixed/labelled paths, separate group panels and constraint annotations.
- Stable positions across ordinary syntax edits; drag, pan/zoom, align/distribute,
  snap, layout undo/redo and an explicit reflow action.
- Implicit-parameter display control, journal/presentation styling, open JSON
  projects, browser autosave, parameter inspection, equivalent R code and SVG export.

Invalid drafts do not replace the last valid canonical model. Export is disabled
while the draft is invalid or awaiting compilation. Unsupported feedback,
multilevel and EFA layouts produce a specific message. The editor tokenizer
is not a semantic parser; lavaan interprets all model syntax.

## Validation

The production build passes TypeScript checking and Vite compilation.
The automated suite currently contains **24 passing tests**. It covers the
seven core diagrams and eight extra specifications, parameter-row coverage,
nonincident edge/node intersections, node and label-box collisions, deterministic
placement, stable old positions after adding an indicator, marker provenance,
formative arrow direction, SVG escaping and saved project semantics. Native-R
adapter checks also confirm that Path analysis preserves the SEM parameter table
for both observed-only examples and rejects latent and composite definitions.

A user-operated browser check confirmed that the editor and diagram appear.
The retained evidence identifies **embedded Chromium/Electron in VS Code**;
it is not counted as standalone Chrome. All seven live browser parameter tables
match the native-R fixtures exactly, every parameter is represented, and the
recorded layouts have no edge/node diagnostics. See
[browser comparison](../evidence/phase-1/comparison.json).

The first three numerical fitting fixtures retain their native-R/browser
four-decimal agreement from Phase 0. No estimator code changed in this phase;
the converter itself does not fit data. Those reference results remain in
[Phase 0's browser evidence](../evidence/browser/2026-11-01T15-18-43-334Z/comparison.json).

## Review the actual automatic output

1. [Holzinger–Swineford CFA](phase-1-diagrams/01-holzinger-swineford.png)
2. [PoliticalDemocracy SEM](phase-1-diagrams/02-political-democracy.png)
3. [Labelled mediation](phase-1-diagrams/03-mediation.png)
4. [Second-order CFA](phase-1-diagrams/04-second-order.png)
5. [Two groups](phase-1-diagrams/05-two-group.png)
6. [Observed path model](phase-1-diagrams/06-observed-path.png)
7. [Eight factors and forty indicators](phase-1-diagrams/07-large.png)

## Known limitations

- The seven core models pass the geometric checks; that does not establish a
  universal, publication-quality layout guarantee for every possible model.
  Dense residual covariance structures can still have crossings or long routes.
  The large eight-step chain is still a wide figure and needs a suitable export size.
- Labels use browser font metrics in the app; offline fixture images use an
  approximation with Arial rendering. Final physical-size typography and
  Greek/subscript notation are not implemented yet.
- Manually chosen positions can create collisions. These are reported. A
  reflow may be needed when preserved positions leave no room for new elements.
- Feedback cycles, multilevel and EFA blocks are not supported in Phase 1;
  the app does not silently draw a different model. Model size is capped at
  300 variables and the document at 16 groups.
- Threshold counts without data are explicit declarations only. No model
  identification, convergence or goodness of fit is implied by a valid diagram.
- Production SVG generation is implemented; PNG preview images in the review
  gallery are generated by the QA rasterizer. The app's PNG/PDF/TikZ exports,
  APA tables and fitted annotations remain later-phase work.
- Chrome, Edge, Firefox and Safari still need the full converter interaction
  and export compatibility matrix. The browser evidence validates conversion;
  drag/undo, clipboard and file download interactions were not all automated.
- The first visit still needs network access to the official webR/package
  repository. The package version is checked, but an immutable offline R
  library image is not bundled. R cancellation needs a worker restart.

The development preview and static build are local review artifacts. Nothing
has been publicly deployed. Phase 2 has not started; this is the requested
Phase 1 review boundary.
