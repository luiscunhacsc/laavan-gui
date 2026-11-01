.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
source('src/r/compile.R');source('src/r/edit.R');source('src/r/analysis.R')
opts <- list(preset='sem',groups=1,fixedX=FALSE,meanstructure=FALSE)
fixtures <- jsonlite::fromJSON('../fixtures/models.json',simplifyVector=FALSE)
extra <- jsonlite::fromJSON('tests/fixtures/extra-models.json',simplifyVector=FALSE)
results <- list()
for(f in c(fixtures,extra)) {
  o <- opts;o$preset <- if(is.null(f$preset))'sem'else f$preset;o$groups<-f$groups
  check <- forma_check_roundtrip(f$syntax,o)
  stopifnot(identical(forma_semantic_signature(check$model),forma_semantic_signature(sem_compile(check$syntax,jsonlite::toJSON(o,auto_unbox=TRUE)))))
  results[[f$id]] <- list(syntax=check$syntax,model=sem_compile(check$syntax,jsonlite::toJSON(o,auto_unbox=TRUE)))
}
current <- '';last <- NULL
edit <- function(command,options=opts) {
  q <- list(text=current,options=options,command=command)
  result <- forma_edit(jsonlite::fromJSON(jsonlite::toJSON(q,auto_unbox=TRUE),simplifyVector=FALSE))
  current <<- result$syntax;last <<- result$model;invisible(result)
}
for(name in c('X','M','Y'))edit(list(kind='observed',name=name))
for(pair in list(c('X','M'),c('M','Y'),c('X','Y')))edit(list(kind='connect',from=pair[1],to=pair[2],relation='regression'))
for(item in list(c('M','X','a'),c('Y','M','b'),c('Y','X','cp'))) {
 row <- last$table[last$table$lhs==item[1]&last$table$op=='~'&last$table$rhs==item[2],]
 edit(list(kind='parameter',id=row$id,mode='free',label=item[3],allGroups=TRUE))
}
current <- paste0(current,'\nind := a*b\ntotal := cp + ind')
checked <- forma_check_roundtrip(current,opts)
stopifnot('ind' %in% checked$model$table$lhs)
row <- checked$model$table[checked$model$table$lhs=='M'&checked$model$table$op=='~',]
stopifnot(inherits(try(forma_edit(list(text=current,options=opts,command=list(kind='parameter',id=row$id,mode='free',label='',allGroups=TRUE))),silent=TRUE),'try-error'))
mediation <- list(syntax=current,model=checked$model)
current <- '';edit(list(kind='latent',name='F'))
stopifnot(identical(unlist(last$latent),'F'),!length(last$observed))
phantom <- list(syntax=current,model=last)
for(name in c('x1','x2','x3'))edit(list(kind='observed',name=name))
for(name in c('x1','x2','x3'))edit(list(kind='connect',from='F',to=name,relation='loading'))
stopifnot(sum(last$table$op=='=~')==3,last$table$defaultFixed[1])
first <- last$table[last$table$lhs=='F'&last$table$op=='=~'&last$table$rhs=='x1',]
edit(list(kind='parameter',id=first$id,mode='free',label='marker',allGroups=TRUE))
stopifnot(last$table$free[last$table$lhs=='F'&last$table$op=='=~'&last$table$rhs=='x1']>0)
variance <- last$table[last$table$lhs=='F'&last$table$op=='~~'&last$table$rhs=='F',]
edit(list(kind='parameter',id=variance$id,mode='fixed',value=1,label='',allGroups=TRUE))
edit(list(kind='rename',name='F',newName='Factor'))
stopifnot('Factor' %in% unlist(last$latent),!'F' %in% unlist(last$latent))
cfa <- list(syntax=current,model=last)
loading <- last$table[last$table$lhs=='Factor'&last$table$op=='=~'&last$table$rhs=='x2',]
edit(list(kind='removeParameter',id=loading$id))
stopifnot('x2' %in% unlist(last$observed),!any(last$table$lhs=='Factor'&last$table$op=='=~'&last$table$rhs=='x2'))
edit(list(kind='removeVariable',name='x2'))
stopifnot(!'x2' %in% unlist(last$observed))
current <- fixtures[[5]]$syntax;o <- opts;o$preset<-'cfa';o$groups<-2
base <- sem_compile(current,jsonlite::toJSON(o,auto_unbox=TRUE));row <- base$table[base$table$lhs=='F'&base$table$op=='=~'&base$table$rhs=='x2'&base$table$group==2,]
edit(list(kind='parameter',id=row$id,mode='free',label='separate',allGroups=FALSE),o)
stopifnot(last$table$label[last$table$lhs=='F'&last$table$op=='=~'&last$table$rhs=='x2'&last$table$group==1]=='l2',last$table$label[last$table$lhs=='F'&last$table$op=='=~'&last$table$rhs=='x2'&last$table$group==2]=='separate')
current <- '';edit(list(kind='latent',name='Composite'))
for(name in c('x1','x2','x3'))edit(list(kind='observed',name=name))
for(name in c('x1','x2','x3'))edit(list(kind='connect',from=name,to='Composite',relation='formative'))
stopifnot(sum(last$table$op=='<~')==3,!any(last$table$op=='=~'))
formative <- list(syntax=current,model=last)
stopifnot(inherits(try(forma_edit(list(text='',options=opts,command=list(kind='observed',name='X\nY ~ Z'))),silent=TRUE),'try-error'))
before <- forma_example(list(id='original',name='Mediation',example='mediation'))$dataset
bad_restore <- forma_request(list(action='restore',source=list(action='example',id='replacement',name='Other',example='holzinger'),types=list(list(name='absent',type='ordered'))))
stopifnot(!bad_restore$ok,forma_data$current$id=='original',nrow(forma_data$current$data)==400)
restored <- forma_request(list(action='restore',source=list(action='example',id='replacement',name='Other',example='holzinger'),types=list(list(name='x1',type='ordered'))))
stopifnot(restored$ok,restored$dataset$revision==2,restored$dataset$columns[[7]]$name!='absent')
stopifnot(Filter(function(col)col$name=='x1',restored$dataset$columns)[[1]]$type=='ordered')
dat <- forma_example(list(id='numeric',name='Mediation',example='mediation'))
reference <- lavaan::sem(fixtures[[3]]$syntax,data=forma_data$current$data,fixed.x=FALSE,meanstructure=FALSE)
drawn <- lavaan::sem(mediation$syntax,data=forma_data$current$data,fixed.x=FALSE,meanstructure=FALSE)
parameter_map <- function(fit){pe<-lavaan::parameterEstimates(fit,standardized=TRUE);pe[order(paste(pe$lhs,pe$op,pe$rhs)),c('lhs','op','rhs','est','se','std.all')]}
stopifnot(isTRUE(all.equal(parameter_map(reference),parameter_map(drawn),check.attributes=FALSE,tolerance=1e-8)))
dir.create('../evidence/phase-3',recursive=TRUE,showWarnings=FALSE)
jsonlite::write_json(list(roundtrips=results,mediation=mediation,phantom=phantom,cfa=cfa,formative=formative,drawnMediationEquivalent=TRUE,restoreRollback=TRUE),getOption('forma.editEvidence','../evidence/phase-3/native-editing.json'),auto_unbox=TRUE,dataframe='rows',na='null',null='null',digits=16,pretty=TRUE)
cat('PASS: all seven fixed and eight extra round trips; drawn path/CFA models; parameter edits, renaming, deletion, group-specific labels and dependency guards.\n')
