import type { CustomerScoreModelConfig, PricingInput } from "./types";

export const HOME_SERVICEABILITY_NSI_POLICY_UNAVAILABLE =
  "HOME_SERVICEABILITY_NSI_POLICY_UNAVAILABLE" as const;

export class HomeServiceabilityNsiPolicyUnavailableError extends Error {
  readonly code = HOME_SERVICEABILITY_NSI_POLICY_UNAVAILABLE;

  constructor() {
    super(
      "Serviceability NSI requires a configured income-alternative factor in the selected demonstration policy.",
    );
    this.name = "HomeServiceabilityNsiPolicyUnavailableError";
  }
}

export function homeScoreModelSupportsServiceabilityNsi(
  model: CustomerScoreModelConfig,
): boolean {
  return (
    model.id != null &&
    model.factors.some(
      (factor) =>
        factor.enabled &&
        factor.field === "grossAnnualIncome" &&
        factor.alternativeNumericSources?.some(
          (source) => source.field === "serviceabilityNsi",
        ),
    )
  );
}

export function assertHomeServiceabilityNsiSupported(
  input: Pick<PricingInput, "serviceabilityIncomeMeasure">,
  model: CustomerScoreModelConfig,
): void {
  if (
    input.serviceabilityIncomeMeasure === "serviceability_nsi" &&
    !homeScoreModelSupportsServiceabilityNsi(model)
  ) {
    throw new HomeServiceabilityNsiPolicyUnavailableError();
  }
}
