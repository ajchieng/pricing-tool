import type { FormState } from "./form-state";

export type CommercialProfitInputUnit = "dollar" | "percent";

export function commercialNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function commercialProfitToDollars(
  raw: string,
  unit: CommercialProfitInputUnit,
  exposure: number,
): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (unit === "percent") {
    if (!(exposure > 0)) return null;
    return Math.round(exposure * (value / 100) * 100) / 100;
  }
  return value;
}

export function convertCommercialProfitLineValue(
  raw: string,
  from: CommercialProfitInputUnit,
  to: CommercialProfitInputUnit,
  exposure: number,
): string {
  if (from === to || !raw.trim() || !(exposure > 0)) return raw;
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  const converted =
    to === "percent"
      ? Math.round((value / exposure) * 100 * 10000) / 10000
      : Math.round(exposure * (value / 100) * 100) / 100;
  return String(converted);
}

export function commercialRequestContext(form: FormState) {
  const isOverdraft = form.facilityType === "overdraft";
  const isEquipmentFinance = form.facilityType === "equipment_finance";
  const isCommercialProperty = form.facilityType === "commercial_property";
  const isPropertyPurchase =
    isCommercialProperty && form.propertyTransactionType === "purchase";
  const isPurchase = isEquipmentFinance || isPropertyPurchase;
  const purchasePrice = commercialNumberOrNull(form.purchasePrice) ?? 0;
  const customerEquityContribution =
    commercialNumberOrNull(form.customerEquityContribution) ?? 0;
  const derivedPurchaseAmount = purchasePrice - customerEquityContribution;
  const facilityAmount = isPurchase
    ? Math.max(0, derivedPurchaseAmount)
    : (commercialNumberOrNull(form.loanAmount) ?? 0);
  const expectedUtilisationPct = isOverdraft
    ? (commercialNumberOrNull(form.expectedUtilisationPct) ?? 65)
    : 100;
  const profitabilityExposure = facilityAmount * (expectedUtilisationPct / 100);
  const requestSecurities =
    form.securityMode === "unsecured"
      ? [
          {
            type: "unsecured" as const,
            value: null,
            description: null,
            isPrimary: true,
          },
        ]
      : form.securities.map((security) => ({
          type: security.type,
          value: commercialNumberOrNull(security.value),
          description: security.description.trim() || null,
          isPrimary: security.isPrimary,
        }));
  const primaryRequestSecurity =
    requestSecurities.find((security) => security.isPrimary) ??
    requestSecurities[0];
  const legacySecurityValue =
    primaryRequestSecurity.type === "unsecured"
      ? 0
      : requestSecurities.some((security) => security.value == null)
        ? null
        : requestSecurities.reduce(
            (total, security) => total + (security.value ?? 0),
            0,
          );

  return {
    isOverdraft,
    isEquipmentFinance,
    isCommercialProperty,
    isPropertyPurchase,
    isPurchase,
    purchasePrice,
    customerEquityContribution,
    derivedPurchaseAmount,
    facilityAmount,
    expectedUtilisationPct,
    profitabilityExposure,
    requestSecurities,
    primaryRequestSecurity,
    legacySecurityValue,
  };
}

export function buildCommercialQuoteRequest({
  form,
  marketRateId,
  costOfFundsSource,
  profitInputUnit,
  requestedRateForPricing,
}: {
  form: FormState;
  marketRateId: string | null;
  costOfFundsSource: "default" | "override";
  profitInputUnit: CommercialProfitInputUnit;
  requestedRateForPricing?: number;
}) {
  const context = commercialRequestContext(form);

  return {
    businessName: form.businessName,
    abn: form.abn || null,
    facilityType: form.facilityType,
    loanType: form.loanType,
    loanAmount: context.facilityAmount,
    purchasePrice: context.isPurchase
      ? commercialNumberOrNull(form.purchasePrice)
      : null,
    customerEquityContribution: context.isPurchase
      ? (commercialNumberOrNull(form.customerEquityContribution) ?? 0)
      : null,
    propertyTransactionType: context.isCommercialProperty
      ? form.propertyTransactionType
      : null,
    loanTermYears: context.isOverdraft
      ? null
      : commercialNumberOrNull(form.loanTermYears),
    repaymentType: form.repaymentType,
    loanPurposeNotes: form.loanPurposeNotes || null,
    industryCategory: form.industryCategory,
    businessRiskGrade: form.businessRiskGrade,
    yearsTrading: commercialNumberOrNull(form.yearsTrading),
    annualRevenue: commercialNumberOrNull(form.annualRevenue),
    ebitda: commercialNumberOrNull(form.ebitda),
    existingAnnualDebtService: commercialNumberOrNull(
      form.existingAnnualDebtService,
    ),
    financialsQuality: form.financialsQuality || null,
    financialsAgeMonths: commercialNumberOrNull(form.financialsAgeMonths),
    revenueTrend: form.revenueTrend || null,
    profitTrend: form.profitTrend || null,
    taxStatus: form.taxStatus || null,
    largestCustomerRevenueAboveThreshold:
      form.largestCustomerRevenueAboveThreshold === ""
        ? null
        : form.largestCustomerRevenueAboveThreshold === "yes",
    securities: context.requestSecurities,
    securityType: context.primaryRequestSecurity.type,
    securityValue: context.legacySecurityValue,
    existingRelationship: form.existingRelationship,
    operatingInRegion:
      form.operatingInRegion === "" ? null : form.operatingInRegion === "yes",
    vipCustomer: form.vipCustomer,
    yearsWithLender: commercialNumberOrNull(form.yearsWithLender),
    otherLenderExposure: commercialNumberOrNull(form.otherLenderExposure),
    marketRateId,
    competitorLender: form.competitorLender || null,
    competitorRate: commercialNumberOrNull(form.competitorRate),
    competitorNotes: form.competitorNotes || null,
    requestedRate:
      requestedRateForPricing ?? commercialNumberOrNull(form.requestedRate),
    requestedReason: form.requestedReason || null,
    requestedReasonNotes: form.requestedReasonNotes || null,
    channel: form.channel,
    brokerName: form.channel === "broker" ? form.brokerName || null : null,
    brokerCompany:
      form.channel === "broker" ? form.brokerCompany || null : null,
    expectedUtilisationPct: context.expectedUtilisationPct,
    costOfFunds:
      costOfFundsSource === "override"
        ? commercialNumberOrNull(form.costOfFunds)
        : null,
    commissions:
      form.channel === "online"
        ? 0
        : commercialProfitToDollars(
            form.commissions,
            profitInputUnit,
            context.profitabilityExposure,
          ),
    otherIncome: commercialProfitToDollars(
      form.otherIncome,
      profitInputUnit,
      context.profitabilityExposure,
    ),
    upfrontFeeOverride: commercialNumberOrNull(form.upfrontFeeOverride),
    monthlyFeeOverride: commercialNumberOrNull(form.monthlyFeeOverride),
    expenses: commercialProfitToDollars(
      form.expenses,
      profitInputUnit,
      context.profitabilityExposure,
    ),
    expectedCreditLossOverrideAmount:
      commercialProfitToDollars(
        form.expectedCreditLossOverrideAmount,
        profitInputUnit,
        context.profitabilityExposure,
      ) ?? 0,
    expectedCreditLossOverrideEnabled: form.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: form.expectedCreditLossOverrideEnabled
      ? form.expectedCreditLossOverrideReason || null
      : null,
    currentDrawnBalance: context.isOverdraft
      ? commercialNumberOrNull(form.currentDrawnBalance)
      : null,
    apsExposureClass: form.apsExposureClass || null,
    capitalClassificationConfirmed: form.capitalClassificationConfirmed,
    capitalPropertyStandardStatus:
      form.facilityType === "commercial_property"
        ? form.capitalPropertyStandardStatus
        : null,
    capitalPropertyCashFlowDependent:
      form.facilityType === "commercial_property"
        ? form.capitalPropertyCashFlowDependent
        : null,
    riskWeightOverridePct: commercialNumberOrNull(form.riskWeightOverridePct),
    taxRateOverridePct: commercialNumberOrNull(form.taxRateOverridePct),
    creditConversionFactorOverridePct: context.isOverdraft
      ? commercialNumberOrNull(form.creditConversionFactorOverridePct)
      : null,
    capitalOverrideReason: form.capitalOverrideReason || null,
    notes: form.notes || null,
  };
}
