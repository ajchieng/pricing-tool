import { resolveHomeLoanScoreFacts } from "../customer-score";
import type { CustomerScoreModelConfig, PricingInput } from "../types";
import { calculateRiskOnlyAssessment } from "./risk-subscore";

const HOME_V1_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "dtiRatio",
  "grossAnnualIncome",
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
]);
const HOME_V1_STANDARD_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "dtiRatio",
  "grossAnnualIncome",
]);
const HOME_RETENTION_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
]);
const HOME_V1_RISK_FACT_DERIVATION_CONFIG = {
  streamInterpretation: {
    standard: [...HOME_V1_STANDARD_CREDIT_RISK_FIELDS].sort(),
    retention: [...HOME_RETENTION_CREDIT_RISK_FIELDS].sort(),
  },
};

export const HOME_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "dtiRatio",
  "grossAnnualIncome",
  "serviceabilityNsi",
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
]);
const HOME_STANDARD_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "dtiRatio",
  "grossAnnualIncome",
  "serviceabilityNsi",
]);
export const HOME_RISK_FACT_DERIVATION_VERSION = "home-risk-facts-v2";
export const HOME_RISK_FACT_DERIVATION_CONFIG = {
  streamInterpretation: {
    standard: [...HOME_STANDARD_CREDIT_RISK_FIELDS].sort(),
    retention: [...HOME_RETENTION_CREDIT_RISK_FIELDS].sort(),
  },
};

export function homeRiskContract(model: CustomerScoreModelConfig) {
  const supportsNsi = model.factors.some(
    (factor) =>
      factor.field === "grossAnnualIncome" &&
      factor.alternativeNumericSources?.some(
        (source) => source.field === "serviceabilityNsi",
      ),
  );
  return supportsNsi
    ? {
        eligibleFields: HOME_CREDIT_RISK_FIELDS,
        standardEligibleFields: HOME_STANDARD_CREDIT_RISK_FIELDS,
        factDerivationVersion: HOME_RISK_FACT_DERIVATION_VERSION,
        factDerivationConfig: HOME_RISK_FACT_DERIVATION_CONFIG,
      }
    : {
        eligibleFields: HOME_V1_CREDIT_RISK_FIELDS,
        standardEligibleFields: HOME_V1_STANDARD_CREDIT_RISK_FIELDS,
        factDerivationVersion: "home-risk-facts-v1",
        factDerivationConfig: HOME_V1_RISK_FACT_DERIVATION_CONFIG,
      };
}

export function assessHomeCreditRisk(
  input: PricingInput,
  model: CustomerScoreModelConfig,
) {
  const retention = input.customerStream === "retention";
  const contract = homeRiskContract(model);
  const requiredFactFields = retention
    ? HOME_RETENTION_CREDIT_RISK_FIELDS
    : new Set([
        "creditScore",
        "dtiRatio",
        input.serviceabilityIncomeMeasure === "serviceability_nsi"
          ? "serviceabilityNsi"
          : "grossAnnualIncome",
      ]);
  return calculateRiskOnlyAssessment({
    facts: resolveHomeLoanScoreFacts(input),
    model,
    productArea: "home",
    eligibleFields: retention
      ? HOME_RETENTION_CREDIT_RISK_FIELDS
      : contract.standardEligibleFields,
    hashEligibleFields: contract.eligibleFields,
    requiredFactFields,
    factDerivationVersion: contract.factDerivationVersion,
    factDerivationConfig: contract.factDerivationConfig,
  });
}
