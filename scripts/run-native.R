.libPaths(c(normalizePath(".Rlib"), .libPaths()))
options(sem.evidence_dir = "evidence/native")
source("spike/run.R")
