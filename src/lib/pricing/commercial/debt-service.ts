import type { CommercialPricingInput } from "./types";

// Annual debt service on the new facility at a given rate. Revolving facilities
// are assessed as fully drawn interest-only. Kept in its own module so both the
// pricing engine (./calculate) and the score model (./score-model) can use it
// without forming an import cycle.
export function annualDebtServiceFor(
  input: Pick<
    CommercialPricingInput,
    "loanAmount" | "loanTermYears" | "repaymentType"
  >,
  annualRatePct: number,
): number {
  const rate = annualRatePct / 100;
  if (
    input.repaymentType !== "principal_and_interest" ||
    !input.loanTermYears
  ) {
    return input.loanAmount * rate;
  }
  const r = rate / 12;
  const n = input.loanTermYears * 12;
  if (r === 0) return input.loanAmount / input.loanTermYears;
  const factor = Math.pow(1 + r, n);
  return ((input.loanAmount * r * factor) / (factor - 1)) * 12;
}
