# Advanced procedures use fitted lavaan objects and semTools, never syntax parsing.
forma_number <- function(x) if(length(x)==1L && is.finite(x)) unname(x) else NULL
forma_advanced_options <- function(a,d) {
  b <- if(is.null(a$bootstrap)) 0 else a$bootstrap
  seed <- if(is.null(a$seed)) 20261101 else a$seed
  confidence <- if(is.null(a$confidence)) .95 else a$confidence
  if(length(b)!=1 || !is.numeric(b) || !is.finite(b) || b!=floor(b) || (b!=0 && (b<100 || b>10000)))stop('advanced.bootstrapCount')
  if(length(seed)!=1 || !is.numeric(seed) || !is.finite(seed) || seed<1 || seed>2147483647 || seed!=floor(seed))stop('advanced.seed')
  if(length(confidence)!=1 || !is.numeric(confidence) || !is.finite(confidence) || confidence<.8 || confidence>.99)stop('advanced.confidence')
  if(b>0 && (a$estimator!='ML' || d$kind!='raw'))stop('advanced.bootstrapEstimator')
  if(b>0 && isTRUE(a$invariance))stop('advanced.separate')
  list(bootstrap=as.integer(b),seed=as.integer(seed),confidence=confidence)
}
forma_simple_cfa <- function(fit,minimum=2L) {
  pt <- lavaan::parTable(fit);lv <- lavaan::lavNames(fit,'lv')
  load <- pt[pt$op=='=~',,drop=FALSE]
  if(!length(lv) || any(pt$op %in% c('~','<~')) || any(load$rhs %in% lv))return(FALSE)
  for(g in unique(load$group)) {
    block <- load[load$group==g,,drop=FALSE]
    if(anyDuplicated(block$rhs) || any(table(factor(block$lhs,levels=lv))<minimum))return(FALSE)
  }
  TRUE
}
forma_invariance_guard <- function(q,compiled,ordered,d) {
  if(d$kind!='raw' || q$options$groups<2 || q$options$preset!='cfa')stop('advanced.invarianceCfa')
  if(length(ordered) || q$analysis$estimator=='WLSMV')stop('advanced.invarianceOrdinal')
  pt <- compiled$table
  if(any(nzchar(pt$label)) || any(pt$op %in% c('==','<','>','~','<~',':=')) || any(pt$op=='=~' & pt$rhs %in% unlist(compiled$latent)))stop('advanced.invarianceSyntax')
  # The automated sequence assumes lavaan's marker-variable identification.
  # Explicit fixed variances/means would prevent the required later releases.
  if(any(pt$op=='~1'&pt$user!=0) || any(pt$op=='~~'&pt$lhs==pt$rhs&pt$free==0))stop('advanced.invarianceScaling')
  for(g in seq_len(q$options$groups))for(f in unlist(compiled$latent)) {
    load<-pt[pt$group==g&pt$op=='=~'&pt$lhs==f,,drop=FALSE]
    if(nrow(load)<2 || load$free[1]!=0 || is.na(load$ustart[1]) || load$ustart[1]!=1 || any(load$free[-1]==0))stop('advanced.invarianceScaling')
  }
  if(!isTRUE(q$options$meanstructure))stop('advanced.invarianceMeans')
}
forma_invariance <- function(fit,args,fun) {
  old_options<-options(useFancyQuotes=FALSE);on.exit(options(old_options),add=TRUE)
  if(!forma_simple_cfa(fit))stop('advanced.invarianceSyntax')
  levels <- list(configural=character(),metric='loadings',scalar=c('loadings','intercepts'),strict=c('loadings','intercepts','residuals'))
  fits <- list(configural=fit);rows <- list();previous <- NULL
  for(name in names(levels)) {
    current <- if(name=='configural')fit else {a<-args;a$group.equal<-levels[[name]];do.call(fun,a)}
    fits[[name]] <- current
    converged <- isTRUE(lavaan::lavInspect(current,'converged'))
    admissible <- converged && isTRUE(lavaan::lavInspect(current,'post.check'))
    fm <- if(converged)tryCatch(lavaan::fitMeasures(current),error=function(e)numeric())else numeric()
    choose <- function(base) {
      candidates <- if(args$estimator=='ML')base else c(paste0(base,'.robust'),paste0(base,'.scaled'),base)
      found <- candidates[candidates %in% names(fm) & vapply(candidates,function(k)length(fm[k])==1&&is.finite(fm[k]),logical(1))]
      if(length(found))list(name=found[1],value=forma_number(fm[found[1]]))else list(name=base,value=NULL)
    }
    cfi<-choose('cfi');rmsea<-choose('rmsea');test<-NULL;test_error<-NULL
    if(!is.null(previous) && converged && previous$converged) {
      comparison <- tryCatch(lavaan::lavTestLRT(fits[[previous$stage]],current),error=function(e){test_error<<-conditionMessage(e);NULL})
      if(!is.null(comparison)) {
        last <- comparison[nrow(comparison),,drop=FALSE]
        heading<-strsplit(trimws(paste(attr(comparison,'heading'),collapse=' ')),'\n',fixed=TRUE)[[1]][1]
        test <- list(chisq=forma_number(last[['Chisq diff']]),df=forma_number(last[['Df diff']]),pvalue=forma_number(last[['Pr(>Chisq)']]),method=forma_array(heading))
      }
    }
    row<-list(stage=name,converged=converged,admissible=admissible,chisq=choose('chisq')$value,df=forma_number(fm['df']),pvalue=choose('pvalue')$value,
      cfi=cfi$value,cfiType=cfi$name,rmsea=rmsea$value,rmseaType=rmsea$name,srmr=forma_number(fm['srmr']),
      deltaCfi=if(!is.null(previous)&&!is.null(cfi$value)&&!is.null(previous$cfi)&&cfi$name==previous$cfiType)cfi$value-previous$cfi else NULL,
      deltaRmsea=if(!is.null(previous)&&!is.null(rmsea$value)&&!is.null(previous$rmsea)&&rmsea$name==previous$rmseaType)rmsea$value-previous$rmsea else NULL,
      difference=test,differenceError=test_error)
    rows[[length(rows)+1L]]<-row;previous<-row
    if(!converged)break
  }
  rows
}
forma_reliability <- function(fit,args,q,admissible) {
  if(!admissible)return(list(status='inadmissible',scales=list(),pairs=list()))
  if(!forma_simple_cfa(fit))return(list(status='simpleCfa',scales=list(),pairs=list()))
  if(!requireNamespace('semTools',quietly=TRUE))stop('advanced.semTools')
  if(as.character(packageVersion('semTools'))!='0.5.10')stop('advanced.semToolsVersion')
  omega <- semTools::compRelSEM(fit,obs.var=TRUE,tau.eq=FALSE,ord.scale=TRUE,simplify=TRUE)
  ave <- semTools::AVE(fit,obs.var=TRUE,return.df=FALSE)
  if(is.data.frame(omega))omega<-lapply(seq_len(nrow(omega)),function(i)setNames(as.numeric(omega[i,]),names(omega)))else omega<-list(omega)
  if(!is.list(ave))ave<-list(ave)
  cors <- lavaan::lavInspect(fit,'cor.lv');if(!is.list(cors))cors<-list(cors)
  scales<-list();pairs<-list();group_labels<-lavaan::lavInspect(fit,'group.label')
  for(g in seq_along(omega)) {
    factors<-names(omega[[g]])
    for(factor in factors)scales[[length(scales)+1L]]<-list(group=g,groupLabel=if(length(group_labels))group_labels[g]else '',factor=factor,
      omega=forma_number(omega[[g]][factor]),ave=forma_number(ave[[g]][factor]))
    if(length(factors)<2)next
    htmt_error<-NULL
    # Subset the same cleaned sample used by lavaan; ordered data use polychorics.
    ha<-list(model=forma_measurement_syntax(fit,g),missing=q$analysis$missing,ordered=args$ordered,absolute=TRUE,htmt2=TRUE)
    if(!is.null(args$data)) {
      cases<-lavaan::lavInspect(fit,'case.idx');if(!is.list(cases))cases<-list(cases)
      ha$data<-args$data[cases[[g]],,drop=FALSE]
    } else ha$sample.cov<-args$sample.cov
    htmt<-tryCatch(do.call(semTools::htmt,ha),error=function(e){htmt_error<<-conditionMessage(e);NULL})
    for(i in seq_len(length(factors)-1))for(j in seq.int(i+1,length(factors))) {
      a<-factors[i];b<-factors[j];correlation<-forma_number(cors[[g]][a,b]);aa<-forma_number(ave[[g]][a]);bb<-forma_number(ave[[g]][b])
      pairs[[length(pairs)+1L]]<-list(group=g,first=a,second=b,correlation=correlation,
        sqrtAveFirst=if(!is.null(aa)&&aa>=0)sqrt(aa)else NULL,sqrtAveSecond=if(!is.null(bb)&&bb>=0)sqrt(bb)else NULL,
        fornellLarcker=if(!is.null(aa)&&!is.null(bb)&&!is.null(correlation))aa>correlation^2&&bb>correlation^2 else NULL,
        htmt2=if(!is.null(htmt))forma_number(htmt[a,b])else NULL,reason=htmt_error)
    }
  }
  list(status='ok',scales=scales,pairs=pairs,version=as.character(packageVersion('semTools')))
}
forma_measurement_syntax <- function(fit,g) {
  pt<-lavaan::parTable(fit);load<-pt[pt$op=='=~'&pt$group==g,,drop=FALSE]
  paste(vapply(unique(load$lhs),function(f)paste(f,'=~',paste(load$rhs[load$lhs==f],collapse=' + ')),character(1)),collapse='\n')
}
forma_modifications <- function(fit,converged,admissible) {
  if(!converged || !admissible)return(list(status='inadmissible',rows=list()))
  error<-NULL
  mi<-tryCatch(lavaan::modindices(fit,sort.=TRUE),error=function(e){error<<-conditionMessage(e);data.frame()})
  if(nrow(mi))mi<-mi[is.finite(mi$mi)&mi$mi>0&mi$op %in% c('=~','~','~~'),,drop=FALSE]
  list(status=if(is.null(error))'ok'else 'unavailable',message=error,total=nrow(mi),truncated=nrow(mi)>5000,rows=head(mi,5000))
}
forma_bootstrap_summary <- function(fit,settings) {
  if(!settings$bootstrap)return(NULL)
  boot<-lavaan::lavInspect(fit,'boot');failed<-attr(boot,'error.idx');nonadmissible<-attr(boot,'nonadmissible')
  list(requested=settings$bootstrap,completed=nrow(boot),failed=length(failed),nonadmissible=length(nonadmissible),
    seed=settings$seed,confidence=settings$confidence,interval='perc')
}
