import { resolveCommercialScoreFacts } from "../commercial/score-model";
import type { CommercialPricingInput } from "../commercial/types";
import type { CustomerScoreModelConfig } from "../types";
import { calculateRiskOnlyAssessment } from "./risk-subscore";

export const COMMERCIAL_CREDIT_RISK_FIELDS: ReadonlySet<string> = new Set([
  "businessRiskGrade",
  "dscrAtBase",
  "industryCategory",
  "yearsTrading",
  "annualRevenue",
  "financialsQuality",
  "financialsAgeMonths",
  "revenueTrend",
  "profitTrend",
  "taxStatus",
  "largestCustomerRevenueAboveThreshold",
]);

export const COMMERCIAL_RISK_FACT_DERIVATION_VERSION =
  "commercial-risk-facts-v1";

export function assessCommercialCreditRisk(
  input: CommercialPricingInput,
  model: CustomerScoreModelConfig,
  baseRate: number,
  customerConcentrationThresholdPct: number,
) {
  return calculateRiskOnlyAssessment({
    facts: resolveCommercialScoreFacts(
      input,
      baseRate,
      customerConcentrationThresholdPct,
    ),
    model,
    productArea: "commercial",
    eligibleFields: COMMERCIAL_CREDIT_RISK_FIELDS,
    factDerivationVersion: COMMERCIAL_RISK_FACT_DERIVATION_VERSION,
    factDerivationConfig: {},
  });
}
