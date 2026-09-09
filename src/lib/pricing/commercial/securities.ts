import type {
  CommercialPricingInput,
  CommercialSecurityInput,
  CommercialSecurityType,
} from "./types";

type SecuritySource = Pick<
  CommercialPricingInput,
  "securities" | "securityType" | "securityValue"
>;

export interface CommercialSecuritySummary {
  securities: CommercialSecurityInput[];
  primarySecurityType: CommercialSecurityType;
  totalSecurityValue: number | null;
}

function commercialSecuritiesFor(
  input: SecuritySource,
): CommercialSecurityInput[] {
  if (input.securities?.length) return input.securities;
  return [
    {
      type: input.securityType,
      value:
        input.securityType === "unsecured"
          ? null
          : (input.securityValue ?? null),
      description: null,
      isPrimary: true,
    },
  ];
}

export function summariseCommercialSecurities(
  input: SecuritySource,
): CommercialSecuritySummary {
  const securities = commercialSecuritiesFor(input);
  const primary =
    securities.find((security) => security.isPrimary) ?? securities[0];
  if (primary.type === "unsecured") {
    return {
      securities,
      primarySecurityType: "unsecured",
      totalSecurityValue: 0,
    };
  }

  const secured = securities.filter(
    (security) => security.type !== "unsecured",
  );
  const totalSecurityValue = secured.some((security) => security.value == null)
    ? null
    : secured.reduce((total, security) => total + (security.value ?? 0), 0);

  return {
    securities,
    primarySecurityType: primary.type,
    totalSecurityValue,
  };
}
