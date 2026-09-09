// Fictional demonstration policy values; not lender calibration.
/** Shared tax rate applied to positive quote profit before tax. */
export const PROFITABILITY_TAX_RATE = 0.28;

export const PROFITABILITY_TAX_RATE_PCT = PROFITABILITY_TAX_RATE * 100;

/**
 * Quote overrides are entered and persisted as percentage points while the
 * profitability engine consumes a decimal fraction.
 */
export function resolveProfitabilityTaxRate(
  taxRateOverridePct?: number | null,
): { rate: number; ratePct: number } {
  const ratePct = taxRateOverridePct ?? PROFITABILITY_TAX_RATE_PCT;
  return { rate: ratePct / 100, ratePct };
}
