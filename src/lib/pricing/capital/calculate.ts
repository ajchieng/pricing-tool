import type { CapitalAllocationInput, CapitalAllocationResult } from "./types";

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function finiteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
}

export function calculateCapitalAllocation(
  input: CapitalAllocationInput,
  profitAfterTax: number | null,
): CapitalAllocationResult {
  finiteNonNegative(input.drawnExposure, "Drawn exposure");
  finiteNonNegative(input.undrawnExposure, "Undrawn exposure");
  if (
    !Number.isFinite(input.creditConversionFactorPct) ||
    input.creditConversionFactorPct < 0 ||
    input.creditConversionFactorPct > 100
  ) {
    throw new Error("Credit conversion factor must be between 0 and 100.");
  }
  if (!Number.isFinite(input.riskWeightPct) || input.riskWeightPct <= 0) {
    throw new Error("Risk weight must be positive.");
  }
  if (!Number.isFinite(input.capitalRatioPct) || input.capitalRatioPct <= 0) {
    throw new Error("Capital ratio must be positive.");
  }

  const regulatoryExposure =
    input.drawnExposure +
    input.undrawnExposure * (input.creditConversionFactorPct / 100);
  const riskWeightedAssets = regulatoryExposure * (input.riskWeightPct / 100);
  const allocatedCapital = riskWeightedAssets * (input.capitalRatioPct / 100);
  const returnOnEquity =
    profitAfterTax == null || allocatedCapital <= 0
      ? null
      : round((profitAfterTax / allocatedCapital) * 100);

  return {
    ...input,
    regulatoryExposure: round(regulatoryExposure),
    riskWeightedAssets: round(riskWeightedAssets),
    allocatedCapital: round(allocatedCapital),
    returnOnEquity,
  };
}
