# Dataset values stay in this R worker. JSON requests contain values, never R code.
forma_data <- new.env(parent = emptyenv())
forma_data$current <- NULL
forma_array <- function(x) unname(as.list(x))
forma_quote <- function(x) paste(deparse(x, width.cutoff = 500L), collapse = "\n")
forma_missing <- function(x) {
  result <- is.na(x)
  values <- attr(x, "na_values"); interval <- attr(x, "na_range")
  if (length(values)) result <- result | x %in% values
  if (length(interval) == 2) result <- result | (!is.na(x) & x >= interval[1] & x <= interval[2])
  result
}
forma_values <- function(x) {
  if (inherits(x, "POSIXt")) return(format(x, "%Y-%m-%dT%H:%M:%S", tz = "UTC"))
  if (inherits(x, "Date")) return(as.character(x))
  if (is.factor(x)) return(as.character(x))
  if (is.numeric(x)) return(as.numeric(x))
  if (is.logical(x)) return(as.logical(x))
  as.character(x)
}
forma_column <- function(x, name, override = NULL) {
  missing <- forma_missing(x); values <- forma_values(x); valid <- values[!missing]
  labels <- attr(x, "labels")
  categories <- if (length(labels)) lapply(seq_along(labels), function(i) list(value = unname(labels[i]), label = names(labels)[i])) else list()
  date <- inherits(x, c("Date", "POSIXt"))
  storage <- if (date) "date" else if (is.numeric(x)) "numeric" else if (is.logical(x)) "logical" else "text"
  type <- if (!is.null(override)) override else if (is.ordered(x)) "ordered" else if (storage == "numeric" && !length(labels)) "continuous" else "nominal"
  level_values <- if (is.factor(x)) levels(x) else sort(unique(valid), method="radix")
  list(name = name, label = if (is.null(attr(x,"label"))) "" else attr(x,"label"),
    storage = storage, type = type, missing = sum(missing), systemMissing = sum(is.na(values)),
    userMissing = sum(missing & !is.na(values)), valid = sum(!missing), distinct = length(unique(valid)),
    categories = categories, levels = forma_array(head(level_values, 100)),
    min = if (storage == "numeric" && length(valid)) min(valid) else NULL,
    max = if (storage == "numeric" && length(valid)) max(valid) else NULL,
    mean = if (storage == "numeric" && length(valid)) mean(valid) else NULL)
}
forma_metadata <- function(d = forma_data$current) {
  if (is.null(d)) stop("data.none")
  if (d$kind == "covariance") return(list(id=d$id, revision=d$revision, name=d$name,
    kind=d$kind, rows=nrow(d$cov), sampleSize=d$n, names=forma_array(colnames(d$cov)),
    matrix=unname(lapply(seq_len(nrow(d$cov)), function(i) forma_array(d$cov[i,]))),
    means=if(is.null(d$means)) NULL else forma_array(d$means), columns=list(), source=d$source))
  columns <- lapply(names(d$data), function(name) forma_column(d$data[[name]], name, d$types[[name]]))
  list(id=d$id, revision=d$revision, name=d$name, kind="raw", rows=nrow(d$data),
    columns=columns, source=d$source)
}
forma_validate_data <- function(dat) {
  if (!ncol(dat) || ncol(dat)>500 || nrow(dat)>200000 || nrow(dat)*ncol(dat)>5000000) stop("data.size")
  if (any(!nzchar(names(dat))) || anyDuplicated(names(dat))) stop("data.names")
  if (any(vapply(dat, is.list, logical(1)))) stop("data.nested")
  if (any(vapply(dat, function(x) is.numeric(x) && any(!is.finite(x) & !is.na(x)), logical(1)))) stop("data.nonfinite")
  dat
}
forma_import <- function(q) {
  if (!q$format %in% c("csv","xlsx","xls","sav","zsav")) stop("data.format")
  na <- unlist(q$na, use.names=FALSE); if (is.null(na)) na <- c("", "NA")
  dat <- switch(q$format,
    csv = utils::read.table(q$path, header=TRUE, sep=q$delimiter, quote='"',
      na.strings=na, check.names=FALSE, stringsAsFactors=FALSE, comment.char="",
      fileEncoding="UTF-8-BOM", fill=FALSE),
    xlsx = as.data.frame(readxl::read_excel(q$path, sheet=q$sheet, na=na, guess_max=200000,
      .name_repair="minimal", trim_ws=FALSE)),
    xls = as.data.frame(readxl::read_excel(q$path, sheet=q$sheet, na=na, guess_max=200000,
      .name_repair="minimal", trim_ws=FALSE)),
    sav = as.data.frame(haven::read_sav(q$path, user_na=TRUE, .name_repair="minimal")),
    zsav = as.data.frame(haven::read_sav(q$path, user_na=TRUE, .name_repair="minimal")))
  dat <- forma_validate_data(dat)
  d <- list(id=q$id, revision=1L, name=q$name, kind="raw", data=dat, types=list(),
    source=list(format=q$format, fileName=q$name, sheet=q$sheet, delimiter=q$delimiter, na=forma_array(na)))
  metadata <- forma_metadata(d) # Commit only after the entire import and metadata succeed.
  forma_data$current <- d
  list(ok=TRUE, dataset=metadata)
}
forma_example <- function(q) {
  if (q$example == "mediation") {
    i <- seq_len(400); X <- sin(i*.37)+cos(i*.11)
    M <- .6*X+sin(i*.71)+.4*cos(i*.17); Y <- .45*M+.2*X+cos(i*.53)+.2*sin(i*.29)
    dat <- data.frame(X,M,Y)
  } else if (q$example == "holzinger") dat <- lavaan::HolzingerSwineford1939
  else if (q$example == "democracy") dat <- lavaan::PoliticalDemocracy
  else stop("data.example")
  d <- list(id=q$id, revision=1L, name=q$name, kind="raw", data=dat, types=list(), source=list(format="example", example=q$example))
  metadata <- forma_metadata(d); forma_data$current <- d
  list(ok=TRUE, dataset=metadata)
}
forma_covariance <- function(q) {
  tab <- utils::read.table(text=q$text, header=TRUE, sep=",", check.names=FALSE, comment.char="", stringsAsFactors=FALSE)
  if (anyDuplicated(names(tab)) || any(!nzchar(names(tab)))) stop("data.names")
  m <- as.matrix(tab)
  if (!is.numeric(m) || nrow(m)!=ncol(m) || !nrow(m) || nrow(m)>300 || any(!is.finite(m))) stop("data.matrix")
  dimnames(m) <- list(names(tab),names(tab))
  if (max(abs(m-t(m)))>1e-8 || min(eigen(m,symmetric=TRUE,only.values=TRUE)$values)<=0) stop("data.matrixPositive")
  if (is.null(q$n) || !is.finite(q$n) || q$n<2 || q$n!=as.integer(q$n)) stop("data.sampleSize")
  means <- if (is.null(q$means) || !nzchar(trimws(q$means))) NULL else suppressWarnings(as.numeric(strsplit(q$means,",",fixed=TRUE)[[1]]))
  if (!is.null(means) && (length(means)!=ncol(m) || any(!is.finite(means)))) stop("data.means")
  if (!is.null(means)) names(means) <- colnames(m)
  d <- list(id=q$id, revision=1L, name=q$name, kind="covariance", cov=m, means=means, n=as.integer(q$n), source=list(format="covariance"))
  metadata <- forma_metadata(d); forma_data$current <- d
  list(ok=TRUE, dataset=metadata)
}
forma_page <- function(q) {
  d <- forma_data$current
  if (is.null(d) || d$id!=q$id || d$revision!=q$revision) stop("data.changed")
  if (d$kind!="raw") stop("data.matrix")
  start <- max(0L,as.integer(q$start)); count <- min(150L,max(1L,as.integer(q$count)))
  columns <- intersect(unlist(q$columns, use.names=FALSE),names(d$data))
  if (length(columns)>80) stop("data.columns")
  rows <- if(start>=nrow(d$data)) integer() else seq.int(start+1L,min(nrow(d$data),start+count))
  prepared <- lapply(columns, function(name) {
    x <- d$data[[name]][rows]; values <- forma_values(x)
    labels <- attr(d$data[[name]],"labels"); missing <- forma_missing(x)
    lapply(seq_along(rows), function(i) {
      label <- if (length(labels)) names(labels)[match(values[i],labels)] else NA_character_
      list(value=if(is.na(values[i])) NULL else values[i],label=if(is.na(label)) NULL else label,missing=missing[i])
    })
  })
  list(ok=TRUE, start=start, columns=forma_array(columns),
    rows=lapply(seq_along(rows), function(i) lapply(prepared,`[[`,i)))
}
forma_type <- function(q) {
  d <- forma_data$current
  if (is.null(d) || d$id!=q$id || d$revision!=q$revision) stop("data.changed")
  if (!q$name %in% names(d$data) || !q$type %in% c("continuous","ordered","nominal")) stop("data.type")
  if (q$type=="continuous" && !is.numeric(d$data[[q$name]])) stop("data.numeric")
  if (q$type=="ordered" && length(unique(d$data[[q$name]][!forma_missing(d$data[[q$name]])]))>100) stop("data.levels")
  d$types[[q$name]] <- q$type; d$revision <- d$revision+1L
  metadata <- forma_metadata(d); forma_data$current <- d
  list(ok=TRUE, dataset=metadata)
}
forma_import_script <- function(d) {
  s <- d$source
  if (d$kind=="covariance") {
    dimnames <- paste0("list(",forma_quote(colnames(d$cov)),", ",forma_quote(colnames(d$cov)),")")
    return(paste0("sample_cov <- matrix(",forma_quote(as.vector(t(d$cov))),", nrow = ",nrow(d$cov),", byrow = TRUE, dimnames = ",dimnames,")\nsample_n <- ",d$n,
      if(!is.null(d$means)) paste0("\nsample_mean <- ",forma_quote(d$means)) else ""))
  }
  if (s$format=="example") {
    if (s$example=="mediation") return("i <- seq_len(400)\nX <- sin(i*.37) + cos(i*.11)\nM <- .6*X + sin(i*.71) + .4*cos(i*.17)\nY <- .45*M + .2*X + cos(i*.53) + .2*sin(i*.29)\ndata <- data.frame(X, M, Y)")
    return(paste0("data <- lavaan::",if(s$example=="holzinger") "HolzingerSwineford1939" else "PoliticalDemocracy"))
  }
  if (s$format=="csv") return(paste0("data <- read.table(",forma_quote(s$fileName),", header = TRUE, sep = ",forma_quote(s$delimiter),", quote = '\"', na.strings = ",forma_quote(unlist(s$na)),", check.names = FALSE, stringsAsFactors = FALSE, comment.char = '', fileEncoding = 'UTF-8-BOM', fill = FALSE)"))
  if (s$format %in% c("xlsx","xls")) return(paste0("data <- as.data.frame(readxl::read_excel(",forma_quote(s$fileName),", sheet = ",forma_quote(s$sheet),", na = ",forma_quote(unlist(s$na)),", guess_max = 200000, .name_repair = 'minimal', trim_ws = FALSE))"))
  paste0("data <- as.data.frame(haven::read_sav(",forma_quote(s$fileName),", user_na = TRUE, .name_repair = 'minimal'))\ndata <- as.data.frame(lapply(data, haven::zap_missing))")
}
forma_fit <- function(q) {
  d <- forma_data$current
  if (is.null(d) || d$id!=q$id || d$revision!=q$revision) stop("data.changed")
  a <- q$analysis; opts <- q$options
  advanced <- if(exists('forma_advanced_options'))forma_advanced_options(a,d)else list(bootstrap=0,confidence=.95)
  if (!a$estimator %in% c("ML","MLR","WLSMV") || !a$missing %in% c("listwise","fiml","pairwise")) stop("analysis.options")
  if (a$estimator=="WLSMV" && a$missing=="fiml") stop("analysis.ordinalFiml")
  if (a$estimator!="WLSMV" && a$missing=="pairwise") stop("analysis.pairwise")
  compiled <- sem_compile(q$text,jsonlite::toJSON(opts,auto_unbox=TRUE))
  if (!compiled$ok) stop(compiled$message)
  observed <- unlist(compiled$observed,use.names=FALSE)
  present <- if(d$kind=="raw") names(d$data) else colnames(d$cov)
  absent <- setdiff(observed,present)
  if (length(absent)) stop(paste0("analysis.absent: ",paste(absent,collapse=", ")))
  args <- list(model=q$text,estimator=a$estimator,missing=a$missing,
    fixed.x=isTRUE(opts$fixedX),meanstructure=isTRUE(compiled$options$meanstructure))
  ordered <- character()
  if (d$kind=="raw") {
    dat <- d$data
    for (name in names(dat)) {
      x <- dat[[name]]; missing <- forma_missing(x)
      if (inherits(x,"haven_labelled")) x <- if(is.numeric(x)) as.numeric(x) else as.character(x)
      x[missing] <- NA; dat[[name]] <- x
    }
    metadata <- forma_metadata(d)
    for (col in metadata$columns) if (col$name %in% observed) {
      if (col$type=="ordered") ordered <- c(ordered,col$name)
      else if (col$storage!="numeric" || col$type=="nominal") stop(paste0("analysis.nonnumeric: ",col$name))
    }
    if (length(ordered) && a$estimator!="WLSMV") stop("analysis.orderedEstimator")
    if (length(ordered)) args$ordered <- ordered
    for (name in ordered) dat[[name]] <- ordered(dat[[name]], levels=sort(unique(dat[[name]][!is.na(dat[[name]])]),method="radix"))
    if (opts$groups>1) {
      if (is.null(a$group) || !nzchar(a$group) || !a$group %in% names(dat)) stop("analysis.group")
      if (length(unique(dat[[a$group]][!is.na(dat[[a$group]])]))!=opts$groups) stop("analysis.groupCount")
      args$group <- a$group
    }
    args$data <- dat
  } else {
    if (opts$groups>1) stop("analysis.matrixGroups")
    if (a$estimator!="ML" || a$missing!="listwise") stop("analysis.matrixEstimator")
    if (isTRUE(compiled$options$meanstructure) && is.null(d$means)) stop("analysis.matrixMeans")
    args$sample.cov <- d$cov; args$sample.nobs <- d$n
    if(!is.null(d$means)) args$sample.mean <- d$means
  }
  fun <- if(opts$preset=="cfa") lavaan::cfa else lavaan::sem
  if(isTRUE(a$invariance))forma_invariance_guard(q,compiled,ordered,d)
  if(advanced$bootstrap>0) {
    rng_exists<-exists('.Random.seed',envir=.GlobalEnv,inherits=FALSE)
    if(rng_exists)previous_rng<-get('.Random.seed',envir=.GlobalEnv)
    on.exit(if(rng_exists)assign('.Random.seed',previous_rng,envir=.GlobalEnv)else if(exists('.Random.seed',envir=.GlobalEnv,inherits=FALSE))rm('.Random.seed',envir=.GlobalEnv),add=TRUE)
    set.seed(advanced$seed);args$se<-'bootstrap';args$bootstrap<-advanced$bootstrap
  }
  fit <- do.call(fun,args)
  converged <- isTRUE(lavaan::lavInspect(fit,"converged"))
  admissible <- if(converged) isTRUE(lavaan::lavInspect(fit,"post.check")) else FALSE
  actual <- lavaan::lavInspect(fit,"options")
  opts$meanstructure <- isTRUE(actual$meanstructure)
  base <- sem_compile(q$text,jsonlite::toJSON(opts,auto_unbox=TRUE))
  pt <- lavaan::parTable(fit)
  key <- function(t) paste(t$lhs,t$op,t$rhs,t$group,sep="\r")
  idx <- match(key(pt),key(base$table))
  pt$origin <- ifelse(pt$user==0,"implicit",ifelse(pt$user==2,"constraint","explicit"))
  pt$defaultFixed <- ifelse(is.na(idx),FALSE,base$table$defaultFixed[idx])
  pt$sourceOrder <- ifelse(is.na(idx),nrow(base$table)+seq_len(nrow(pt)),base$table$sourceOrder[idx])
  base$table <- pt; base$options <- opts
  base$latent <- forma_array(lavaan::lavNames(fit,"lv")); base$observed <- forma_array(lavaan::lavNames(fit,"ov"))
  pe <- if(converged) lavaan::parameterEstimates(fit,standardized=TRUE,level=advanced$confidence,boot.ci.type='perc') else data.frame()
  standardized <- if(converged) tryCatch(lavaan::standardizedSolution(fit,type="std.all"),error=function(e)data.frame()) else data.frame()
  measure_names <- c("chisq","df","pvalue","cfi","tli","rmsea","rmsea.ci.lower","rmsea.ci.upper","srmr",
    "chisq.scaled","df.scaled","pvalue.scaled","cfi.robust","tli.robust","rmsea.robust","rmsea.ci.lower.robust","rmsea.ci.upper.robust",
    "cfi.scaled","tli.scaled","rmsea.scaled","rmsea.ci.lower.scaled","rmsea.ci.upper.scaled")
  measure_error <- NULL
  fm <- if(converged) tryCatch(lavaan::fitMeasures(fit),error=function(e){measure_error <<- conditionMessage(e); numeric()}) else numeric()
  measures <- lapply(measure_names, function(name) {
    value <- if(name %in% names(fm)) unname(fm[name]) else NA_real_
    list(name=name,value=if(is.finite(value)) value else NULL,
      reason=if(is.finite(value)) NULL else if(!converged) "notConverged" else if(!is.null(measure_error)) measure_error else "notAvailable")
  })
  rs <- if(converged) tryCatch(lavaan::lavInspect(fit,"rsquare"),error=function(e)numeric()) else numeric()
  if(!is.list(rs)) rs <- list(rs)
  r2 <- unlist(lapply(seq_along(rs),function(g) lapply(names(rs[[g]]),function(name) list(name=name,group=g,value=unname(rs[[g]][name])))),recursive=FALSE)
  nobs <- as.numeric(lavaan::lavInspect(fit,"nobs"))
  # Reproduce all cleaning and ordinal level orders explicitly.
  preprocessing <- if(d$kind=="raw") paste0("\n",paste(vapply(ordered,function(name) paste0("data[[",forma_quote(name),"]] <- ordered(data[[",forma_quote(name),"]], levels = ",forma_quote(levels(dat[[name]])),")"),character(1)),collapse="\n")) else ""
  script_args <- c(paste0("model = ",forma_quote(q$text)),if(d$kind=="raw") "data = data" else c("sample.cov = sample_cov","sample.nobs = sample_n",if(!is.null(d$means))"sample.mean = sample_mean"),
    paste0("estimator = ",forma_quote(a$estimator)),paste0("missing = ",forma_quote(a$missing)),
    paste0("fixed.x = ",if(isTRUE(opts$fixedX))"TRUE" else "FALSE"),paste0("meanstructure = ",if(isTRUE(compiled$options$meanstructure))"TRUE" else "FALSE"),
    if(length(ordered)) paste0("ordered = ",forma_quote(ordered)), if(!is.null(args$group)) paste0("group = ",forma_quote(args$group)))
  versions <- list(lavaan=as.character(packageVersion("lavaan")),R=R.version.string,semTools=if(isTRUE(a$reliability))as.character(packageVersion('semTools'))else NULL,
    readxl=if(requireNamespace("readxl",quietly=TRUE))as.character(packageVersion("readxl"))else NULL,
    haven=if(requireNamespace("haven",quietly=TRUE))as.character(packageVersion("haven"))else NULL)
  if(advanced$bootstrap>0)script_args<-c(script_args,'se = "bootstrap"',paste0('bootstrap = ',advanced$bootstrap))
  script <- paste0("# Forma analysis; lavaan ",versions$lavaan,"\n# ",versions$R,"\n# Place the original source file in the working directory.\nlibrary(lavaan)\n\n",forma_import_script(d),preprocessing,
    if(advanced$bootstrap>0)paste0('\nset.seed(',advanced$seed,')')else '',"\n\nfit <- ",if(opts$preset=="cfa")"cfa"else"sem","(\n  ",paste(script_args,collapse=",\n  "),"\n)\nsummary(fit, fit.measures = TRUE, standardized = TRUE, rsquare = TRUE)\n",
    'parameterEstimates(fit, standardized = TRUE, level = ',advanced$confidence,', boot.ci.type = "perc")\n')
  modifications<-if(isTRUE(a$modificationIndices))forma_modifications(fit,converged,admissible)else NULL
  reliability<-if(isTRUE(a$reliability))forma_reliability(fit,args,q,admissible)else NULL
  invariance<-if(isTRUE(a$invariance))forma_invariance(fit,args,fun)else NULL
  if(isTRUE(a$modificationIndices))script<-paste0(script,'modindices(fit, sort. = TRUE)\n')
  if(isTRUE(a$reliability)&&reliability$status=='ok')script<-paste0(script,'\n# semTools ',versions$semTools,'; observed-variance denominator; HTMT2 uses absolute correlations\n',
    'semTools::compRelSEM(fit, obs.var = TRUE, tau.eq = FALSE, ord.scale = TRUE, simplify = TRUE)\nsemTools::AVE(fit, obs.var = TRUE, return.df = FALSE)\n',
    '\nmeasurement <- ',forma_quote(forma_measurement_syntax),'\n',
    if(is.null(args$data))'semTools::htmt(measurement(fit, 1), sample.cov = sample_cov, absolute = TRUE, htmt2 = TRUE)\n'else paste0(
    'cases <- lavInspect(fit, "case.idx")\nif (!is.list(cases)) cases <- list(cases)\nlapply(seq_along(cases), function(g) semTools::htmt(measurement(fit, g), data = data[cases[[g]], , drop = FALSE], missing = ',forma_quote(a$missing),
    if(length(ordered))paste0(', ordered = ',forma_quote(ordered))else '',', absolute = TRUE, htmt2 = TRUE))\n'))
  if(isTRUE(a$reliability)&&reliability$status!='ok')script<-paste0(script,'\n# Reliability unavailable for this model: ',reliability$status,'\n')
  if(isTRUE(a$invariance))script<-paste0(script,'\nconfigural <- fit\nmetric <- update(fit, group.equal = "loadings")\nscalar <- update(fit, group.equal = c("loadings", "intercepts"))\nstrict <- update(fit, group.equal = c("loadings", "intercepts", "residuals"))\nlavTestLRT(configural, metric, scalar, strict)\nsapply(list(configural, metric, scalar, strict), fitMeasures)\n')
  list(ok=TRUE,converged=converged,admissible=admissible,model=base,parameters=pe,standardized=standardized,
    measures=measures,rsquared=if(is.null(r2))list()else r2,nobs=forma_array(nobs),
    inputCases=if(d$kind=="raw")nrow(d$data)else d$n,excluded=if(d$kind=="raw")nrow(d$data)-sum(nobs)else 0,
    estimator=a$estimator,missing=a$missing,ordered=forma_array(ordered),script=script,versions=versions,
    datasetId=d$id,datasetRevision=d$revision,bootstrap=if(exists('forma_bootstrap_summary'))forma_bootstrap_summary(fit,advanced)else NULL,
    modifications=modifications,reliability=reliability,invariance=invariance,confidence=advanced$confidence,
    groupLabels=forma_array(lavaan::lavInspect(fit,'group.label')))
}
forma_restore <- function(q) {
  previous <- forma_data$current
  tryCatch({
    source <- q$source
    result <- switch(source$action,import=forma_import(source),example=forma_example(source),covariance=forma_covariance(source),stop('data.format'))
    for(change in q$types)result <- forma_type(list(id=forma_data$current$id,revision=forma_data$current$revision,name=change$name,type=change$type))
    result
  },error=function(e){forma_data$current<-previous;stop(e)})
}
forma_request <- function(q) {
  warnings <- character()
  result <- tryCatch(withCallingHandlers({
    switch(q$action,
      sheets=list(ok=TRUE,sheets=forma_array(readxl::excel_sheets(q$path))),
      import=forma_import(q),example=forma_example(q),covariance=forma_covariance(q),
      page=forma_page(q),type=forma_type(q),fit=forma_fit(q),
      edit=forma_edit(q),
      restore=forma_restore(q),clear={forma_data$current<-NULL;list(ok=TRUE)},
      stop("analysis.request"))
  },warning=function(w){warnings <<- c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}),
    error=function(e)list(ok=FALSE,message=conditionMessage(e)))
  result$warnings <- forma_array(unique(warnings))
  result
}
forma_request_json <- function(q) jsonlite::toJSON(forma_request(q),auto_unbox=TRUE,dataframe="rows",na="null",null="null",digits=16)
