.libPaths(c(normalizePath('../.Rlib'),.libPaths()))
if(!requireNamespace('semTools',quietly=TRUE) || as.character(packageVersion('semTools'))!='0.5.10') install.packages('semTools',repos='https://cloud.r-project.org',lib='../.Rlib',type='source')
cat('semTools',as.character(packageVersion('semTools')),'\n')
