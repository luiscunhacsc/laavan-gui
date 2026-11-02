FORMA SEM STUDIO 1.0.0-rc.1

Extract the complete ZIP before starting.

Windows: run Start-Forma.cmd.
macOS/Linux: run python3 serve.py from the extracted folder.
Requires Python 3 for the local static server. R and Node are not required.
Open http://127.0.0.1:8765/ and keep the terminal open while using Forma.
Stop the server with Ctrl+C. Do not open web/index.html directly.

The complete R/WebAssembly engine, lavaan, import readers, fonts and application
are bundled. No remote package installation is needed. First startup transfers
about 84 MiB from this local server to the browser. The status bar reports when
the application's offline cache has finished preparing. Private-mode browsers
or storage restrictions may prevent caching or workspace recovery.

The server listens only on this computer. Analysis and imported datasets stay
in your browser. Save a .forma.json project to keep a portable copy, including
the dataset and results. Browser storage is not a replacement for project files.
Keep the same address: browser autosave belongs to its exact host and port.

Start with Data and one of the three sample datasets, or import your own CSV,
Excel or SPSS data. Inspect variables, choose their measurement types, write or
draw your model, select an estimator, then Run analysis. SEM, CFA and observed
path analysis presets are available. Model diagrams also work without data.

The included user-guide.md describes analysis options, supported designs,
publication exports and limitations. VALIDATION.json records what was checked.

This is a release candidate. The full Chrome, Edge, Firefox and Safari matrix,
including browser-level offline operation of this final package, is still
unverified. Numerical tests exercised the actual bundled WebAssembly engine
under Node. Earlier interactive checks passed in Firefox and embedded Chromium.

For static hosting, deploy only the contents of web/ to an HTTPS server.
Keep every engine file. Relative paths support hosting in a subdirectory;
PostMessage workers do not need cross-origin isolation headers.
No public deployment has been performed.

THIRD-PARTY-NOTICES.md and licenses/ identify bundled dependencies and their
licenses. No license for the application itself is granted by these notices.
