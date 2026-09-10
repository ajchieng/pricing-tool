// Browser configuration projections use numeric financial values and ISO date strings.
export type ProductRow = {
  id: number;
  name: string;
  productCategory: string;
  loanPurpose: string;
  rateType: string;
  fixedPeriodMonths: number | null;
  repaymentType: string;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  maxLvr: number | null;
  establishmentFee: number | null;
  monthlyServiceFee: number | null;
  loanContractVariationFee: number | null;
  defaultFee: number | null;
  titleSearchFee: number | null;
  dischargeFee: number | null;
  progressPaymentFee: number | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductRateRow = {
  id: number;
  productId: number;
  lvrMin: number;
  lvrMax: number;
  cardedRate: number;
  pricingRole: string | null;
  comparisonRate: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PricingAdjustmentRuleRow = {
  id: number;
  name: string;
  description: string | null;
  ruleType: string;
  adjustmentAmount: number;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
  appliesToProductId: number | null;
  appliesToLoanPurpose: string | null;
  appliesToRateType: string | null;
  requiresApproval: boolean;
  reasonText: string | null;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRuleRow = {
  id: number;
  name: string;
  approvalLevel: string;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
  reasonText: string;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type MarginSettingRow = {
  id: number;
  productId: number | null;
  loanPurpose: string | null;
  rateType: string | null;
  estimatedCostOfFunds: number;
  targetMargin: number;
  hardMinimumMargin: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfitabilityDefaultRow = {
  id: number;
  channel: string;
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
  badDebtPct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalLoanProductRow = {
  id: number;
  name: string;
  productCategory: string;
  securityType: string;
  rateType: string;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  establishmentFee: number | null;
  monthlyServiceFee: number | null;
  onlineRedrawFee: number | null;
  branchRedrawFee: number | null;
  defaultFee: number | null;
  redrawAvailable: boolean;
  active: boolean;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalLoanProductRateRow = {
  id: number;
  productId: number;
  cardedRate: number;
  pricingRole: string | null;
  comparisonRate: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalMarginSettingRow = {
  id: number;
  securityType: string | null;
  personalProductId: number | null;
  estimatedCostOfFunds: number;
  targetMargin: number;
  hardMinimumMargin: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalApprovalRuleRow = {
  id: number;
  name: string;
  approvalLevel: string;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
  reasonText: string;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type PersonalProfitabilityDefaultRow = {
  id: number;
  channel: string;
  securityType: string;
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
  badDebtPct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialLoanProductRow = {
  id: number;
  name: string;
  facilityType: string;
  baseRateName: string;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  minTermYears: number | null;
  maxTermYears: number | null;
  establishmentFeePct: number | null;
  establishmentFeeMin: number | null;
  annualLineFeePct: number | null;
  documentationFee: number | null;
  active: boolean;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialLoanProductRateRow = {
  id: number;
  productId: number;
  loanType: string | null;
  baseRate: number;
  pricingRole: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialMarginSettingRow = {
  id: number;
  facilityType: string | null;
  commercialProductId: number | null;
  estimatedCostOfFunds: number;
  targetMargin: number;
  hardMinimumMargin: number;
  scoreMarginFloorPct: number | null;
  hardMinimumNetInterestMarginPct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialApprovalSettingRow = {
  id: number;
  name: string;
  seniorExposure: number;
  reviewExposure: number;
  requestedBelowIndicativeManager: number;
  requestedBelowIndicativeSenior: number;
  dscrStrongMin: number;
  dscrAcceptableMin: number;
  customerConcentrationThresholdPct: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialProfitabilityDefaultRow = {
  id: number;
  channel: string;
  facilityType: string;
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
  badDebtPct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuoteFeeSettingRow = {
  id: number;
  vertical: "home" | "personal" | "commercial";
  standardUpfrontFee: number;
  monthlyFee: number;
  createdAt: string;
  updatedAt: string;
};

export type ConfigurationPageTables = {
  product: ProductRow[];
  product_rate: ProductRateRow[];
  pricing_adjustment_rule: PricingAdjustmentRuleRow[];
  approval_rule: ApprovalRuleRow[];
  margin_setting: MarginSettingRow[];
  profitability_default: ProfitabilityDefaultRow[];
  personal_loan_product: PersonalLoanProductRow[];
  personal_loan_product_rate: PersonalLoanProductRateRow[];
  personal_margin_setting: PersonalMarginSettingRow[];
  personal_approval_rule: PersonalApprovalRuleRow[];
  personal_profitability_default: PersonalProfitabilityDefaultRow[];
  commercial_loan_product: CommercialLoanProductRow[];
  commercial_loan_product_rate: CommercialLoanProductRateRow[];
  commercial_margin_setting: CommercialMarginSettingRow[];
  commercial_approval_setting: CommercialApprovalSettingRow[];
  commercial_profitability_default: CommercialProfitabilityDefaultRow[];
  quote_fee_setting: QuoteFeeSettingRow[];
};
