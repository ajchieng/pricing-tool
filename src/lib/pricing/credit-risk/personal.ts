import { resolvePersonalScoreFacts } from "../personal/score-model";
import type { PersonalPricingInput } from "../personal/types";
import type { CustomerScoreModelConfig } from "../types";
import { calculateRiskOnlyAssessment } from "./risk-subscore";

export const PERSONAL_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "repaymentToSurplusAtBasePct",
  "employmentIncomeStability",
  "monthlySurplus",
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
]);
const PERSONAL_STANDARD_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "creditScore",
  "repaymentToSurplusAtBasePct",
  "employmentIncomeStability",
  "monthlySurplus",
]);
const PERSONAL_RETENTION_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "repaymentToSurplusAtBasePct",
  "monthlySurplus",
  "retentionArrearsHardship18Months",
  "retentionArrearsPast12Months",
]);

export const PERSONAL_RISK_FACT_DERIVATION_VERSION = "personal-risk-facts-v1";
export const PERSONAL_RISK_FACT_DERIVATION_CONFIG = {
  streamInterpretation: {
    standard: [...PERSONAL_STANDARD_CREDIT_RISK_FIELDS].sort(),
    retention: [...PERSONAL_RETENTION_CREDIT_RISK_FIELDS].sort(),
  },
};

export function assessPersonalCreditRisk(
  input: PersonalPricingInput,
  model: CustomerScoreModelConfig,
  baseRate: number,
) {
  const retention = input.customerStream === "retention";
  const eligibleFields = retention
    ? PERSONAL_RETENTION_CREDIT_RISK_FIELDS
    : PERSONAL_STANDARD_CREDIT_RISK_FIELDS;
  return calculateRiskOnlyAssessment({
    facts: resolvePersonalScoreFacts(input, baseRate),
    model,
    productArea: "personal",
    eligibleFields,
    hashEligibleFields: PERSONAL_CREDIT_RISK_FIELDS,
    factDerivationVersion: PERSONAL_RISK_FACT_DERIVATION_VERSION,
    factDerivationConfig: PERSONAL_RISK_FACT_DERIVATION_CONFIG,
  });
}
