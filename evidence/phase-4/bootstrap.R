# Forma analysis; lavaan 0.7.3
# R version 4.4.3 (2025-02-28 ucrt)
# Place the original source file in the working directory.
library(lavaan)

i <- seq_len(400)
X <- sin(i*.37) + cos(i*.11)
M <- .6*X + sin(i*.71) + .4*cos(i*.17)
Y <- .45*M + .2*X + cos(i*.53) + .2*sin(i*.29)
data <- data.frame(X, M, Y)

set.seed(12345)

fit <- sem(
  model = "M ~ a*X\nY ~ b*M + cp*X\nind := a*b\ntotal := cp + ind",
  data = data,
  estimator = "ML",
  missing = "listwise",
  fixed.x = FALSE,
  meanstructure = FALSE,
  se = "bootstrap",
  bootstrap = 100
)
summary(fit, fit.measures = TRUE, standardized = TRUE, rsquare = TRUE)
parameterEstimates(fit, standardized = TRUE, level = 0.95, boot.ci.type = "perc")
