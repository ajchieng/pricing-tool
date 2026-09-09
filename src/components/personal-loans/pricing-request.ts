import type { FormState } from "./form-state";

export type PersonalProfitInputUnit = "dollar" | "percent";

export function personalNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function personalProfitToDollars(
  raw: string,
  unit: PersonalProfitInputUnit,
  loanAmount: number,
): number | null {
  if (!raw.trim()) return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) return null;
  if (unit === "percent") {
    if (!(loanAmount > 0)) return null;
    return Math.round((number / 100) * loanAmount * 100) / 100;
  }
  return number;
}

export function convertPersonalProfitLineValue(
  raw: string,
  fromUnit: PersonalProfitInputUnit,
  toUnit: PersonalProfitInputUnit,
  loanAmount: number,
): string {
  if (fromUnit === toUnit || !raw.trim() || !(loanAmount > 0)) return raw;
  const number = Number(raw);
  if (!Number.isFinite(number)) return raw;
  const converted =
    toUnit === "percent"
      ? Math.round((number / loanAmount) * 100 * 10000) / 10000
      : Math.round((number / 100) * loanAmount * 100) / 100;
  return String(converted);
}

export function buildPersonalQuoteRequest({
  form,
  marketRateId,
  costOfFundsSource,
  profitInputUnit,
  requestedRateForPricing,
}: {
  form: FormState;
  marketRateId: string | null;
  costOfFundsSource: "default" | "override";
  profitInputUnit: PersonalProfitInputUnit;
  requestedRateForPricing?: number;
}) {
  const loanAmount = personalNumberOrNull(form.loanAmount) ?? 0;
  const retention = form.customerStream === "retention";
  const broker = form.channel === "broker";

  return {
    customerReference: form.customerReference,
    productId: personalNumberOrNull(form.productId),
    loanPurpose: form.loanPurpose,
    securityType: form.securityType,
    loanAmount,
    loanTermMonths: personalNumberOrNull(form.loanTermMonths) ?? 0,
    creditScores: retention
      ? []
      : form.creditScores.filter((score) => score.trim() !== ""),
    employmentIncomeStability: retention
      ? "not_assessed"
      : form.employmentIncomeStability,
    customerStream: form.customerStream,
    existingMember: form.customerStream !== "new_to_bank",
    yearsAsMember:
      form.customerStream === "new_to_bank"
        ? null
        : personalNumberOrNull(form.yearsAsMember),
    currentCustomerRate: retention
      ? personalNumberOrNull(form.currentCustomerRate)
      : null,
    retentionArrearsHardship18Months: retention
      ? form.retentionArrearsHardship18Months === ""
        ? null
        : form.retentionArrearsHardship18Months === "yes"
      : null,
    retentionArrearsPast12Months:
      retention && form.retentionArrearsHardship18Months === "yes"
        ? form.retentionArrearsPast12Months === ""
          ? null
          : form.retentionArrearsPast12Months === "yes"
        : null,
    riskNotes: retention ? form.riskNotes || null : null,
    netMonthlyIncome: personalNumberOrNull(form.netMonthlyIncome),
    monthlyLivingExpenses: personalNumberOrNull(form.monthlyLivingExpenses),
    existingMonthlyDebtRepayments: personalNumberOrNull(
      form.existingMonthlyDebtRepayments,
    ),
    marketRateId,
    competitorLender: form.competitorLender || null,
    competitorRate: personalNumberOrNull(form.competitorRate),
    competitorNotes: form.competitorNotes || null,
    requestedRate:
      requestedRateForPricing ?? personalNumberOrNull(form.requestedRate),
    requestedReason: form.requestedReason || null,
    requestedReasonNotes: form.requestedReasonNotes || null,
    channel: form.channel,
    brokerName: broker ? form.brokerName || null : null,
    brokerCompany: broker ? form.brokerCompany || null : null,
    brokerInRegion: broker && form.brokerInRegion ? form.brokerInRegion : null,
    brokerVolumeBand:
      broker && form.brokerVolumeBand ? form.brokerVolumeBand : null,
    brokerDiscretionPct: broker
      ? personalNumberOrNull(form.brokerDiscretionPct)
      : null,
    costOfFunds:
      costOfFundsSource === "override"
        ? personalNumberOrNull(form.costOfFunds)
        : null,
    commissions:
      form.channel === "online"
        ? 0
        : personalProfitToDollars(
            form.commissions,
            profitInputUnit,
            loanAmount,
          ),
    otherIncome: personalProfitToDollars(
      form.otherIncome,
      profitInputUnit,
      loanAmount,
    ),
    upfrontFeeOverride: personalNumberOrNull(form.upfrontFeeOverride),
    monthlyFeeOverride: personalNumberOrNull(form.monthlyFeeOverride),
    expenses: personalProfitToDollars(
      form.expenses,
      profitInputUnit,
      loanAmount,
    ),
    expectedCreditLossOverrideAmount:
      personalProfitToDollars(
        form.expectedCreditLossOverrideAmount,
        profitInputUnit,
        loanAmount,
      ) ?? 0,
    expectedCreditLossOverrideEnabled: form.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: form.expectedCreditLossOverrideEnabled
      ? form.expectedCreditLossOverrideReason || null
      : null,
    riskWeightOverridePct: personalNumberOrNull(form.riskWeightOverridePct),
    taxRateOverridePct: personalNumberOrNull(form.taxRateOverridePct),
    capitalOverrideReason: form.capitalOverrideReason || null,
    notes: form.notes || null,
  };
}
