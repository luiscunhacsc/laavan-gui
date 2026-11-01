# Forma analysis; lavaan 0.7.3
# R version 4.4.3 (2025-02-28 ucrt)
# Place the original source file in the working directory.
library(lavaan)

data <- lavaan::HolzingerSwineford1939


fit <- cfa(
  model = "visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9",
  data = data,
  estimator = "MLR",
  missing = "listwise",
  fixed.x = FALSE,
  meanstructure = TRUE,
  group = "school"
)
summary(fit, fit.measures = TRUE, standardized = TRUE, rsquare = TRUE)
parameterEstimates(fit, standardized = TRUE, level = 0.95, boot.ci.type = "perc")
modindices(fit, sort. = TRUE)

# semTools 0.5.10; observed-variance denominator; HTMT2 uses absolute correlations
semTools::compRelSEM(fit, obs.var = TRUE, tau.eq = FALSE, ord.scale = TRUE, simplify = TRUE)
semTools::AVE(fit, obs.var = TRUE, return.df = FALSE)
cases <- lavInspect(fit, "case.idx")
if (!is.list(cases)) cases <- list(cases)
lapply(cases, function(i) semTools::htmt("visual =~ x1 + x2 + x3\ntextual =~ x4 + x5 + x6\nspeed =~ x7 + x8 + x9", data = data[i, , drop = FALSE], missing = "listwise", absolute = TRUE, htmt2 = TRUE))

configural <- fit
metric <- update(fit, group.equal = "loadings")
scalar <- update(fit, group.equal = c("loadings", "intercepts"))
strict <- update(fit, group.equal = c("loadings", "intercepts", "residuals"))
lavTestLRT(configural, metric, scalar, strict)
sapply(list(configural, metric, scalar, strict), fitMeasures)
