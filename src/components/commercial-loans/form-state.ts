import type {
  CommercialFacilityType,
  CommercialLoanType,
} from "@/lib/pricing/commercial/types";
import {
  commercialDefaultFieldStrings,
  type CommercialProfitabilityDefaultsByChannelAndFacility,
} from "@/lib/quotes/profitability-defaults";
import {
  costOfFundsDefaultText,
  type CommercialCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";

// Shared commercial form model used by the browser calculator and revision mapper.
export interface FormState {
  businessName: string;
  abn: string;
  facilityType: string;
  loanType: CommercialLoanType;
  loanAmount: string;
  purchasePrice: string;
  customerEquityContribution: string;
  propertyTransactionType: "purchase" | "refinance";
  loanTermYears: string;
  repaymentType: "principal_and_interest" | "interest_only";
  loanPurposeNotes: string;
  industryCategory: string;
  businessRiskGrade: string;
  yearsTrading: string;
  annualRevenue: string;
  ebitda: string;
  existingAnnualDebtService: string;
  financialsQuality: string;
  financialsAgeMonths: string;
  revenueTrend: string;
  profitTrend: string;
  taxStatus: string;
  largestCustomerRevenueAboveThreshold: "" | "yes" | "no";
  securityMode: "secured" | "unsecured";
  securities: CommercialSecurityFormValue[];
  existingRelationship: boolean;
  operatingInRegion: "" | "yes" | "no";
  vipCustomer: boolean;
  yearsWithLender: string;
  otherLenderExposure: string;
  competitorLender: string;
  competitorRate: string;
  competitorNotes: string;
  requestedRate: string;
  requestedReason: string;
  requestedReasonNotes: string;
  channel: "broker" | "online" | "direct";
  brokerName: string;
  brokerCompany: string;
  expectedUtilisationPct: string;
  costOfFunds: string;
  commissions: string;
  otherIncome: string;
  upfrontFeeOverride: string;
  monthlyFeeOverride: string;
  expenses: string;
  expectedCreditLossOverrideAmount: string;
  expectedCreditLossOverrideEnabled: boolean;
  expectedCreditLossOverrideReason: string;
  currentDrawnBalance: string;
  apsExposureClass: string;
  capitalClassificationConfirmed: boolean;
  capitalPropertyStandardStatus: string;
  capitalPropertyCashFlowDependent: boolean;
  riskWeightOverridePct: string;
  taxRateOverridePct: string;
  creditConversionFactorOverridePct: string;
  capitalOverrideReason: string;
  notes: string;
}

export interface CommercialSecurityFormValue {
  id: string;
  type: string;
  value: string;
  description: string;
  isPrimary: boolean;
}

export function emptyCommercialSecurity(
  id: string,
  type = "commercial_property",
  isPrimary = false,
): CommercialSecurityFormValue {
  return { id, type, value: "", description: "", isPrimary };
}

export function removeCommercialSecurity(
  securities: CommercialSecurityFormValue[],
  id: string,
): CommercialSecurityFormValue[] {
  const remaining = securities.filter((security) => security.id !== id);
  if (remaining.length === 0) {
    return [emptyCommercialSecurity("security-0", "commercial_property", true)];
  }
  if (!remaining.some((security) => security.isPrimary)) {
    return remaining.map((security, index) => ({
      ...security,
      isPrimary: index === 0,
    }));
  }
  return remaining;
}

export function setPrimaryCommercialSecurity(
  securities: CommercialSecurityFormValue[],
  id: string,
): CommercialSecurityFormValue[] {
  return securities.map((security) => ({
    ...security,
    isPrimary: security.id === id,
  }));
}

export const INITIAL: FormState = {
  businessName: "",
  abn: "",
  facilityType: "term_loan",
  loanType: "standard",
  loanAmount: "",
  purchasePrice: "",
  customerEquityContribution: "0",
  propertyTransactionType: "purchase",
  loanTermYears: "10",
  repaymentType: "principal_and_interest",
  loanPurposeNotes: "",
  industryCategory: "professional_services",
  businessRiskGrade: "grade_3",
  yearsTrading: "",
  annualRevenue: "",
  ebitda: "",
  existingAnnualDebtService: "",
  financialsQuality: "accountant_prepared",
  financialsAgeMonths: "6",
  revenueTrend: "stable",
  profitTrend: "stable_profitable",
  taxStatus: "clear",
  largestCustomerRevenueAboveThreshold: "",
  securityMode: "secured",
  securities: [
    emptyCommercialSecurity("security-0", "commercial_property", true),
  ],
  existingRelationship: false,
  operatingInRegion: "",
  vipCustomer: false,
  yearsWithLender: "",
  otherLenderExposure: "",
  competitorLender: "",
  competitorRate: "",
  competitorNotes: "",
  requestedRate: "",
  requestedReason: "",
  requestedReasonNotes: "",
  channel: "direct",
  brokerName: "",
  brokerCompany: "",
  expectedUtilisationPct: "65",
  costOfFunds: "",
  commissions: "",
  otherIncome: "",
  upfrontFeeOverride: "",
  monthlyFeeOverride: "",
  expenses: "",
  expectedCreditLossOverrideAmount: "0",
  expectedCreditLossOverrideEnabled: false,
  expectedCreditLossOverrideReason: "",
  currentDrawnBalance: "",
  apsExposureClass: "",
  capitalClassificationConfirmed: false,
  capitalPropertyStandardStatus: "unconfirmed",
  capitalPropertyCashFlowDependent: true,
  riskWeightOverridePct: "",
  taxRateOverridePct: "",
  creditConversionFactorOverridePct: "",
  capitalOverrideReason: "",
  notes: "",
};

export function commercialFacilityTypeOf(
  value: string,
): CommercialFacilityType {
  return value === "overdraft" ||
    value === "equipment_finance" ||
    value === "commercial_property"
    ? value
    : "term_loan";
}

export function commercialChannelDefaultsApplied({
  initialValues,
  applyProfitabilityDefaults,
}: {
  initialValues?: Partial<FormState>;
  /** Fresh quotes take governed defaults; revisions keep saved dollar values. */
  applyProfitabilityDefaults?: boolean;
}): boolean {
  return applyProfitabilityDefaults ?? initialValues == null;
}

// New quotes start with the governed channel/facility profitability defaults
// pre-filled as % of profitability exposure strings; the form renders them in
// percent mode when any default exists.
export function initialCommercialLoanFormState(
  profitabilityDefaults: CommercialProfitabilityDefaultsByChannelAndFacility = {},
  costOfFundsDefaults: CommercialCostOfFundsDefaults = {},
): FormState {
  const facilityType = commercialFacilityTypeOf(INITIAL.facilityType);
  const defaults = commercialDefaultFieldStrings(
    profitabilityDefaults,
    INITIAL.channel,
    facilityType,
  );
  return {
    ...INITIAL,
    costOfFunds: costOfFundsDefaultText(costOfFundsDefaults[facilityType]),
    commissions: defaults.commissions,
    otherIncome: defaults.otherIncome,
    expenses: defaults.expenses,
  };
}
