import {
  CAPITAL_REGULATORY_SOURCE,
  type CapitalAllocationResult,
  type CapitalClassificationBasis,
} from "./types";

type ProfitabilitySnapshot = {
  calculationSnapshot?: unknown;
  regulatoryExposureAmount?: number | null;
  drawnExposureAmount?: number | null;
  undrawnExposureAmount?: number | null;
  creditConversionFactorPct?: number | null;
  riskWeightPct?: number | null;
  riskWeightedAssetsAmount?: number | null;
  capitalRatioPct?: number | null;
  allocatedCapitalAmount?: number | null;
  returnOnEquityPct?: number | null;
  capitalClassificationCode?: string | null;
  capitalClassificationLabel?: string | null;
  capitalClassificationBasis?: string | null;
  capitalClassificationConfirmed?: boolean | null;
  capitalOverrideReason?: string | null;
};

function objectValue(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function capitalAllocationFromSnapshot(
  row: ProfitabilitySnapshot | null | undefined,
): CapitalAllocationResult | null {
  if (!row) return null;

  const calculation = objectValue(row.calculationSnapshot);
  const savedCapital = objectValue(calculation?.capitalAllocation);
  if (savedCapital) return savedCapital as unknown as CapitalAllocationResult;

  if (
    row.regulatoryExposureAmount == null ||
    row.drawnExposureAmount == null ||
    row.undrawnExposureAmount == null ||
    row.creditConversionFactorPct == null ||
    row.riskWeightPct == null ||
    row.riskWeightedAssetsAmount == null ||
    row.capitalRatioPct == null ||
    row.allocatedCapitalAmount == null ||
    !row.capitalClassificationCode ||
    !row.capitalClassificationLabel
  ) {
    return null;
  }

  const basis = ["derived", "provisional", "override"].includes(
    row.capitalClassificationBasis ?? "",
  )
    ? (row.capitalClassificationBasis as CapitalClassificationBasis)
    : "provisional";

  return {
    drawnExposure: row.drawnExposureAmount,
    undrawnExposure: row.undrawnExposureAmount,
    creditConversionFactorPct: row.creditConversionFactorPct,
    riskWeightPct: row.riskWeightPct,
    derivedRiskWeightPct: row.riskWeightPct,
    classificationCode: row.capitalClassificationCode,
    classificationLabel: row.capitalClassificationLabel,
    classificationBasis: basis,
    classificationConfirmed: row.capitalClassificationConfirmed ?? false,
    overrideReason: row.capitalOverrideReason ?? null,
    regulatorySource: CAPITAL_REGULATORY_SOURCE,
    warnings: [],
    capitalRatioPct: row.capitalRatioPct,
    regulatoryExposure: row.regulatoryExposureAmount,
    riskWeightedAssets: row.riskWeightedAssetsAmount,
    allocatedCapital: row.allocatedCapitalAmount,
    returnOnEquity: row.returnOnEquityPct ?? null,
  };
}
