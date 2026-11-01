.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
model <- 'visual =~ x1+x2+x3
textual =~ x4+x5+x6
speed =~ x7+x8+x9'
fit <- lavaan::cfa(model,data=lavaan::HolzingerSwineford1939,group='school')
str(semTools::compRelSEM(fit,simplify=TRUE))
single<-lavaan::cfa(model,data=lavaan::HolzingerSwineford1939)
str(semTools::compRelSEM(single,simplify=TRUE))
str(semTools::AVE(fit,return.df=FALSE))
str(lavaan::lavInspect(fit,'sampstat'))
