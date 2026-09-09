import { summariseCommercialSecurities } from "../commercial/securities";
import type { CommercialPricingInput } from "../commercial/types";

export type CommercialLossScopeResult =
  | { status: "calculated"; lossScope: string }
  | {
      status: "incomplete_inputs";
      lossScope: null;
      technicalReason: string;
    };

export function commercialLossScope(
  input: CommercialPricingInput,
): CommercialLossScopeResult {
  const security = summariseCommercialSecurities(input);
  if (security.primarySecurityType === "unsecured") {
    return { status: "calculated", lossScope: "unsecured" };
  }
  if (security.totalSecurityValue == null) {
    return {
      status: "incomplete_inputs",
      lossScope: null,
      technicalReason:
        "Complete security values are required for Commercial LGD.",
    };
  }
  if (security.primarySecurityType === "cash_deposits") {
    return { status: "calculated", lossScope: "cash_secured" };
  }
  const coverage = security.totalSecurityValue / input.loanAmount;
  return {
    status: "calculated",
    lossScope:
      coverage >= 1.5
        ? "coverage_ge_1_5"
        : coverage >= 1
          ? "coverage_ge_1"
          : coverage >= 0.5
            ? "coverage_ge_0_5"
            : "coverage_lt_0_5",
  };
}
