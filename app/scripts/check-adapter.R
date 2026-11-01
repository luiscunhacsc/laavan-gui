.libPaths(c(normalizePath("../.Rlib"),.libPaths()))
suppressPackageStartupMessages(library(lavaan))
suppressPackageStartupMessages(library(jsonlite))
source("src/r/compile.R")
opts <- '{"preset":"sem","groups":1,"fixedX":false,"meanstructure":false}'
efa <- sem_compile('efa("b1")*F1 + efa("b1")*F2 =~ x1 + x2 + x3 + x4', opts)
stopifnot(!efa$ok)
empty <- sem_compile('',opts)
stopifnot(!empty$ok)
bad <- sem_compile('F =~ x1 + *x2',opts)
stopifnot(!bad$ok,grepl('line 1',bad$message))
fixed <- sem_compile('F =~ 1*x1 + x2 + x3',opts)
stopifnot(fixed$ok,!fixed$table$defaultFixed[1],fixed$table$ustart[1]==1)
free <- sem_compile('F =~ NA*x1 + x2 + x3\nF ~~ 1*F',opts)
stopifnot(free$ok,free$table$free[1]>0,!free$table$defaultFixed[1])
label_fixed <- sem_compile('F =~ marker*1*x1 + x2 + x3',opts)
stopifnot(label_fixed$ok,label_fixed$table$label[1]=="marker",label_fixed$table$ustart[1]==1)
cat('PASS: unsupported EFA, empty and malformed models; explicit fixed and free markers.\n')

path_opts <- '{"preset":"path","groups":1,"fixedX":false,"meanstructure":false}'
fixtures <- jsonlite::fromJSON("../fixtures/models.json", simplifyVector = FALSE)
for (fixture in fixtures) {
  if (!fixture$id %in% c("03-mediation", "06-observed-path")) next
  path <- sem_compile(fixture$syntax, path_opts)
  sem <- sem_compile(fixture$syntax, opts)
  stopifnot(path$ok, sem$ok, length(path$latent) == 0,
    path$options$preset == "path", identical(path$table, sem$table))
}
for (syntax in c('F =~ x1 + x2 + x3', 'C <~ x1 + x2 + x3')) {
  path <- sem_compile(syntax, path_opts)
  stopifnot(!path$ok, identical(path$message, "model.pathLatent"))
}
cat('PASS: path mediation and observed models match SEM tables; latent and composite definitions rejected.\n')
