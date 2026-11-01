.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
source('src/r/compile.R');source('src/r/analysis.R')
dir.create('../evidence/phase-2',recursive=TRUE,showWarnings=FALSE)
base_options <- list(preset='sem',groups=1,fixedX=FALSE,meanstructure=FALSE)
analysis <- list(estimator='ML',missing='listwise',group='')
run_script <- function(script) {
  wd <- getwd();on.exit(setwd(wd));setwd('../fixtures/data')
  env <- new.env();invisible(capture.output(eval(parse(text=script),envir=env)));env
}
call <- function(q) {r <- forma_request(jsonlite::fromJSON(jsonlite::toJSON(q,auto_unbox=TRUE,null='null'),simplifyVector=FALSE));if(!r$ok)stop(r$message);r}
import <- function(format,name,sheet='Participants') call(list(action='import',format=format,path=paste0('../fixtures/data/',name),name=name,id=name,delimiter=',',na=list('','NA'),sheet=sheet))
data <- import('sav','labelled.sav')$dataset
imports <- list(spss=data)
stopifnot(data$rows==5,data$columns[[2]]$label=='Course satisfaction',data$columns[[2]]$missing==1,data$columns[[2]]$userMissing==1)
page <- call(list(action='page',id=data$id,revision=data$revision,start=0,count=5,columns=list('satisfaction','city')))
imports$spssPage <- page
stopifnot(page$rows[[3]][[1]]$value==9,page$rows[[3]][[1]]$label=='Declined',page$rows[[3]][[1]]$missing,page$rows[[4]][[2]]$value=='\u00c9vora')
data <- import('xlsx','workbook.xlsx')$dataset
imports$excel <- data
stopifnot(data$rows==5,data$columns[[1]]$missing==1)
sheets <- call(list(action='sheets',path='../fixtures/data/workbook.xlsx'))
stopifnot(identical(unlist(sheets$sheets),c('Participants','Mediation')))
data <- import('csv','large.csv')$dataset
page <- call(list(action='page',id=data$id,revision=data$revision,start=4899,count=20,columns=list('v14')))
stopifnot(data$rows==5000,page$start==4899,length(page$rows)==20,abs(page$rows[[1]][[1]]$value-round(sin(4900*14*.017)+14,6))<1e-10)
failed <- forma_request(list(action='import',format='csv',path='does-not-exist',id='bad',name='bad',delimiter=',',na=list('')))
stopifnot(!failed$ok,forma_data$current$id=='large.csv')
fixtures <- jsonlite::fromJSON('../fixtures/models.json',simplifyVector=FALSE)
results <- list()
for(i in 1:3){
 f <- fixtures[[i]];example <- c('holzinger','democracy','mediation')[i]
 data <- call(list(action='example',example=example,id=f$id,name=example))$dataset
 opts <- base_options;opts$preset <- f$preset
 q <- list(action='fit',id=data$id,revision=data$revision,text=f$syntax,options=opts,analysis=analysis)
 result <- call(q)
 stopifnot(result$converged,result$admissible)
 # Generated R must run and reproduce estimates, not just look plausible.
 script_env <- run_script(result$script)
 actual <- lavaan::parameterEstimates(script_env$fit,standardized=TRUE)
 stopifnot(max(abs(actual$est-result$parameters$est),na.rm=TRUE)<1e-10)
 results[[f$id]] <- result
}
data <- import('xlsx','workbook.xlsx',sheet='Mediation')$dataset
excel_fit <- call(list(action='fit',id=data$id,revision=data$revision,text=fixtures[[3]]$syntax,options=base_options,analysis=analysis))
script_env <- run_script(excel_fit$script)
stopifnot(max(abs(lavaan::parameterEstimates(script_env$fit)$est-excel_fit$parameters$est),na.rm=TRUE)<1e-10)
data <- import('sav','mediation-labelled.sav')$dataset
stopifnot(data$columns[[1]]$type=='nominal')
q <- list(action='fit',id=data$id,revision=data$revision,text=fixtures[[3]]$syntax,options=base_options,analysis=analysis)
stopifnot(!forma_request(q)$ok)
data <- call(list(action='type',id=data$id,revision=data$revision,name='X',type='continuous'))$dataset
q$revision <- data$revision;spss_fit <- call(q)
script_env <- run_script(spss_fit$script)
stopifnot(max(abs(lavaan::parameterEstimates(script_env$fit)$est-spss_fit$parameters$est),na.rm=TRUE)<1e-10)
data <- import('csv','missing.csv')$dataset
q <- list(action='fit',id=data$id,revision=data$revision,text=fixtures[[3]]$syntax,options=base_options,analysis=list(estimator='MLR',missing='fiml',group=''))
missing_fit <- call(q);stopifnot(missing_fit$converged,sum(unlist(missing_fit$nobs))==400,missing_fit$excluded==0,missing_fit$model$options$meanstructure)
script_env <- run_script(missing_fit$script)
stopifnot(max(abs(lavaan::parameterEstimates(script_env$fit)$est-missing_fit$parameters$est),na.rm=TRUE)<1e-10)
data <- import('csv','ordinal.csv')$dataset
for(name in paste0('x',1:9))data <- call(list(action='type',id=data$id,revision=data$revision,name=name,type='ordered'))$dataset
opts <- base_options;opts$preset <- 'cfa'
q <- list(action='fit',id=data$id,revision=data$revision,text=fixtures[[1]]$syntax,options=opts,analysis=list(estimator='WLSMV',missing='listwise',group=''))
ordinal_fit <- call(q);stopifnot(ordinal_fit$converged,length(ordinal_fit$ordered)==9)
script_env <- run_script(ordinal_fit$script)
stopifnot(max(abs(lavaan::parameterEstimates(script_env$fit)$est-ordinal_fit$parameters$est),na.rm=TRUE)<1e-8)
q$analysis$missing <- 'fiml';stopifnot(!forma_request(q)$ok)
q$analysis <- analysis;stopifnot(!forma_request(q)$ok)
cov <- cov(lavaan::HolzingerSwineford1939[paste0('x',1:9)])
matrix_text <- paste(c(paste(colnames(cov),collapse=','),apply(cov,1,function(x)paste(format(x,digits=16),collapse=','))),collapse='\n')
data <- call(list(action='covariance',id='cov',name='Covariance',text=matrix_text,n=301,means=''))$dataset
matrix_fit <- call(list(action='fit',id=data$id,revision=data$revision,text=fixtures[[1]]$syntax,options=opts,analysis=analysis))
stopifnot(matrix_fit$converged,matrix_fit$inputCases==301)
script_env <- run_script(matrix_fit$script)
stopifnot(max(abs(lavaan::parameterEstimates(script_env$fit)$est-matrix_fit$parameters$est),na.rm=TRUE)<1e-10)
jsonlite::write_json(list(imports=imports,core=results,excel=excel_fit,spss=spss_fit,missing=missing_fit,ordinal=ordinal_fit,matrix=matrix_fit), getOption('forma.evidence','../evidence/phase-2/native-analysis.json'),auto_unbox=TRUE,dataframe='rows',na='null',null='null',digits=16,pretty=TRUE)
cat('PASS: CSV/Excel/SPSS fidelity, distant data paging, transactional imports, three fits and executable scripts, MLR/FIML, ordinal WLSMV and covariance input.\n')
