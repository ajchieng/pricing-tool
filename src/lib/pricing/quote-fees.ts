export type QuoteFeeVertical = "home" | "personal" | "commercial";

export type QuoteFeeSettingConfig = {
  standardUpfrontFee: number;
  monthlyFee: number;
  configured: boolean;
};

export type QuoteFeeIncome = {
  standardUpfrontFee: number;
  chargedUpfrontFee: number;
  upfrontFeeOverride: number | null;
  upfrontFeeOverridden: boolean;
  monthlyFee: number;
  annualRecurringFeeIncome: number;
  firstYearFeeIncome: number;
};

export const ZERO_QUOTE_FEE_SETTING: QuoteFeeSettingConfig = {
  standardUpfrontFee: 0,
  monthlyFee: 0,
  configured: true,
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteFeeIncome(
  upfrontFeeOverride: number | null | undefined,
  setting: QuoteFeeSettingConfig = ZERO_QUOTE_FEE_SETTING,
  monthlyFeeOverride?: number | null,
): QuoteFeeIncome {
  const standardUpfrontFee = roundCurrency(setting.standardUpfrontFee);
  const monthlyFee = roundCurrency(
    monthlyFeeOverride != null ? monthlyFeeOverride : setting.monthlyFee,
  );
  const overridden = upfrontFeeOverride != null;
  const chargedUpfrontFee = roundCurrency(
    overridden ? upfrontFeeOverride : standardUpfrontFee,
  );
  const annualRecurringFeeIncome = roundCurrency(monthlyFee * 12);

  return {
    standardUpfrontFee,
    chargedUpfrontFee,
    upfrontFeeOverride: overridden ? chargedUpfrontFee : null,
    upfrontFeeOverridden: overridden,
    monthlyFee,
    annualRecurringFeeIncome,
    firstYearFeeIncome: roundCurrency(
      chargedUpfrontFee + annualRecurringFeeIncome,
    ),
  };
}
