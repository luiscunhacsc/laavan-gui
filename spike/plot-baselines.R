# Direct upstream plotting baseline: no custom positions or custom lavaan parser.
suppressPackageStartupMessages(library(lavaan))
suppressPackageStartupMessages(library(jsonlite))
fs <- fromJSON("fixtures/models.json", simplifyVector = FALSE)
plot_dir <- getOption("sem.baseline_dir", "evidence/lavaan-baseline")
dir.create(plot_dir, recursive = TRUE, showWarnings = FALSE)
for (mode in c("syntax", "table", "residuals")) {
statuses <- list()
mode_dir <- file.path(plot_dir, mode)
dir.create(mode_dir, recursive = TRUE, showWarnings = FALSE)
for (f in fs) {
  pt <- lavaanify(f$syntax, model_type = f$preset, auto = TRUE,
    fixed_x = FALSE, meanstructure = f$groups > 1, ngroups = f$groups)
  # lav_plot's documented table interface calls this column 'fixed'.
  pt$fixed <- ifelse(pt$free == 0 & !is.na(pt$ustart), as.character(pt$ustart), "")
  # The drawing interface has no diagram objects for definitions or constraints.
  # Preserve those in the canonical fixtures; this baseline tests graph rows only.
  pt <- pt[pt$op %in% c("=~", "<~", "~", "~~", "~1"), ]
  started <- proc.time()[[3]]
  messages <- character()
  error <- tryCatch({
    withCallingHandlers(lav_plot(if (mode == "syntax") f$syntax else pt,
      varlv = mode == "residuals",
      common_opts = list(sloped_labels = FALSE, italic = FALSE),
      svg = list(outfile = file.path(mode_dir, paste0(f$id, ".svg")), standalone = FALSE)),
      warning = function(w) {messages <<- c(messages, conditionMessage(w)); invokeRestart("muffleWarning")})
    NULL
  }, error = function(e) conditionMessage(e))
  statuses[[f$id]] <- list(ok = is.null(error), error = error, warnings = messages,
    seconds = proc.time()[[3]] - started, input = mode)
}
write_json(statuses, file.path(mode_dir,"status.json"), auto_unbox = TRUE, pretty = TRUE)
}
cat("Upstream lavaan auto-layout baseline completed.\n")
