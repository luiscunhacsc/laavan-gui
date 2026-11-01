# Browser feasibility measurements

Phase 0 browser gate: **pass**.

Only completed browser runs that pass the native-R comparison count below. Node.js measurements are excluded. A verified run in one target desktop browser completes the Phase 0 numerical spike. Embedded Chromium is reported separately and does not count as standalone Chrome. Full application compatibility in all four browsers remains a v1 release requirement.

| Browser | Verified runs | Median reported total (s) |
|---|---:|---:|
| Embedded Chromium / Electron | 1 | 5.214 |
| Firefox | 1 | 5.966 |

Cache conditions must be recorded before interpreting cold/warm differences. An ordinary reload is not evidence of a cold cache.

Target browsers without a numerical measurement: Chrome, Edge, Safari.

Numerical agreement does not establish compatibility of the future converter UI or exports.
