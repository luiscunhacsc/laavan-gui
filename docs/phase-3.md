# Phase 3 · visual editing and complete projects

Status: implemented and ready for review. Open
[Forma](http://127.0.0.1:8000/app/dist/) and the
[seven reference models plus four visual-edit examples](phase-3-gallery.html).
Work stops here before Phase 4.

## Implemented

- Observed and latent variable placement, regression paths, loadings, covariances
  and formative arrows. Connections follow source → target; formative inputs
  point into their composite. Endogenous residual circles appear automatically.
- A node/parameter inspector: rename or delete variables, fix/free/label parameters,
  set variances/covariances to zero, and override implicit parameters explicitly.
  Structure changes apply to all groups; parameter changes can target one group
  or all groups using lavaan's group-specific modifier vectors.
- A searchable dataset-variable palette with drag/drop onto the canvas and a
  click-to-add alternative. Adding an existing variable selects it instead of
  making another copy. Model variable names remain distinct from dataset edits.
- Readable syntax generated in measurement, structural, covariance, mean/threshold,
  definition and constraint sections. lavaan parses and recompiles every edit;
  the formatter uses lavaan's own parsed modifiers and canonical row identities.
  It is not a replacement syntax parser.
- Model undo/redo covering valid syntax, options and geometry. Invalid drafts can
  be restored to the last valid state. Ctrl/Cmd+Z and redo shortcuts work in the
  editor and canvas. Existing node positions are retained across semantic edits.
- Version 2 open JSON projects that embed the original dataset bytes (or example/
  covariance source), variable-type choices, model, analysis options and positions.
  Version 1 model projects still open. Dataset inclusion defaults to on and can
  be switched off in Model options. Project files can be up to 80 MB, subject to
  the existing 50 MB dataset-file limit.
- IndexedDB autosave for the model and its matching dataset. Writes are ordered
  and atomic; unchanged source bytes are not rewritten on each syntax edit.
  SHA-256 identifies the stored source. Replaced sources are removed. Failed
  saves leave the previous workspace intact and report the storage failure.

A newly placed latent uses lavaan's `F =~ 0` declaration and is marked **No
indicators** until it has a measurement relation. It is never drawn with a fake
observed indicator. A diagram being valid does not establish identification.

## Semantic checks

Before applying an edit, the R adapter checks that the existing model survives
formatting/reparsing. A signature compares named parameter rows, free/fixed
status, values/starts, labels, equality-sharing partitions, bounds, provenance
and default-fixed markers. Row IDs alone are not model meaning.

Commands address canonical parameter rows. A candidate is formatted and parsed
again by lavaan before the UI commits it, and requested parameter changes are
verified. Undefined labels in definitions/constraints block the transaction.
Implicit rows can change as lavaan recomputes the defaults for a changed structure.
For example, removing a first loading lets lavaan select the next default marker.
Removing a path retains its variables; deleting a variable is a separate action.
An omitted default covariance can return automatically, so its removal command
explicitly fixes it to zero rather than silently leaving it free.

## Validation

The build passes TypeScript/Vite compilation and **41 frontend tests**. The new
checks cover model history, exact portable dataset bytes, type persistence,
rejected/ordered autosaves, obsolete-source removal, drawn model geometry,
formative direction, combined measurement/structural feedback rejection and
unmeasured-latent rendering. Existing fit/layout tests
continue to pass.

All seven fixed models and eight extra specifications pass native-R and actual
Node webR/WASM round trips with identical tables, constraints and modifiers.
See [native/WASM comparison](../evidence/phase-3/comparison.json). Native checks
also verify rollback after a failed dataset restore and fit the GUI-created
mediation specification against the reference specification.

The user-operated **Firefox 159** check passed all 15 round trips with exact
native parameter tables and no recorded layout diagnostics. Its visually created
mediation model matches native R estimates, SEs and standardised values to four
decimals; the largest difference is 7.18 × 10⁻¹⁰. The browser also verified exact
SPSS attachment bytes, restored variable types/labels/user-missing codes,
IndexedDB recovery, worker-restart recovery and syntax/position undo.
[Firefox comparison](../evidence/phase-3/browser-comparison.json).

A separate [manual product check](../evidence/phase-3/manual-smoke.json) confirmed
that placing two observed variables and connecting a regression updates both
the arrow and the editor. The browser harness exercises real editing/storage
APIs; it is not proof that every mouse gesture or file dialog works.

The first three numerical fixtures retain their Phase 2 Firefox/native agreement.
This phase changes editing and persistence, not the estimator implementations.

## Review the rendered output

The [gallery](phase-3-gallery.html) contains SVG, PNG and generated syntax for:

1. [Three-factor CFA](phase-3-diagrams/01-holzinger-swineford.png)
2. [PoliticalDemocracy](phase-3-diagrams/02-political-democracy.png)
3. [Labelled mediation](phase-3-diagrams/03-mediation.png)
4. [Second-order CFA](phase-3-diagrams/04-second-order.png)
5. [Two groups](phase-3-diagrams/05-two-group.png)
6. [Observed path model](phase-3-diagrams/06-observed-path.png)
7. [Eight factors / forty indicators](phase-3-diagrams/07-large.png)

Additional models created using the semantic editing commands:
[mediation](phase-3-diagrams/drawn-mediation.png),
[CFA](phase-3-diagrams/drawn-cfa.png),
[formative composite](phase-3-diagrams/drawn-formative.png),
[new unmeasured latent](phase-3-diagrams/drawn-phantom.png).
All figures use production layout/SVG code without per-fixture coordinates.

## Known limitations

- The visual editor supports the common flat syntax used by the 15 checked models.
  Separate group/level blocks, positional `.pN.`/`equal()` references and unknown
  modifiers receive a specific message. Keep editing those models in syntax.
  This is not a universal round-trip guarantee for every valid lavaan extension.
- Visual edits regenerate grouped syntax and replace original comments/formatting.
  Numeric starts/bounds, labels and constraints are retained and checked. Removing
  a label still used in an expression is blocked; update the expression in syntax.
- A group-specific override may make a previously implicit default explicit in
  the generated modifier vector. Editing fixed-x sample variances/covariances
  requires first changing the model's exogenous-variable treatment.
- Dataset-generated fitted parameters absent from the data-free specification
  are shown read-only in the inspector. Add explicit syntax to change them.
  Definitions/constraints are displayed but edited in the syntax pane.
- Undo history is in-memory and retains the most recent 100 model transactions.
  Dataset replacement/type editing is outside model undo. Fitted results are not
  embedded in projects/autosave; rerun after reopening. Analysis JSON and R scripts
  remain separate exports. The data grid still does not edit cell values.
- Browser autosave retains one active workspace per origin. Concurrent tabs use
  the latest completed save; projects should be downloaded for independent copies.
  Storage quotas/private modes can prevent autosave; the app reports failures.
  A fully offline webR/package distribution is still not bundled.
- Chrome, Edge and Safari still require Phase 3 interaction/persistence checks.
  Firefox's automated public-fixture check and manual regression gesture do not
  establish file-dialog, drag/drop or all-browser compatibility coverage.
- Feedback/multilevel/EFA diagrams remain unsupported. Existing dense-covariance
  crossing/long-route limits remain, and manual placement can cause collisions.
  Reflow is explicit. Full publication exports and advanced estimation workflows
  remain Phase 4; a universal publication-quality layout guarantee is not established.

## Reproduce

From `app/`, with native lavaan/jsonlite already available:

```powershell
Rscript --vanilla scripts/check-editing.R
```

From the workspace root, with the Phase 0 webR installation/Windows patch:

```powershell
node spike/phase3-editing.mjs
python scripts/compare-phase3.py
cd app
npm test
npm run build
npx tsx scripts/render-phase3.ts
cd ..
python scripts/build-phase3-gallery.py
node spike/rasterize.mjs docs/phase-3-diagrams
```

With `npm run dev`, open `http://127.0.0.1:5173/?verify=editing`. The persistent
verification badge reports 15/15 on success. It uses public/synthetic fixtures
and bounded loopback-only evidence writes, absent from production execution.
Compare a saved browser run with:

```powershell
python scripts/compare-phase3.py evidence/phase-3/browser-<timestamp>.json
```

Phase 4 has not started. Its remaining work includes invariance sequences,
bootstrap, modification-index actions, reliability/validity output, full figure
and APA exports, typography polish and completion of release-browser validation.
