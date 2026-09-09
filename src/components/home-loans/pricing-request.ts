import type { LenderProduct } from "@/lib/pricing/lender-products";
import type {
  HomeLoanCustomerStream,
  LoanPurpose,
  ProfitabilityChannel,
  RateType,
} from "@/lib/pricing/types";

export type HomeProfitInputUnit = "dollar" | "percent";

export function homeProfitToDollars(
  raw: string,
  unit: HomeProfitInputUnit,
  loanAmount: number,
): number | null {
  if (!raw) return null;
  const number = Number.parseFloat(raw);
  if (Number.isNaN(number)) return null;
  if (unit === "percent") {
    if (!(loanAmount > 0)) return null;
    return Math.round((number / 100) * loanAmount * 100) / 100;
  }
  return number;
}

export interface HomeQuoteRequestState {
  customerReference: string;
  revisedFromQuoteId: number | null;
  productId: number | null;
  loanPurpose: LoanPurpose;
  rateType: RateType;
  fixedPeriodMonths: number | null;
  loanAmount: string;
  propertyValue: string;
  loanTermYears: string;
  customerStream: HomeLoanCustomerStream;
  vipCustomer: boolean;
  currentCustomerRate: string;
  retentionArrearsHardship18Months: string;
  retentionArrearsPast12Months: string;
  marketRateId: string | null;
  competitorLender: string;
  competitorRate: string;
  competitorNotes: string;
  requestedRate: string;
  requestedReason: string;
  requestedReasonNotes: string;
  creditScores: string[];
  dtiRatio: string;
  grossAnnualIncome: string;
  serviceabilityIncomeMeasure: "gross_annual_income" | "serviceability_nsi";
  serviceabilityNsi: string;
  riskNotes: string;
  yearsAsMember: string;
  livesInServiceRegion: string;
  existingLenderLoan: string;
  lenderProducts: LenderProduct[];
  relationshipNotes: string;
  channel: ProfitabilityChannel;
  brokerName: string;
  brokerCompany: string;
  brokerInRegion: string;
  brokerVolumeBand: string;
  brokerDiscretionPct: string;
  costOfFundsSource: "default" | "override";
  costOfFunds: string;
  commissions: string;
  otherIncome: string;
  upfrontFeeOverrideEnabled: boolean;
  upfrontFeeOverride: string;
  monthlyFeeOverrideEnabled: boolean;
  monthlyFeeOverride: string;
  expenses: string;
  expectedCreditLossOverrideAmount: string;
  expectedCreditLossOverrideEnabled: boolean;
  expectedCreditLossOverrideReason: string;
  profitInputUnit: HomeProfitInputUnit;
  capitalStandardStatus: string;
  eligibleLmi: boolean;
  homeGuaranteeSchemeEligible: boolean;
  riskWeightOverridePct: string;
  taxRateOverridePct: string;
  capitalOverrideReason: string;
  notes: string;
}

export function buildHomeQuoteRequest(
  state: HomeQuoteRequestState,
  requestedRateForPricing?: number,
) {
  const existingMember = state.customerStream !== "new_to_bank";
  const retentionScenario = state.customerStream === "retention";
  const loanAmount = Number.parseFloat(state.loanAmount) || 0;
  const profitToDollars = (raw: string) =>
    homeProfitToDollars(raw, state.profitInputUnit, loanAmount);

  return {
    customerReference: state.customerReference,
    revisedFromQuoteId: state.revisedFromQuoteId,
    productId: state.productId,
    loanPurpose: state.loanPurpose,
    rateType: state.rateType,
    fixedPeriodMonths:
      state.rateType === "fixed" ? state.fixedPeriodMonths : null,
    repaymentType: "principal_and_interest" as const,
    loanAmount,
    propertyValue: Number.parseFloat(state.propertyValue) || 0,
    loanTermYears: Number.parseInt(state.loanTermYears) || 30,
    customerStream: state.customerStream,
    existingMember,
    retentionScenario,
    vipCustomer: state.vipCustomer,
    currentCustomerRate:
      retentionScenario && state.currentCustomerRate
        ? Number.parseFloat(state.currentCustomerRate)
        : null,
    retentionArrearsHardship18Months: retentionScenario
      ? state.retentionArrearsHardship18Months === ""
        ? null
        : state.retentionArrearsHardship18Months === "yes"
      : null,
    retentionArrearsPast12Months:
      retentionScenario && state.retentionArrearsHardship18Months === "yes"
        ? state.retentionArrearsPast12Months === ""
          ? null
          : state.retentionArrearsPast12Months === "yes"
        : null,
    marketRateId: state.marketRateId,
    competitorLender: state.competitorLender || null,
    competitorRate: state.competitorRate
      ? Number.parseFloat(state.competitorRate)
      : null,
    competitorNotes: state.competitorNotes || null,
    requestedRate:
      requestedRateForPricing ??
      (state.requestedRate ? Number.parseFloat(state.requestedRate) : null),
    requestedReason: state.requestedReason || null,
    requestedReasonNotes: state.requestedReasonNotes || null,
    creditScores: retentionScenario
      ? []
      : state.creditScores.filter((score) => score.trim() !== ""),
    dtiRatio:
      !retentionScenario && state.dtiRatio
        ? Number.parseFloat(state.dtiRatio)
        : null,
    grossAnnualIncome:
      !retentionScenario &&
      state.serviceabilityIncomeMeasure === "gross_annual_income" &&
      state.grossAnnualIncome
        ? Number.parseFloat(state.grossAnnualIncome)
        : null,
    serviceabilityIncomeMeasure: retentionScenario
      ? ("gross_annual_income" as const)
      : state.serviceabilityIncomeMeasure,
    serviceabilityNsi:
      !retentionScenario &&
      state.serviceabilityIncomeMeasure === "serviceability_nsi" &&
      state.serviceabilityNsi.trim() !== ""
        ? Number.parseFloat(state.serviceabilityNsi)
        : null,
    employmentIncomeStability: "not_assessed" as const,
    serviceabilityStatus: "not_assessed" as const,
    riskNotes: state.riskNotes || null,
    yearsAsMember:
      existingMember && state.yearsAsMember
        ? Number.parseInt(state.yearsAsMember)
        : null,
    livesInServiceRegion: state.livesInServiceRegion,
    existingLenderLoan: existingMember ? state.existingLenderLoan : "unknown",
    lenderProducts: existingMember ? state.lenderProducts : [],
    newToBankGrowthOpportunity: state.customerStream === "new_to_bank",
    relationshipNotes:
      existingMember && state.relationshipNotes
        ? state.relationshipNotes
        : null,
    channel: state.channel,
    brokerName: state.channel === "broker" ? state.brokerName || null : null,
    brokerCompany:
      state.channel === "broker" ? state.brokerCompany || null : null,
    brokerInRegion:
      state.channel === "broker" && state.brokerInRegion
        ? state.brokerInRegion
        : null,
    brokerVolumeBand:
      state.channel === "broker" && state.brokerVolumeBand
        ? state.brokerVolumeBand
        : null,
    brokerDiscretionPct:
      state.channel === "broker" && state.brokerDiscretionPct
        ? Number.parseFloat(state.brokerDiscretionPct)
        : null,
    costOfFunds:
      state.costOfFundsSource === "override" && state.costOfFunds
        ? Number.parseFloat(state.costOfFunds)
        : null,
    commissions:
      state.channel === "online" ? 0 : profitToDollars(state.commissions),
    otherIncome: profitToDollars(state.otherIncome),
    upfrontFeeOverride: state.upfrontFeeOverrideEnabled
      ? Number.parseFloat(state.upfrontFeeOverride)
      : null,
    monthlyFeeOverride:
      state.monthlyFeeOverrideEnabled && state.monthlyFeeOverride.trim() !== ""
        ? Number.parseFloat(state.monthlyFeeOverride)
        : null,
    expenses: profitToDollars(state.expenses),
    expectedCreditLossOverrideAmount:
      profitToDollars(state.expectedCreditLossOverrideAmount) ?? 0,
    expectedCreditLossOverrideEnabled: state.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: state.expectedCreditLossOverrideEnabled
      ? state.expectedCreditLossOverrideReason || null
      : null,
    averageAssets: state.loanAmount
      ? Number.parseFloat(state.loanAmount)
      : null,
    capitalStandardStatus: state.capitalStandardStatus,
    eligibleLmi: state.eligibleLmi,
    homeGuaranteeSchemeEligible: state.homeGuaranteeSchemeEligible,
    riskWeightOverridePct: state.riskWeightOverridePct
      ? Number.parseFloat(state.riskWeightOverridePct)
      : null,
    taxRateOverridePct: state.taxRateOverridePct
      ? Number.parseFloat(state.taxRateOverridePct)
      : null,
    capitalOverrideReason: state.capitalOverrideReason || null,
    notes: state.notes || null,
  };
}
