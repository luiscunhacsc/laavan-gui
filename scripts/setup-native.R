# Run from the repository root; keep installed packages inside this workspace.
dir.create(".Rlib", showWarnings = FALSE)
.libPaths(c(normalizePath(".Rlib"), .libPaths()))
repo <- "https://cloud.r-project.org"
deps <- c("jsonlite", "MASS", "mnormt", "pbivnorm", "numDeriv", "quadprog")
missing <- deps[!vapply(deps, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) install.packages(missing, lib = ".Rlib", repos = repo)
target <- "0.7-3"
if (!requireNamespace("lavaan", quietly = TRUE) ||
    as.character(packageVersion("lavaan")) != "0.7.3") {
  available <- available.packages(repos = repo, type = "source")
  current <- available["lavaan", "Version"]
  url <- if (current == target) paste0(repo, "/src/contrib/lavaan_", target, ".tar.gz") else
    paste0(repo, "/src/contrib/Archive/lavaan/lavaan_", target, ".tar.gz")
  install.packages(url, repos = NULL, type = "source", lib = ".Rlib")
}
stopifnot(as.character(packageVersion("lavaan")) == "0.7.3")
cat("Native lavaan 0.7-3 is ready.\n")
