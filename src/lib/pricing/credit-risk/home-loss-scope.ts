import type { PricingInput } from "../types";

export function homeLossScope(input: PricingInput): string | null {
  if (!(input.propertyValue > 0) || !(input.loanAmount > 0)) return null;
  const lvr = (input.loanAmount / input.propertyValue) * 100;
  const lvrBand =
    lvr <= 60
      ? "lvr_le_60"
      : lvr <= 80
        ? "lvr_le_80"
        : lvr <= 90
          ? "lvr_le_90"
          : "lvr_over_90";
  return `${input.loanPurpose}_${lvrBand}_${input.eligibleLmi ? "lmi" : "standard"}`;
}
