.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
evidence<-jsonlite::fromJSON('../evidence/phase-4/native.json')
checked<-character()
for(key in c('single','invariance','bootstrap')){
  reference<-evidence[[key]];environment<-new.env()
  invisible(capture.output(eval(parse(text=reference$script),envir=environment)))
  actual<-lavaan::parameterEstimates(environment$fit,standardized=TRUE,level=reference$confidence,boot.ci.type='perc')
  for(column in c('est','se','ci.lower','ci.upper','std.all'))stopifnot(max(abs(actual[[column]]-reference$parameters[[column]]),na.rm=TRUE)<1e-8)
  if(key=='invariance')for(i in 1:4){model<-get(c('configural','metric','scalar','strict')[i],envir=environment);stopifnot(abs(lavaan::fitMeasures(model,'cfi.robust')-reference$invariance$cfi[i])<1e-8)}
  checked<-c(checked,key)
}
jsonlite::write_json(list(passed=TRUE,scripts=as.list(checked),tolerance=1e-8),'../evidence/phase-4/reproduction.json',auto_unbox=TRUE,pretty=TRUE)
cat('PASS: standalone R scripts reproduce estimates, SEs, confidence intervals, standardized values and the invariance sequence.\n')
