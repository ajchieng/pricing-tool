import type {
  HomeLoanCustomerStream,
  ProfitabilityChannel,
  ServiceabilityIncomeMeasure,
} from "@/lib/pricing/types";
import { type LenderProduct } from "@/lib/pricing/lender-products";

// Shared form model used by the calculator and saved-input projection.
export interface FormState {
  customerReference: string;
  customerStream: HomeLoanCustomerStream;
  vipCustomer: boolean;
  notes: string;

  loanPurpose: "owner_occupied" | "investment";
  rateType: "variable" | "fixed";
  fixedPeriodMonths: number | null;
  loanAmount: string;
  propertyValue: string;
  loanTermYears: string;
  productId: number | null;

  competitorLender: string;
  competitorRate: string;
  competitorNotes: string;
  requestedRate: string;
  requestedReason: string;
  requestedReasonNotes: string;

  creditScores: string[];
  dtiRatio: string;
  grossAnnualIncome: string;
  serviceabilityIncomeMeasure: ServiceabilityIncomeMeasure;
  serviceabilityNsi: string;
  currentCustomerRate: string;
  retentionArrearsHardship18Months: string;
  retentionArrearsPast12Months: string;
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

  capitalStandardStatus: string;
  eligibleLmi: boolean;
  homeGuaranteeSchemeEligible: boolean;
  riskWeightOverridePct: string;
  taxRateOverridePct: string;
  capitalOverrideReason: string;
}

export const BASE_INITIAL: FormState = {
  customerReference: "",
  customerStream: "new_to_bank",
  vipCustomer: false,
  notes: "",

  loanPurpose: "owner_occupied",
  rateType: "variable",
  fixedPeriodMonths: null,
  loanAmount: "",
  propertyValue: "",
  loanTermYears: "30",
  productId: null,

  competitorLender: "",
  competitorRate: "",
  competitorNotes: "",
  requestedRate: "",
  requestedReason: "",
  requestedReasonNotes: "",

  creditScores: [""],
  dtiRatio: "",
  grossAnnualIncome: "",
  serviceabilityIncomeMeasure: "gross_annual_income",
  serviceabilityNsi: "",
  currentCustomerRate: "",
  retentionArrearsHardship18Months: "",
  retentionArrearsPast12Months: "",
  riskNotes: "",

  yearsAsMember: "",
  livesInServiceRegion: "unknown",
  existingLenderLoan: "unknown",
  lenderProducts: [],
  relationshipNotes: "",

  channel: "direct",
  brokerName: "",
  brokerCompany: "",
  brokerInRegion: "",
  brokerVolumeBand: "",
  brokerDiscretionPct: "",
  costOfFunds: "",
  commissions: "",
  otherIncome: "",
  upfrontFeeOverrideEnabled: false,
  upfrontFeeOverride: "",
  monthlyFeeOverrideEnabled: false,
  monthlyFeeOverride: "",
  expenses: "",
  expectedCreditLossOverrideAmount: "0",
  expectedCreditLossOverrideEnabled: false,
  expectedCreditLossOverrideReason: "",

  capitalStandardStatus: "unconfirmed",
  eligibleLmi: false,
  homeGuaranteeSchemeEligible: false,
  riskWeightOverridePct: "",
  taxRateOverridePct: "",
  capitalOverrideReason: "",
};
