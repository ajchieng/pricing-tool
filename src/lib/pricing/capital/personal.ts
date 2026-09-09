import { CAPITAL_REGULATORY_SOURCE, type CapitalClassification } from "./types";

export interface PersonalCapitalInput {
  loanAmount: number;
  riskWeightOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

export function classifyPersonalCapital(
  input: PersonalCapitalInput,
): CapitalClassification {
  const derivedRiskWeightPct = 100;
  const hasOverride = input.riskWeightOverridePct != null;
  return {
    drawnExposure: Math.max(0, input.loanAmount),
    undrawnExposure: 0,
    creditConversionFactorPct: 0,
    riskWeightPct: input.riskWeightOverridePct ?? derivedRiskWeightPct,
    derivedRiskWeightPct,
    classificationCode: "retail_other",
    classificationLabel: "Other retail exposure",
    classificationBasis: hasOverride ? "override" : "derived",
    classificationConfirmed: true,
    overrideReason: hasOverride
      ? input.capitalOverrideReason?.trim() || null
      : null,
    regulatorySource: CAPITAL_REGULATORY_SOURCE,
    warnings: [],
  };
}
