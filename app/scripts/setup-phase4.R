.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
if(!requireNamespace('semTools',quietly=TRUE)) install.packages('semTools',repos='https://cloud.r-project.org',lib='../.Rlib')
cat('semTools',as.character(packageVersion('semTools')),'\n')
