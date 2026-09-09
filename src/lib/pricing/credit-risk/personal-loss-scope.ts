import type { PersonalPricingInput } from "../personal/types";

export function personalLossScope(input: PersonalPricingInput): string {
  return input.securityType === "unsecured" ? "unsecured" : "secured";
}
