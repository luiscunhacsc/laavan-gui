.libPaths(c(normalizePath('.Rlib'), .libPaths()))
packages <- c('readxl', 'haven', 'writexl', 'lavaan', 'jsonlite')
print(vapply(packages, requireNamespace, logical(1), quietly = TRUE))
missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) install.packages(missing, lib = '.Rlib', repos = 'https://cloud.r-project.org', type = 'binary')
stopifnot(all(vapply(packages, requireNamespace, logical(1), quietly = TRUE)))
dir.create('evidence/phase-2', recursive = TRUE, showWarnings = FALSE)
writeLines(jsonlite::toJSON(as.list(vapply(packages, function(p) as.character(packageVersion(p)), character(1))), auto_unbox = TRUE, pretty = TRUE), 'evidence/phase-2/native-packages.json')
