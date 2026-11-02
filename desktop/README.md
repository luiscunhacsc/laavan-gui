# Forma standalone desktop

This edition includes the application, Chromium, Node.js, the R/WebAssembly
engine, lavaan, SEM tools, Excel/SPSS readers and fonts. Users do not install
Python, Node.js, R, packages or a browser. Internet access is unnecessary,
including on the first launch. Extract the complete archive before running it.

| Download | Start |
| --- | --- |
| Windows x64 or ARM64 ZIP | Open `Forma.exe` in the extracted folder. |
| macOS Apple Silicon (ARM64) ZIP | Move `Forma.app` to Applications, then open it. |
| macOS Intel (x64) ZIP | Move `Forma.app` to Applications, then open it. |
| Linux x64 or ARM64 tar.gz | Extract with `tar -xzf`, then run `./Start-Forma.sh`. |

Choose the archive matching your computer's processor. These builds are for
current 64-bit desktop operating systems supported by the bundled Electron
release. Linux requires its usual graphical desktop/system libraries and glibc;
the Linux builds are not intended for Alpine/musl or headless servers.

The local packages are not developer-signed or Apple-notarized. Operating-system
publisher verification can therefore prevent normal first-open. A signed release
requires the owner's Windows/Apple signing credentials; macOS signing and
notarization must run on a Mac. No OS protection is disabled by the application.

Forma opens in its own window. Its internal static server binds only to
`127.0.0.1:18765`, closes with the app, and accepts no dataset uploads. If that
port is already occupied, Forma reports the conflict instead of silently changing
your project storage location. A second launch focuses the existing app.

Projects and preferences are kept in the application's OS-specific user-data
folder, not in the installation folder. Browser-edition autosave is separate:
use **Save project** in that edition, then **Open project** in the desktop app.
Save `.forma.json` files to move complete analyses between operating systems.
Updating/replacing the app does not delete its saved workspace.

The included user guide explains the analysis workflows. The standalone packages
include the recent visible Light/Dark theme control and improved contrast.
Dependency notices/licenses accompany every package; they do not grant a license
for the application itself.

## Build from source

Build tools are needed only by the person creating distributions: Node.js
22.12+ (the pinned packaging tools' requirement), npm, and Python 3.11+ for
archive creation. The packages themselves do not need these installations.

```sh
cd app
npm ci
npm run build
cd ../desktop
npm ci --ignore-scripts
npm test
npm run package:all
npm run check
```

`npm run package:all` creates Windows, macOS and Linux packages for x64 and ARM64 in
`releases/desktop/Forma-1.0.0-rc.1/`, with per-archive SHA-256 checksums and
`downloads.json`. For a single target use, for example,
`node scripts/package.mjs --target=darwin-arm64`. Packaging downloads the pinned
official Electron runtimes and checks their upstream checksums. End users
receive those runtimes inside the archives.

`npm run smoke` runs the host platform's packaged application in a temporary
profile and verifies bundled R startup, theme switching, a sample dataset import,
lavaan estimation, and saved-workspace restoration. It does not touch real user
data. On headless Linux use `xvfb-run -a npm run smoke`; retain the Chromium
sandbox. Reports go to `evidence/desktop/`.

The GitHub Actions workflow builds and runs the smoke test on each target OS.
For a signed macOS build, set `FORMA_MAC_SIGN_IDENTITY` to a certificate already
installed in the Mac's keychain. Notarization and Windows signing are separate
release steps; this project does not store signing credentials.

Packaging follows the official [Electron Packager](https://electron.github.io/packager/main/)
workflow. See Electron's [distribution guide](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)
for publisher signing and notarization requirements.
