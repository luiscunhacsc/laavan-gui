# Forma 1.0.0-rc.1

The local release candidate includes the complete SEM/CFA/path workflow:
dataset import/viewing, a two-way syntax/diagram editor, lavaan estimation,
advanced analyses and publication exports. Nothing has been publicly deployed.

- [Open the workspace preview](http://127.0.0.1:8000/app/dist/).
- [Download the portable ZIP](../releases/Forma-1.0.0-rc.1.zip).
- [Read the user guide](user-guide.md).
- [Review all seven fixed reference diagrams and six additional examples](phase-4-gallery.html).
- [Inspect the machine-readable validation record](../evidence/release/validation.json).

Extract the ZIP and run `Start-Forma.cmd` on Windows, `Start-Forma.command` on
macOS, or `sh Start-Forma.sh` on Linux. Each launcher opens the default browser.
The stable local address is <http://127.0.0.1:8765/>. Python 3.8 or newer is the
only launcher dependency; native R and Node are unnecessary for using this build.

## Added after Phase 4

The complete webR/R engine and 35 R packages are now bundled. Startup mounts the
frozen library read-only, checks loader/library hashes and required versions,
and performs no remote package installation. The static build is approximately
84 MiB. A service worker precaches only application assets with integrity checks;
the status bar reports cache readiness. Dataset contents are kept in the browser
worker and workspace, never in the service-worker asset cache.

Schema 3 project files and browser autosave now retain fitted results, inference
tables, diagram annotation choices and the current workspace. Opening a project
verifies its dataset fingerprint before treating saved results as current.
Changed or missing data preserve a historical result with an out-of-date marker.
Malformed cached results are rejected. Schema 1/2 files remain readable.

Covariance routing now considers diagonal bows alongside cardinal routes. On the
three-factor reference CFA, crossings fell from one to zero and covariance
length from 2,309 to 1,782 scene units. The observed path model's covariance
length fell from 364 to 252. PoliticalDemocracy retains ten crossings while its
covariance paths and footprint are shorter. These are fixed-fixture measurements,
not a guarantee of crossing-free layouts for arbitrary SEM graphs.

The portable ZIP includes a loopback-only static server, Windows/macOS/Linux
startup instructions, a user guide, validation summary, original dependency
notices/licenses and per-file SHA-256 checksums. The separate ZIP checksum is
alongside the archive. No dataset supplied by the user is included.

## Validation

- **66 automated tests pass**, including semantic/geometry coverage for the
  seven models, editor transactions, exports, project compatibility, saved
  inference validation, dataset fingerprints and IndexedDB fit restoration.
- TypeScript and the production build pass. All **141 static assets** and
  **122 vendored runtime files** match their recorded sizes/hashes.
- The actual bundled WebAssembly engine passes CSV/Excel/SPSS fidelity, paging,
  transactional restore, all three reference fits, MLR/FIML, WLSMV, covariance
  input, 15 model round trips, GUI edit semantics, reliability, modification
  indices, robust invariance and seeded bootstrap checks **without package
  installation**. These runs execute in Node, not a browser.
- **5,599 common numeric values agree with native R to four decimal places**;
  maximum absolute difference is approximately 0.000002851. For the saturated
  MLR/FIML fixture, four robust fit indices are unavailable in native R but
  available in WebAssembly. This availability difference is explicitly recorded
  in [the comparison](../evidence/release/numerical-comparison.json), rather than
  being treated as a numerical match. The three required reference fits pass.
- Native R independently passes import/analysis, editing, advanced and standalone
  reproduction-script checks. The four-stage invariance sequence is reproduced.
- All **13 exported figures** pass PDF text/vector/bounds inspection. TeX figures
  and APA tables compile with no overfull boxes or missing characters. Earlier
  actual browser PNG/PDF and rendered Word evidence is retained under Phase 4.
- The service-worker simulation passes integrity-bound installation, offline
  navigation/asset lookup, application-only GET caching, old-cache cleanup and
  failed-install cleanup. This is a Node simulation, not browser certification.
- The production preview and all reference-gallery assets pass HTTP checks;
  development-only QA routes are absent from the production JavaScript.
- The portable archive passes CRC and per-file/ZIP checksums. Its actual Python
  launcher serves every application asset with matching bytes and the correct
  WebAssembly/module MIME types. POST and development QA endpoints are absent.

## Remaining coverage and limits

**The complete Chrome, Edge, Firefox and Safari matrix is not certified.** Earlier
real checks passed in Firefox 159 and VS Code embedded Chromium 150/Electron 43.
The final bundled-loader, offline-cache and saved-result changes still require
actual browser checks across those four browsers. Browser control's host remains
unavailable in this environment; Safari is not available on this Windows host.
This is why the delivered version is a release candidate.

The data viewer inspects values without editing cells. Invariance and reliability
support the designs described in the guide. Feedback, multilevel and EFA diagrams
receive unsupported messages. Dense covariance structures and manual placement
can retain crossings or produce reported geometry conflicts. Browser storage is
per origin and can be evicted; project files provide a portable backup.

The final release work is complete within these documented validation limits.
No additional phase-review approval is needed to use the local package.
