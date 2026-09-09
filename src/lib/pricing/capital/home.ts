import {
  CAPITAL_REGULATORY_SOURCE,
  type CapitalClassification,
  type CapitalStandardStatus,
} from "./types";

export interface HomeCapitalInput {
  loanAmount: number;
  propertyValue: number;
  loanPurpose: "owner_occupied" | "investment";
  capitalStandardStatus: CapitalStandardStatus;
  eligibleLmi: boolean;
  homeGuaranteeSchemeEligible: boolean;
  riskWeightOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

const OWNER_LMI = [20, 25, 30, 35, 40, 55, 70] as const;
const OWNER_NO_LMI = [20, 25, 30, 35, 50, 70, 85] as const;
const OTHER_LMI = [25, 30, 40, 45, 50, 70, 85] as const;
const OTHER_NO_LMI = [25, 30, 40, 45, 65, 85, 105] as const;

function lvrBand(lvr: number): number {
  if (lvr <= 50) return 0;
  if (lvr <= 60) return 1;
  if (lvr <= 70) return 2;
  if (lvr <= 80) return 3;
  if (lvr <= 90) return 4;
  if (lvr <= 100) return 5;
  return 6;
}

export function classifyHomeCapital(
  input: HomeCapitalInput,
): CapitalClassification {
  const lvr =
    input.propertyValue > 0
      ? (input.loanAmount / input.propertyValue) * 100
      : Number.POSITIVE_INFINITY;
  const provisional = input.capitalStandardStatus === "unconfirmed";
  const isOther = input.loanPurpose !== "owner_occupied";
  const code = isOther
    ? "residential_other_standard"
    : "residential_owner_p_and_i_standard";

  let derivedRiskWeightPct: number;
  let classificationCode = code;
  let classificationLabel = isOther
    ? "Other standard residential property"
    : "Standard owner-occupied P&I residential";

  if (provisional) {
    derivedRiskWeightPct = 100;
    classificationCode = "residential_unconfirmed";
    classificationLabel = "Residential classification unconfirmed";
  } else if (input.capitalStandardStatus === "non_standard") {
    derivedRiskWeightPct = 100;
    classificationCode = "residential_non_standard";
    classificationLabel = "Non-standard residential property";
  } else if (input.homeGuaranteeSchemeEligible) {
    derivedRiskWeightPct = 35;
    classificationCode = "residential_home_guarantee_scheme";
    classificationLabel = "Australian Government Home Guarantee Scheme";
  } else {
    const row = isOther
      ? input.eligibleLmi
        ? OTHER_LMI
        : OTHER_NO_LMI
      : input.eligibleLmi
        ? OWNER_LMI
        : OWNER_NO_LMI;
    derivedRiskWeightPct = row[lvrBand(lvr)];
  }

  const hasOverride = input.riskWeightOverridePct != null;
  return {
    drawnExposure: Math.max(0, input.loanAmount),
    undrawnExposure: 0,
    creditConversionFactorPct: 0,
    riskWeightPct: input.riskWeightOverridePct ?? derivedRiskWeightPct,
    derivedRiskWeightPct,
    classificationCode,
    classificationLabel,
    classificationBasis: hasOverride
      ? "override"
      : provisional
        ? "provisional"
        : "derived",
    classificationConfirmed: hasOverride || !provisional,
    overrideReason: hasOverride
      ? input.capitalOverrideReason?.trim() || null
      : null,
    regulatorySource: CAPITAL_REGULATORY_SOURCE,
    warnings: provisional ? ["capital_classification_unconfirmed"] : [],
  };
}
