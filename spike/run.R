# This exact script runs in native R and webR. lavaan owns all syntax parsing.
suppressPackageStartupMessages(library(lavaan))
suppressPackageStartupMessages(library(jsonlite))
fixtures <- fromJSON("fixtures/models.json", simplifyVector = FALSE)
output_dir <- getOption("sem.evidence_dir", "evidence")
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
warnings_seen <- character()
capture_warnings <- function(expr) withCallingHandlers(expr, warning = function(w) {
  warnings_seen <<- c(warnings_seen, conditionMessage(w)); invokeRestart("muffleWarning")
})
tables <- lapply(fixtures, function(f) {
  warnings_seen <<- character()
  started <- proc.time()[[3]]
  pt <- capture_warnings(lavaanify(f$syntax, model.type = f$preset, auto = TRUE,
    fixed.x = FALSE, meanstructure = f$groups > 1, ngroups = f$groups))
  list(id = f$id, title = f$title, preset = f$preset, groups = f$groups,
       syntax = f$syntax, table = pt, compileSeconds = proc.time()[[3]] - started,
       latent = lavNames(pt, "lv"), observed = lavNames(pt, "ov"),
       warnings = warnings_seen)
})
names(tables) <- vapply(fixtures, `[[`, character(1), "id")
write_json(tables, file.path(output_dir, "parameter-tables.json"), auto_unbox = TRUE,
           pretty = TRUE, dataframe = "rows", na = "null", digits = 16)

i <- seq_len(400)
X <- sin(i * .37) + cos(i * .11)
M <- .6 * X + sin(i * .71) + .4 * cos(i * .17)
Y <- .45 * M + .2 * X + cos(i * .53) + .2 * sin(i * .29)
mediation_data <- data.frame(X, M, Y)
fits <- list()
for (j in 1:3) {
  f <- fixtures[[j]]
  dat <- switch(as.character(j), "1" = HolzingerSwineford1939,
                "2" = PoliticalDemocracy, "3" = mediation_data)
  warnings_seen <- character()
  t <- proc.time()[[3]]
  fun <- if (f$preset == "cfa") cfa else sem
  fit <- capture_warnings(fun(f$syntax, data = dat, estimator = "ML",
                              fixed.x = FALSE, meanstructure = FALSE))
  elapsed <- proc.time()[[3]] - t
  fits[[f$id]] <- list(converged = lavInspect(fit, "converged"), seconds = elapsed,
    nobs = lavInspect(fit, "nobs"), warnings = warnings_seen,
    estimates = parameterEstimates(fit, standardized = TRUE),
    fitMeasures = as.list(fitMeasures(fit, c("chisq", "df", "pvalue", "cfi", "tli",
      "rmsea", "rmsea.ci.lower", "rmsea.ci.upper", "srmr"))))
}
probe <- function(model, ...) {
  tryCatch({
    pt <- lavaanify(model, auto = TRUE, fixed.x = FALSE, ...)
    list(ok = TRUE, ops = unique(pt$op), rows = nrow(pt), table = pt)
  }, error = function(e) list(ok = FALSE, message = conditionMessage(e)))
}
probes <- list(
  formative = probe("F <~ x1 + x2 + x3\nY ~ F"),
  single_indicator = probe("F =~ 1*x\nx ~~ 0*x\ny ~ F"),
  ordered_thresholds = probe("F =~ u1 + u2 + u3\nu1 | t1 + t2"),
  equality_inequality = probe("y ~ a*x + b*z\na == b\na > 0\na < 2"),
  na_modifier = probe("F =~ NA*x1 + x2 + x3\nF ~~ 1*F"),
  invalid = probe("F =~ x1 + * x2")
)
result <- list(R = R.version.string, platform = R.version$platform,
  lavaan = as.character(packageVersion("lavaan")),
  packages = as.list(vapply(c("lavaan", "MASS", "mnormt", "pbivnorm", "numDeriv", "quadprog", "jsonlite"),
    function(p) if(requireNamespace(p, quietly = TRUE)) as.character(packageVersion(p)) else NA_character_, character(1))),
  fits = fits, probes = probes)
write_json(result, file.path(output_dir, "results.json"), auto_unbox = TRUE, pretty = TRUE,
           dataframe = "rows", na = "null", digits = 16)
cat("Completed seven parameter tables, three fits and six syntax probes.\n")
