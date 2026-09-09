import {
  CAPITAL_REGULATORY_SOURCE,
  type CapitalClassification,
  type CapitalStandardStatus,
  type CommercialCapitalExposureClass,
} from "./types";

export interface CommercialCapitalInput {
  facilityType:
    "term_loan" | "overdraft" | "equipment_finance" | "commercial_property";
  loanAmount: number;
  currentDrawnBalance: number | null;
  annualRevenue: number | null;
  otherLenderExposure: number | null;
  securityValue: number | null;
  apsExposureClass: CommercialCapitalExposureClass;
  capitalClassificationConfirmed: boolean;
  capitalPropertyStandardStatus: CapitalStandardStatus | null;
  capitalPropertyCashFlowDependent: boolean | null;
  riskWeightOverridePct?: number | null;
  creditConversionFactorOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

const LABELS: Record<CommercialCapitalExposureClass, string> = {
  sme_retail: "SME retail exposure",
  sme_corporate: "SME corporate exposure",
  general_corporate: "Other unrated general corporate exposure",
  commercial_property_dependent:
    "Commercial property dependent on property cash flows",
  specialised_project_finance: "Unrated specialised project finance",
  specialised_object_or_commodities_finance:
    "Unrated specialised object or commodities finance",
};

function commercialPropertyRiskWeight(input: CommercialCapitalInput): number {
  if (input.capitalPropertyStandardStatus !== "confirmed_standard") return 150;
  const lvr =
    input.securityValue != null && input.securityValue > 0
      ? (input.loanAmount / input.securityValue) * 100
      : Number.POSITIVE_INFINITY;
  if (lvr <= 60) return 70;
  if (lvr <= 80) return 90;
  return 110;
}

function riskWeightFor(input: CommercialCapitalInput): number {
  switch (input.apsExposureClass) {
    case "sme_retail":
      return 75;
    case "sme_corporate":
      return 85;
    case "general_corporate":
      return 100;
    case "specialised_project_finance":
      return 110;
    case "specialised_object_or_commodities_finance":
      return 100;
    case "commercial_property_dependent":
      return commercialPropertyRiskWeight(input);
  }
}

export function classifyCommercialCapital(
  input: CommercialCapitalInput,
): CapitalClassification {
  const isOverdraft = input.facilityType === "overdraft";
  const drawnExposure = isOverdraft
    ? Math.max(0, input.currentDrawnBalance ?? 0)
    : Math.max(0, input.loanAmount);
  const undrawnExposure = isOverdraft
    ? Math.max(0, input.loanAmount - drawnExposure)
    : 0;
  const derivedCcf = isOverdraft ? 40 : 0;
  const provisional = !input.capitalClassificationConfirmed;
  const derivedRiskWeightPct = provisional
    ? input.apsExposureClass === "commercial_property_dependent"
      ? 150
      : 100
    : riskWeightFor(input);
  const hasOverride =
    input.riskWeightOverridePct != null ||
    input.creditConversionFactorOverridePct != null;

  return {
    drawnExposure,
    undrawnExposure,
    creditConversionFactorPct:
      input.creditConversionFactorOverridePct ?? derivedCcf,
    riskWeightPct: input.riskWeightOverridePct ?? derivedRiskWeightPct,
    derivedRiskWeightPct,
    classificationCode: input.apsExposureClass,
    classificationLabel: LABELS[input.apsExposureClass],
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
