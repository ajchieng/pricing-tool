// Shared form model used by the calculator and saved-input projection.
export interface FormState {
  customerReference: string;
  productId: string;
  loanPurpose: string;
  securityType: "secured_vehicle" | "secured_savings" | "unsecured";
  loanAmount: string;
  loanTermMonths: string;
  creditScores: string[];
  employmentIncomeStability: string;
  existingMember: boolean;
  customerStream: "new_to_bank" | "existing_member" | "retention";
  yearsAsMember: string;
  currentCustomerRate: string;
  retentionArrearsHardship18Months: string;
  retentionArrearsPast12Months: string;
  riskNotes: string;
  netMonthlyIncome: string;
  monthlyLivingExpenses: string;
  existingMonthlyDebtRepayments: string;
  competitorLender: string;
  competitorRate: string;
  competitorNotes: string;
  requestedRate: string;
  requestedReason: string;
  requestedReasonNotes: string;
  channel: "broker" | "online" | "direct";
  brokerName: string;
  brokerCompany: string;
  brokerInRegion: string;
  brokerVolumeBand: string;
  brokerDiscretionPct: string;
  costOfFunds: string;
  commissions: string;
  otherIncome: string;
  upfrontFeeOverride: string;
  monthlyFeeOverride: string;
  expenses: string;
  expectedCreditLossOverrideAmount: string;
  expectedCreditLossOverrideEnabled: boolean;
  expectedCreditLossOverrideReason: string;
  riskWeightOverridePct: string;
  taxRateOverridePct: string;
  capitalOverrideReason: string;
  notes: string;
}

export const BASE_INITIAL: FormState = {
  customerReference: "",
  productId: "",
  loanPurpose: "car_purchase",
  securityType: "secured_vehicle",
  loanAmount: "",
  loanTermMonths: "",
  creditScores: [""],
  employmentIncomeStability: "not_assessed",
  existingMember: false,
  customerStream: "new_to_bank",
  yearsAsMember: "",
  currentCustomerRate: "",
  retentionArrearsHardship18Months: "",
  retentionArrearsPast12Months: "",
  riskNotes: "",
  netMonthlyIncome: "",
  monthlyLivingExpenses: "",
  existingMonthlyDebtRepayments: "",
  competitorLender: "",
  competitorRate: "",
  competitorNotes: "",
  requestedRate: "",
  requestedReason: "",
  requestedReasonNotes: "",
  channel: "direct",
  brokerName: "",
  brokerCompany: "",
  brokerInRegion: "",
  brokerVolumeBand: "",
  brokerDiscretionPct: "",
  costOfFunds: "",
  commissions: "",
  otherIncome: "",
  upfrontFeeOverride: "",
  monthlyFeeOverride: "",
  expenses: "",
  expectedCreditLossOverrideAmount: "0",
  expectedCreditLossOverrideEnabled: false,
  expectedCreditLossOverrideReason: "",
  riskWeightOverridePct: "",
  taxRateOverridePct: "",
  capitalOverrideReason: "",
  notes: "",
};
