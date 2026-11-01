.libPaths(c(normalizePath('.Rlib'),.libPaths()))
dir.create('fixtures/data',recursive=TRUE,showWarnings=FALSE)
write.csv(lavaan::HolzingerSwineford1939,'fixtures/data/holzinger.csv',row.names=FALSE,na='')
write.csv(lavaan::PoliticalDemocracy,'fixtures/data/democracy.csv',row.names=FALSE,na='')
i <- seq_len(400); X <- sin(i*.37)+cos(i*.11)
M <- .6*X+sin(i*.71)+.4*cos(i*.17); Y <- .45*M+.2*X+cos(i*.53)+.2*sin(i*.29)
write.csv(data.frame(X,M,Y),'fixtures/data/mediation.csv',row.names=FALSE,na='')
labelled_mediation <- data.frame(X,M,Y)
labelled_mediation$X <- haven::labelled(X,labels=c(Low=min(X),High=max(X)),label='Predictor X')
haven::write_sav(labelled_mediation,'fixtures/data/mediation-labelled.sav')
mixed <- data.frame(age=c(18,19,NA,21,22), satisfaction=c(1,2,9,3,2),
  city=c('Lisboa','Porto','Coimbra','\u00c9vora','Braga'),check.names=FALSE)
mixed$satisfaction <- haven::labelled_spss(mixed$satisfaction,
  labels=c(Low=1,Medium=2,High=3,Declined=9),na_values=9,label='Course satisfaction')
attr(mixed$age,'label') <- 'Age in years'
haven::write_sav(mixed,'fixtures/data/labelled.sav')
writexl::write_xlsx(list(Participants=as.data.frame(lapply(mixed,function(x) if(is.numeric(x))as.numeric(x)else x)),
  Mediation=data.frame(X,M,Y)), 'fixtures/data/workbook.xlsx')
write.csv(as.data.frame(lapply(mixed,function(x) if(is.numeric(x))as.numeric(x)else x)), 'fixtures/data/mixed.csv',row.names=FALSE,na='')
large <- as.data.frame(lapply(1:14,function(j)round(sin(seq_len(5000)*j*.017)+j,6)))
names(large) <- paste0('v',1:14)
write.csv(large,'fixtures/data/large.csv',row.names=FALSE)
ordinal <- lavaan::HolzingerSwineford1939[paste0('x',1:9)]
ordinal[] <- lapply(ordinal,function(x)as.integer(cut(x,breaks=unique(quantile(x,seq(0,1,length.out=5))),include.lowest=TRUE)))
write.csv(ordinal,'fixtures/data/ordinal.csv',row.names=FALSE)
missing <- data.frame(X,M,Y); missing$M[seq(1,400,10)] <- NA; missing$Y[seq(3,400,13)] <- NA
write.csv(missing,'fixtures/data/missing.csv',row.names=FALSE,na='')
cat('Created public/synthetic Phase 2 import fixtures.\n')
