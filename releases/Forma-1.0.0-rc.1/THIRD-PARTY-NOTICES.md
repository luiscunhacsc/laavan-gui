# Bundled software notices

These notices describe third-party software. They do not assign a license to Forma.

## R/WebAssembly runtime

webR 0.6.0, including R 4.6.0, is distributed under GNU GPL version 3.
The original runtime licensing text is in licenses/webR-and-R-GPL-3.md.
Sources: https://github.com/r-wasm/webr/tree/v0.6.0 and https://cran.r-project.org/src/base/R-4/.
The bundled Node compatibility change is reproduced in licenses/webR-Windows-Node-patch.mjs.
It corrects Windows file-URL imports; it does not change browser execution or statistical calculations.

## R packages

Original DESCRIPTION and available license files are in licenses/R-packages/.
The exact installed versions and binary hashes are in web/engine/manifest.json.

| Package | Version | License as declared by the package |
| --- | --- | --- |
| MASS | 7.3-66 | GPL-2 / GPL-3 |
| R6 | 2.6.1 | MIT + file LICENSE |
| bit | 4.6.0 | GPL-2 / GPL-3 |
| bit64 | 4.8.6 | GPL-2 / GPL-3 |
| cellranger | 1.1.0 | MIT + file LICENSE |
| cli | 3.6.6 | MIT + file LICENSE |
| clipr | 0.8.1 | GPL-3 |
| crayon | 1.5.3 | MIT + file LICENSE |
| forcats | 1.0.1 | MIT + file LICENSE |
| glue | 1.8.1 | MIT + file LICENSE |
| haven | 2.5.5 | MIT + file LICENSE |
| hms | 1.1.4 | MIT + file LICENSE |
| jsonlite | 2.0.0 | MIT + file LICENSE |
| lavaan | 0.7-3 | GPL (>= 2) |
| lifecycle | 1.0.5 | MIT + file LICENSE |
| magrittr | 2.0.5 | MIT + file LICENSE |
| mnormt | 2.1.1 | GPL-2 / GPL-3 |
| numDeriv | 2016.8-1.1 | GPL-2 |
| pbivnorm | 0.6.0 | GPL (>= 2) |
| pillar | 1.11.1 | MIT + file LICENSE |
| pkgconfig | 2.0.3 | MIT + file LICENSE |
| quadprog | 1.5-8 | GPL (>= 2) |
| readr | 2.2.0 | MIT + file LICENSE |
| readxl | 1.5.0.1 | MIT + file LICENSE |
| rematch | 2.0.0 | MIT + file LICENSE |
| rlang | 1.3.0 | MIT + file LICENSE |
| semTools | 0.5-10 | GPL (>= 2) |
| tibble | 3.3.1 | MIT + file LICENSE |
| tidyselect | 1.2.1 | MIT + file LICENSE |
| translations | 4.6.0 | Part of R 4.6.0 |
| tzdb | 0.5.0 | MIT + file LICENSE |
| utf8 | 1.2.6 | Apache License (== 2.0) / file LICENSE |
| vctrs | 0.7.3 | MIT + file LICENSE |
| vroom | 1.7.1.9000 | MIT + file LICENSE |
| withr | 3.0.3 | MIT + file LICENSE |

Package source archives: https://cran.r-project.org/src/contrib/ and its Archive/ subdirectory.

## JavaScript dependencies

The following production dependency versions come from app/package-lock.json.
Available original license/notice files are included under licenses/JavaScript/.

| Package | Version | License |
| --- | --- | --- |
| @babel/runtime | 7.29.10 | MIT |
| @codemirror/autocomplete | 6.20.4 | MIT |
| @codemirror/commands | 6.11.1 | MIT |
| @codemirror/language | 6.13.1 | MIT |
| @codemirror/lint | 6.9.7 | MIT |
| @codemirror/state | 6.7.6 | MIT |
| @codemirror/streamparser | 6.0.0 | MIT |
| @codemirror/view | 6.43.15 | MIT |
| @lezer/common | 1.5.5 | MIT |
| @lezer/highlight | 1.2.5 | MIT |
| @lezer/lr | 1.4.12 | MIT |
| @marijn/find-cluster-break | 1.0.4 | MIT |
| @types/pako | 2.0.4 | MIT |
| @types/raf | 3.4.3 | MIT |
| @types/trusted-types | 2.0.7 | MIT |
| base64-arraybuffer | 1.0.2 | MIT |
| canvg | 3.0.11 | MIT |
| core-js | 3.51.0 | MIT |
| crelt | 1.0.7 | MIT |
| css-line-break | 2.1.0 | MIT |
| docx | 9.15.1 | MIT |
| @types/node | 26.6.6 | MIT |
| nanoid | 6.0.2 | MIT |
| undici-types | 8.9.0 | MIT |
| dompurify | 3.4.17 | (MPL-2.0 OR Apache-2.0) |
| elkjs | 0.12.1 | EPL-2.0 OR GPL-3.0-or-later |
| fast-png | 6.4.0 | MIT |
| fflate | 0.8.3 | MIT |
| html2canvas | 1.4.1 | MIT |
| iobuffer | 5.4.0 | MIT |
| jspdf | 4.2.1 | MIT |
| pako | 2.2.0 | (MIT AND Zlib) |
| performance-now | 2.1.0 | MIT |
| raf | 3.4.1 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| regenerator-runtime | 0.13.11 | MIT |
| rgbcolor | 1.0.1 | MIT OR SEE LICENSE IN FEEL-FREE.md |
| scheduler | 0.28.0 | MIT |
| stackblur-canvas | 2.7.0 | MIT |
| style-mod | 4.1.4 | MIT |
| svg-pathdata | 6.0.3 | MIT |
| text-segmentation | 1.0.3 | MIT |
| utrie | 1.0.2 | MIT |
| w3c-keyname | 2.2.8 | MIT |

## Fonts

Noto Sans: SIL Open Font License 1.1. Original license in web/fonts/OFL.txt.
Sources: https://github.com/notofonts/latin-greek-cyrillic.
