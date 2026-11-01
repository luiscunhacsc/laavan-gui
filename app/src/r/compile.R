# Scientific boundary: only lavaan interprets model syntax and modifiers.
sem_compile <- function(model_text, options_json) {
  warnings <- character()
  capture <- function(expr) withCallingHandlers(expr, warning = function(w) {
    warnings <<- c(warnings, conditionMessage(w)); invokeRestart("muffleWarning")
  })
  tryCatch({
    opts <- jsonlite::fromJSON(options_json)
    stopifnot(opts$preset %in% c("sem", "cfa", "path"), opts$groups >= 1, opts$groups <= 16)
    if (!nzchar(trimws(model_text))) stop("model.empty")
    raw <- capture(lavaan::lavParseModelString(model_text, as_data_frame = TRUE))
    if ("efa" %in% names(raw) && any(nzchar(raw$efa))) stop("model.efa")
    # Preserve constraints and modifiers supplied by lavaan's own parser.
    constraints <- attr(raw, "constraints")
    modifiers <- attr(raw, "modifiers")
    mean_structure <- isTRUE(opts$meanstructure) || opts$groups > 1 || any(raw$op == "~1")
    # Path analysis is an observed-only SEM preset, not a separate lavaan model type.
    model_type <- if (opts$preset == "path") "sem" else opts$preset
    pt <- capture(lavaan::lavaanify(model_text, model_type = model_type, auto = TRUE,
      ngroups = as.integer(opts$groups), fixed_x = isTRUE(opts$fixedX),
      meanstructure = mean_structure, int_ov_free = TRUE, int_lv_free = FALSE))
    permitted <- c("=~", "<~", "~", "~~", "~1", ":=", "==", "<", ">", "|", "~*~")
    unknown <- setdiff(unique(c(raw$op, pt$op)), permitted)
    if (length(unknown)) stop(paste0("model.unsupported: ", paste(unknown, collapse = ", ")))
    if ("level" %in% names(pt) && any(pt$level > 1)) stop("model.multilevel")
    pt$origin <- ifelse(pt$user == 0, "implicit", ifelse(pt$user == 2, "constraint", "explicit"))
    pt$defaultFixed <- FALSE
    pt$sourceOrder <- seq_len(nrow(pt))
    for (i in seq_len(nrow(pt))) {
      matches <- which(raw$lhs == pt$lhs[i] & raw$op == pt$op[i] & raw$rhs == pt$rhs[i])
      if (length(matches)) {
        j <- matches[1]
        pt$sourceOrder[i] <- j
        # A first loading is an explicit row with a default-applied fixed value.
        # 'fixed' comes from lavaan's parser, including explicit NA modifiers.
        pt$defaultFixed[i] <- pt$op[i] %in% c("=~", "<~") && pt$free[i] == 0 &&
          (!"fixed" %in% names(raw) || identical(raw$fixed[j], ""))
      }
    }
    latent <- lavaan::lavNames(pt, "lv")
    observed <- lavaan::lavNames(pt, "ov")
    if (opts$preset == "path" && length(latent)) stop("model.pathLatent")
    if (length(unique(c(latent, observed))) > 300) stop("model.large")
    list(ok = TRUE, table = pt, latent = unname(as.list(latent)),
      observed = unname(as.list(observed)), source = raw,
      constraints = constraints, modifiers = modifiers,
      warnings = unname(as.list(warnings)), options = list(preset = opts$preset,
        groups = opts$groups, fixedX = isTRUE(opts$fixedX), meanstructure = mean_structure),
      versions = list(lavaan = as.character(utils::packageVersion("lavaan")), R = R.version.string))
  }, error = function(e) list(ok = FALSE, message = conditionMessage(e), warnings = unname(as.list(warnings))))
}
sem_compile_json <- function(model_text, options_json) {
  jsonlite::toJSON(sem_compile(model_text, options_json), auto_unbox = TRUE,
    dataframe = "rows", na = "null", null = "null", digits = 16)
}
