# Semantic editing and formatting only. lavaan remains the sole syntax parser.
forma_parse_spec <- function(text) {
  if (!nzchar(trimws(text))) return(list(rows=list(), constraints=list()))
  raw <- lavaan::lavParseModelString(text,as_data_frame=TRUE)
  if (any(raw$block!=1L)) stop('edit.blocks')
  modifiers <- attr(raw,'modifiers')
  rows <- lapply(seq_len(nrow(raw)),function(i) list(lhs=raw$lhs[i],op=raw$op[i],rhs=raw$rhs[i],
    modifiers=if(raw$mod.idx[i]>0) modifiers[[raw$mod.idx[i]]] else list()))
  if (any(vapply(rows,function(r) any(!names(r$modifiers) %in% c('fixed','start','lower','upper','label','prior')),logical(1)))) stop('edit.modifier')
  constraints <- attr(raw,'constraints')
  # Positional references can change their meaning after table reordering.
  values <- c(unlist(lapply(rows,function(r)r$modifiers$label)),unlist(lapply(constraints,function(r)c(r$lhs,r$rhs))))
  if (any(grepl('\\.p[0-9]+\\.|[=~]',values))) stop('edit.positional')
  list(rows=rows,constraints=constraints)
}
forma_atom <- function(x) {
  if (is.na(x)) 'NA' else if (is.character(x)) encodeString(x,quote='"') else format(x,digits=17,trim=TRUE,scientific=FALSE)
}
forma_vector <- function(x) {
  if(length(x)==1) forma_atom(x) else paste0('c(',paste(vapply(x,forma_atom,character(1)),collapse=', '),')')
}
forma_format_spec <- function(spec,headings=NULL) {
  if(is.null(headings))headings <- c(measurement='Measurement model',structural='Structural model',covariance='Variances and covariances',means='Means and thresholds',definitions='Defined parameters',constraints='Constraints')
  section <- function(op) if(op %in% c('=~','<~'))'measurement' else if(op=='~')'structural' else if(op=='~~')'covariance' else 'means'
  grouped <- setNames(vector('list',6),c('measurement','structural','covariance','means','definitions','constraints'))
  for(row in spec$rows) {
    mods <- row$modifiers
    parts <- vapply(names(mods),function(name) {
      value <- forma_vector(mods[[name]])
      if(name %in% c('fixed','label')) value else paste0(name,'(',value,')')
    },character(1))
    rhs <- if(row$op=='~1') '1' else row$rhs
    op <- if(row$op=='~1') '~' else row$op
    # lavaan represents an unmeasured latent's `F =~ 0` as a fixed-zero self row.
    phantom <- row$op=='=~' && row$lhs==row$rhs && length(mods$fixed) && all(!is.na(mods$fixed)&mods$fixed==0)
    line <- if(phantom)paste(row$lhs,'=~ 0') else paste(row$lhs,op,paste0(if(length(parts))paste0(paste(parts,collapse='*'),'*')else'',rhs))
    key <- section(row$op);grouped[[key]] <- c(grouped[[key]],line)
  }
  for(row in spec$constraints) {
    key <- if(row$op==':=')'definitions' else 'constraints'
    grouped[[key]] <- c(grouped[[key]],paste(row$lhs,row$op,row$rhs))
  }
  paste(vapply(names(grouped)[lengths(grouped)>0],function(key)paste0('# ',headings[[key]],'\n',paste(grouped[[key]],collapse='\n')),character(1)),collapse='\n\n')
}
forma_semantic_signature <- function(model,provenance=TRUE) {
  pt <- model$table
  scalar <- function(x)ifelse(is.na(x),'NA',as.character(x))
  # Free parameter IDs and row IDs are ordering details; sharing partitions matter.
  keys <- paste(pt$lhs,pt$op,pt$rhs,pt$group,sep='\r')
  free_key <- vapply(seq_len(nrow(pt)),function(i)if(pt$free[i]==0)'' else paste(sort(keys[pt$free==pt$free[i]],method='radix'),collapse=';'),character(1))
  fields <- list(lhs=pt$lhs,op=pt$op,rhs=pt$rhs,group=pt$group,free=pt$free>0,ustart=scalar(pt$ustart),label=pt$label,exo=pt$exo,sharing=free_key)
  for(name in c('lower','upper','prior')) if(name %in% names(pt)) fields[[name]] <- scalar(pt[[name]])
  if(provenance){fields$origin<-pt$origin;fields$defaultFixed<-pt$defaultFixed}
  values <- do.call(paste,c(fields,sep='\t'))
  sort(values,method='radix')
}
forma_compile_spec <- function(spec,opts,headings=NULL) {
  text <- forma_format_spec(spec,headings)
  if(!nzchar(text))return(list(syntax='',model=NULL))
  model <- sem_compile(text,jsonlite::toJSON(opts,auto_unbox=TRUE))
  if(!model$ok)stop(model$message)
  list(syntax=text,model=model)
}
forma_check_roundtrip <- function(text,opts,headings=NULL) {
  original <- sem_compile(text,jsonlite::toJSON(opts,auto_unbox=TRUE))
  if(!original$ok)stop(original$message)
  spec <- forma_parse_spec(text);result <- forma_compile_spec(spec,opts,headings)
  if(!identical(forma_semantic_signature(original),forma_semantic_signature(result$model)))stop('edit.roundtrip')
  list(spec=spec,model=original,syntax=result$syntax)
}
forma_check_name <- function(name) {
  if(is.null(name)||!is.character(name)||length(name)!=1||!nzchar(name)||nchar(name)>100||grepl('[\n\r#;]',name))stop('edit.name')
  parsed <- tryCatch(lavaan::lavParseModelString(paste(name,'~~',name),as_data_frame=TRUE),error=function(e)NULL)
  if(is.null(parsed)||nrow(parsed)!=1||parsed$lhs!=name||parsed$rhs!=name||parsed$op!='~~'||parsed$mod.idx!=0)stop('edit.name')
  name
}
forma_labels <- function(spec) unique(c(unlist(lapply(spec$rows,function(r)r$modifiers$label)),vapply(Filter(function(r)r$op==':=',spec$constraints),`[[`,character(1),'lhs')))
forma_validate_expressions <- function(spec) {
  labels <- forma_labels(spec)
  for(row in spec$constraints) {
    vars <- tryCatch(all.vars(parse(text=paste0('(',row$lhs,')+(',row$rhs,')'))),error=function(e)stop('edit.expression'))
    if(row$op==':=')vars <- setdiff(vars,row$lhs)
    if(length(setdiff(vars,labels)))stop('edit.dependencies')
  }
}
forma_row_index <- function(spec,lhs,op,rhs) which(vapply(spec$rows,function(r)r$lhs==lhs&&r$op==op&&r$rhs==rhs,logical(1)))
forma_preserve_variables <- function(spec,observed,latent,removed=character()) {
  present <- unique(unlist(lapply(spec$rows,function(r)c(r$lhs,if(r$op %in% c('~1','|','~*~'))NULL else r$rhs))))
  for(name in setdiff(latent,removed))if(!any(vapply(spec$rows,function(r)r$lhs==name&&r$op %in% c('=~','<~'),logical(1))))spec$rows <- c(spec$rows,list(list(lhs=name,op='=~',rhs=name,modifiers=list(fixed=0))))
  for(name in setdiff(observed,c(present,removed)))spec$rows <- c(spec$rows,list(list(lhs=name,op='~~',rhs=name,modifiers=list())))
  spec
}
forma_edit <- function(q) {
  opts <- q$options
  checked <- if(nzchar(trimws(q$text)))forma_check_roundtrip(q$text,opts,q$headings) else list(spec=list(rows=list(),constraints=list()),model=NULL)
  spec <- checked$spec;model <- checked$model;command <- q$command
  observed <- unlist(model$observed,use.names=FALSE);latent <- unlist(model$latent,use.names=FALSE)
  names <- c(observed,latent);removed <- character()
  kind <- command$kind
  if(kind=='format')return(c(list(ok=TRUE),forma_compile_spec(spec,opts,q$headings)))
  if(kind %in% c('observed','latent')) {
    name <- forma_check_name(command$name)
    if(name %in% names)stop('edit.duplicate')
    if(kind=='latent'&&opts$preset=='path')stop('model.pathLatent')
    spec$rows <- c(spec$rows,list(list(lhs=name,op=if(kind=='latent')'=~'else'~~',rhs=name,modifiers=if(kind=='latent')list(fixed=0)else list())))
  } else if(kind=='connect') {
    from <- command$from;to <- command$to;relation <- command$relation
    if(!all(c(from,to) %in% names)||from==to)stop('edit.endpoints')
    if(!relation %in% c('regression','loading','covariance','formative'))stop('edit.command')
    if(relation=='loading'&&!from %in% latent)stop('edit.loadingSource')
    if(relation=='formative'&&!to %in% latent)stop('edit.formativeTarget')
    op <- switch(relation,regression='~',loading='=~',covariance='~~',formative='<~')
    lhs <- if(relation %in% c('regression','formative'))to else from;rhs <- if(relation %in% c('regression','formative'))from else to
    if(length(forma_row_index(spec,lhs,op,rhs))||(op=='~~'&&length(forma_row_index(spec,rhs,op,lhs))))stop('edit.exists')
    if(op %in% c('=~','<~'))spec$rows <- Filter(function(r)!(r$lhs==lhs&&r$op=='=~'&&r$rhs==lhs&&length(r$modifiers$fixed)&&all(r$modifiers$fixed==0)),spec$rows)
    # An implicit covariance is an existing parameter, not a new duplicate row.
    existing <- if(is.null(model))integer()else which(model$table$op==op&((model$table$lhs==lhs&model$table$rhs==rhs)|(op=='~~'&model$table$lhs==rhs&model$table$rhs==lhs)))
    if(length(existing)&&all(model$table$origin[existing]=='implicit'))stop('edit.implicitExists')
    spec$rows <- c(spec$rows,list(list(lhs=lhs,op=op,rhs=rhs,modifiers=list())))
  } else if(kind %in% c('parameter','removeParameter')) {
    row <- model$table[model$table$id==as.integer(command$id),,drop=FALSE]
    if(nrow(row)!=1||!row$op %in% c('=~','<~','~','~~','~1','|','~*~'))stop('edit.parameter')
    lhs <- row$lhs;op <- row$op;rhs <- row$rhs
    index <- forma_row_index(spec,lhs,op,rhs)
    if(!length(index)&&op=='~~')index <- forma_row_index(spec,rhs,op,lhs)
    matches <- model$table[model$table$lhs==lhs&model$table$op==op&model$table$rhs==rhs,,drop=FALSE]
    if(kind=='removeParameter'&&op!='~~') {
      if(length(index))spec$rows <- spec$rows[-index]
    } else {
      if(any(matches$exo==1&matches$free==0&is.na(matches$ustart)))stop('edit.fixedX')
      if(!length(index)) {
        # Materialise the implicit parameter with each group's current state.
        fixed <- ifelse(matches$free>0,NA_real_,matches$ustart)
        spec$rows <- c(spec$rows,list(list(lhs=lhs,op=op,rhs=rhs,modifiers=list(fixed=fixed))))
        index <- length(spec$rows)
      }
      if(length(index)!=1)stop('edit.ambiguous')
      entry <- spec$rows[[index]];g <- as.integer(row$group);ng <- as.integer(opts$groups)
      all_groups <- isTRUE(command$allGroups)
      target <- if(all_groups)seq_len(ng)else g
      mode <- if(kind=='removeParameter')'fixed'else command$mode
      if(!mode %in% c('free','fixed','default'))stop('edit.parameter')
      if(mode=='default') {
        # Restoring defaults removes the override only; it never erases another group.
        if(!all_groups&&ng>1)stop('edit.defaultGroups')
        entry$modifiers$fixed <- NULL
      } else {
        fixed <- if(!is.null(entry$modifiers$fixed))rep(entry$modifiers$fixed,length.out=ng) else ifelse(matches$free>0,NA_real_,matches$ustart)
        value <- if(kind=='removeParameter')0 else if(mode=='free')NA_real_ else as.numeric(command$value)
        if(mode=='fixed'&&(length(value)!=1||!is.finite(value)))stop('edit.value')
        fixed[target] <- value;entry$modifiers$fixed <- if(ng==1)fixed[1]else fixed
      }
      if(kind=='parameter'&&!is.null(command$label)) {
        label <- command$label
        if(length(label)!=1||nchar(label)>100||grepl('[\n\r]',label))stop('edit.label')
        labels <- if(!is.null(entry$modifiers$label))rep(entry$modifiers$label,length.out=ng)else rep('',ng)
        labels[target] <- label
        entry$modifiers$label <- if(all(labels==''))NULL else if(ng==1)labels[1]else labels
      }
      spec$rows[[index]] <- entry
    }
  } else if(kind %in% c('rename','removeVariable')) {
    old <- command$name
    if(!old %in% names)stop('edit.variable')
    if(kind=='rename') {
      new <- forma_check_name(command$newName)
      if(new!=old&&new %in% names)stop('edit.duplicate')
      spec$rows <- lapply(spec$rows,function(r){if(r$lhs==old)r$lhs<-new;if(r$rhs==old&&r$op %in% c('=~','<~','~','~~'))r$rhs<-new;r})
      observed[observed==old]<-new;latent[latent==old]<-new
    } else {
      spec$rows <- Filter(function(r)r$lhs!=old&&!(r$op %in% c('=~','<~','~','~~')&&r$rhs==old),spec$rows)
      removed <- old
    }
  } else stop('edit.command')
  spec <- forma_preserve_variables(spec,observed,latent,removed)
  forma_validate_expressions(spec)
  result <- forma_compile_spec(spec,opts,q$headings)
  if(!is.null(result$model)) {
    # Verify the formatter itself on every candidate, including modifiers and provenance.
    again <- forma_check_roundtrip(result$syntax,opts,q$headings)
    if(!identical(forma_semantic_signature(result$model),forma_semantic_signature(again$model)))stop('edit.roundtrip')
    if(kind=='parameter') {
      target_rows <- result$model$table[result$model$table$lhs==lhs&result$model$table$op==op&result$model$table$rhs==rhs,,drop=FALSE]
      selected <- target_rows[target_rows$group %in% target,,drop=FALSE]
      if(mode=='free'&&any(selected$free==0))stop('edit.verification')
      if(mode=='fixed'&&any(selected$free!=0|is.na(selected$ustart)|selected$ustart!=value))stop('edit.verification')
      if(!is.null(command$label)&&any(selected$label!=command$label))stop('edit.verification')
    }
  }
  c(list(ok=TRUE),result)
}
