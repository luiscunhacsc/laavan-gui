# Phase 2 data fixtures

These files contain public or synthetic data, never user research data.

- `holzinger.csv`: lavaan's HolzingerSwineford1939 dataset.
- `democracy.csv`: lavaan's PoliticalDemocracy dataset.
- `mediation.csv`: 400 deterministic cases generated from sine/cosine functions,
  matching the fixed Phase 0 mediation data.
- `mediation-labelled.sav`: the same data with a labelled numeric predictor, to
  check explicit type selection, fitting and the generated SPSS import script.
- `mixed.csv`, `labelled.sav`, `workbook.xlsx`: five synthetic records; the SPSS
  file includes variable labels, value labels and a declared missing code of 9.
  The workbook has Participants and Mediation worksheets. Numeric values in
  Excel do not inherit the SPSS missing-code declaration.
- `large.csv`: 5,000 deterministic cases and 14 numeric variables for paging.
- `ordinal.csv`: the nine Holzinger–Swineford items divided into four
  quantile-based categories, used only to exercise ordinal fitting.
- `missing.csv`: deterministic mediation data with specified M/Y entries removed.

Regenerate with `Rscript --vanilla scripts/make-phase2-fixtures.R` from the
workspace root. Dataset generation requires lavaan, haven and writexl.
