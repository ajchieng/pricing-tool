// Pure domain types for the pricing calculation service.
// These intentionally do NOT depend on Prisma so the service stays
// framework-free, deterministic and unit-testable.

import type { LenderProduct } from "./lender-products";
import type { QuoteFeeIncome, QuoteFeeSettingConfig } from "./quote-fees";
import type { AmortisingCashFlowSummary } from "./cash-flow";
import type { ExpectedLossResult } from "./credit-risk/expected-loss";

export type LoanPurpose = "owner_occupied" | "investment";
export type RateType = "variable" | "fixed";
export type RepaymentType = "principal_and_interest";
export type RuleType = "discount" | "loading";
export type AppliedAdjustmentType = RuleType | "discount_withheld";
// "review" = credit/pricing review (risk-driven); sits above senior, below exception.
export type ApprovalLevel =
  "none" | "manager" | "senior" | "review" | "exception";

export type Operator = "lte" | "lt" | "gte" | "gt" | "eq";

// Which dimension an applied adjustment belongs to (for the result summaries).
export type AdjustmentCategory =
  "loan" | "relationship" | "strategic" | "product";

// --- Customer risk context enums ---
export type EmploymentStability =
  | "not_assessed"
  | "stable_payg"
  | "self_employed"
  | "contractor_casual"
  | "review_required";
export type ServiceabilityStatus =
  "not_assessed" | "appears_acceptable" | "borderline" | "review_required";

// --- Relationship context enums ---
export type YesNoUnknown = "yes" | "no" | "unknown";
export type ProfitabilityChannel = "broker" | "online" | "direct";
export type PolicyComponentFallbacks = {
  product: boolean;
  scoreModel: boolean;
  scoreModelGovernance: boolean;
  margin: boolean;
  approval: boolean;
  profitability: boolean;
  fees: boolean;
  capital: boolean;
  expectedLoss: boolean;
};

export type PricingPolicySnapshot = {
  schemaVersion: 1;
  vertical: CustomerScoreProductArea;
  capturedAt: string;
  bundleToken: string;
  componentValueHash: string;
  productId: number | null;
  selectedRateId: number | null;
  selectedRateRole: import("./rate-role").PublishedRateRole | null;
  scoreModelId: number | null;
  scoreModelVersion: number;
  adjustmentRuleIds: number[];
  marginSettingIds: number[];
  approvalSettingIds: number[];
  profitabilityDefaultIds: number[];
  quoteFeeConfigured: boolean;
  capitalSettingId: number | null;
  expectedLossPolicyId: number | null;
  expectedLossPolicyVersion: number | null;
  componentFallbacks: PolicyComponentFallbacks;
};
export type LoanCustomerStream =
  "new_to_bank" | "existing_member" | "retention";
export type HomeLoanCustomerStream = LoanCustomerStream;
export type ServiceabilityIncomeMeasure =
  "gross_annual_income" | "serviceability_nsi";
export type BrokerVolumeBand = "1_3" | "4_6" | "7_9" | "10_plus";

// ---- Configuration the service operates on (loaded from DB elsewhere) ----

export interface ProductConfig {
  id: number;
  name: string;
  loanPurpose: LoanPurpose;
  rateType: RateType;
  fixedPeriodMonths: number | null;
  repaymentType: RepaymentType;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  maxLvr: number | null;
  active: boolean;
  notes: string | null;
}

export interface ProductRateConfig {
  id: number;
  productId: number;
  lvrMin: number;
  lvrMax: number;
  cardedRate: number; // percentage points, e.g. 6.34
  pricingRole?: import("./rate-role").PublishedRateRole | null;
  comparisonRate?: number | null; // carded comparison rate; context/display only
  active: boolean;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
}

export interface AdjustmentRuleConfig {
  id: number;
  name: string;
  ruleType: RuleType;
  adjustmentAmount: number; // positive magnitude in percentage points
  conditionType: string;
  conditionOperator: Operator;
  conditionValue: string;
  appliesToProductId: number | null;
  appliesToLoanPurpose: string | null;
  appliesToRateType: string | null;
  requiresApproval: boolean;
  reasonText: string | null;
  active: boolean;
  priority: number;
}

export interface MarginSettingConfig {
  id: number;
  productId: number | null;
  loanPurpose: string | null;
  rateType: string | null;
  estimatedCostOfFunds: number;
  targetMargin: number;
  hardMinimumMargin: number;
  active: boolean;
}

export interface ApprovalRuleConfig {
  id: number;
  name: string;
  approvalLevel: ApprovalLevel;
  conditionType: string;
  conditionOperator: Operator;
  conditionValue: string;
  reasonText: string;
  active: boolean;
  priority: number;
}

export interface PricingConfig {
  product: ProductConfig | null;
  productRates: ProductRateConfig[];
  adjustmentRules: AdjustmentRuleConfig[];
  marginSettings: MarginSettingConfig[];
  approvalRules: ApprovalRuleConfig[];
  customerScoreModel?: CustomerScoreModelConfig | null;
  customerScoreModelFallback?: boolean;
  // Whether loan amount may exceed property value (default false).
  allowLoanAmountAbovePropertyValue?: boolean;
  capitalRatioPct?: number | null;
  quoteFeeSetting?: QuoteFeeSettingConfig;
  componentFallbacks?: PolicyComponentFallbacks;
  profitabilityDefaultIds?: number[];
  profitabilityDefaultsSnapshot?: unknown;
}

// ---- Inputs ----

export interface PricingInput {
  loanPurpose: LoanPurpose;
  rateType: RateType;
  fixedPeriodMonths: number | null;
  repaymentType: RepaymentType;
  loanAmount: number;
  propertyValue: number;
  loanTermYears: number;
  existingMember: boolean;
  retentionScenario: boolean;
  customerStream?: HomeLoanCustomerStream;
  currentCustomerRate?: number | null;
  retentionArrearsHardship18Months?: boolean | null;
  retentionArrearsPast12Months?: boolean | null;
  vipCustomer?: boolean;
  competitorRate?: number | null;
  requestedRate?: number | null;
  requestedReason?: string | null;

  // Customer risk context — granular figures (rules can target numerically).
  creditScore?: number | null; // arithmetic mean of home-loan Equifax scores, 0..1200
  dtiRatio?: number | null; // multiple of gross income
  grossAnnualIncome?: number | null;
  serviceabilityIncomeMeasure?: ServiceabilityIncomeMeasure;
  serviceabilityNsi?: number | null; // monthly net surplus income; may be negative
  // Categorical manual flags / overrides.
  employmentIncomeStability?: EmploymentStability;
  serviceabilityStatus?: ServiceabilityStatus;

  // Relationship context.
  yearsAsMember?: number | null;
  livesInServiceRegion?: YesNoUnknown;
  existingLenderLoan?: YesNoUnknown;
  lenderProducts?: LenderProduct[];
  newToBankGrowthOpportunity?: boolean;

  // Profitability inputs feeding the P&L waterfall.
  // costOfFunds is a percentage p.a.; remaining line items are annual dollars.
  // averageAssets is accepted for legacy payloads but profitability uses loanAmount.
  channel?: ProfitabilityChannel;
  brokerName?: string | null;
  brokerCompany?: string | null;
  brokerInRegion?: "yes" | "no" | null;
  brokerVolumeBand?: BrokerVolumeBand | null;
  brokerDiscretionPct?: number | null;
  costOfFunds?: number | null;
  commissions?: number | null;
  otherIncome?: number | null;
  upfrontFeeOverride?: number | null;
  monthlyFeeOverride?: number | null;
  expenses?: number | null;
  averageAssets?: number | null;
  expectedCreditLossOverrideAmount?: number | null;
  expectedCreditLossOverrideEnabled?: boolean;
  expectedCreditLossOverrideReason?: string | null;

  // APS 112 capital-allocation facts and privileged override inputs.
  capitalStandardStatus?: "confirmed_standard" | "non_standard" | "unconfirmed";
  eligibleLmi?: boolean;
  homeGuaranteeSchemeEligible?: boolean;
  riskWeightOverridePct?: number | null;
  taxRateOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

// ---- Outputs ----

export interface AppliedAdjustment {
  ruleId: number;
  name: string;
  ruleType: AppliedAdjustmentType;
  amount: number; // Signed compatibility amount; withheld discount is positive.
  reason: string;
  requiresApproval: boolean;
  category: AdjustmentCategory;
}

export type MarginStatus =
  "healthy" | "below_target" | "below_hard_minimum" | "unavailable";

export interface RequestedRateAnalysis {
  requestedRate: number;
  belowSuggested: boolean;
  // suggested - requested (positive => requested is below suggested)
  differenceFromSuggested: number;
  // Approval uses a separate calculation with the requested-rate facts absent,
  // so the request cannot move the benchmark against which it is assessed.
  belowApprovalBenchmark: boolean;
  approvalBenchmarkRate: number;
  requestedDiscountFromBenchmark: number;
  benchmarkScore: number;
  benchmarkScoreAdjustment: number;
  benchmarkScoreModelId: number | null;
  benchmarkScoreModelVersion: number | null;
  benchmarkScoreModelName: string | null;
  // requested - competitor (positive => requested above competitor)
  differenceFromCompetitor: number | null;
}

export interface RequestedRateBenchmark {
  approvalBenchmarkRate: number;
  requestedDiscountFromBenchmark: number;
  benchmarkScore: number;
  benchmarkScoreAdjustment: number;
  benchmarkScoreModelId: number | null;
  benchmarkScoreModelVersion: number | null;
  benchmarkScoreModelName: string | null;
}

export interface RepaymentEstimate {
  monthly: number;
  fortnightly: number;
  totalInterestOverTerm: number;
}

export interface MarginResult {
  customerRate: number;
  estimatedCostOfFunds: number | null;
  estimatedMargin: number | null;
  targetMargin: number | null;
  hardMinimumMargin: number | null;
  status: MarginStatus;
}

export interface WarningItem {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface Profitability {
  customerRate: number | null;
  estimatedAnnualInterestRevenue: number | null;
  estimatedAnnualFundingCost: number | null;
  estimatedAnnualNetInterestIncome: number | null;
  netInterestMargin: number | null;
  revenueLostVsCarded: number | null;
  revenueLostVsSuggested: number | null;
  cashFlow?: AmortisingCashFlowSummary | null;
  expectedLoss?: ExpectedLossResult | null;

  // --- P&L waterfall ---
  // % lines (derived from rate + admin cost of funds).
  costOfFunds: number | null;
  grossMarginPct: number | null;
  // $ inputs (typed per quote). Commissions are distribution costs.
  channel: ProfitabilityChannel;
  commissions: number | null;
  otherIncome: number | null;
  feeIncome: QuoteFeeIncome;
  expenses: number | null;
  taxRatePct?: number | null;
  tax: number | null;
  averageAssets: number | null; // compatibility alias for the loan amount base
  // $ / % subtotals (derived rollups).
  netIncome: number | null;
  profitBeforeTax: number | null;
  profitAfterTax: number | null;
  returnOnAssets: number | null;
  capitalAllocation: import("./capital/types").CapitalAllocationResult | null;
}

export interface ApprovalReason {
  level: ApprovalLevel;
  message: string;
}

export interface CompetitorComparison {
  lenderName: string;
  productName: string;
  cdrProductId: string | null;
  advertisedRate: number;
  comparisonRate: number | null;
  sourceUrl: string | null;
  fetchedAt: string;
  lvr: number;
  rateGap: number;
  matchCount: number;
}

export type CustomerScoreCategory =
  "loan" | "risk" | "relationship" | "strategic";

export type CustomerScoreProductArea = "home" | "personal" | "commercial";

export type CustomerScoreField =
  | "channel"
  | "loanPurpose"
  | "rateType"
  | "fixedPeriodMonths"
  | "repaymentType"
  | "loanAmount"
  | "propertyValueAndLvr"
  | "loanTermYears"
  | "customerStream"
  | "competitorRate"
  | "requestedRate"
  | "requestedReason"
  | "livesInServiceRegion"
  | "vipCustomer"
  | "creditScore"
  | "dtiRatio"
  | "grossAnnualIncome"
  | "serviceabilityNsi"
  | "retentionArrearsHardship18Months"
  | "retentionArrearsPast12Months"
  | "yearsAsMember"
  | "existingLenderLoan"
  | "lenderProductCount"
  | "brokerInRegion"
  | "brokerVolumeBand"
  | "brokerDiscretionPct";

export type CustomerScoreFieldType = "number" | "boolean" | "enum";
export type CustomerScoreRuleOperator =
  "lte" | "lt" | "gte" | "gt" | "eq" | "between" | "present" | "missing";

export interface CustomerScoreNumericRule {
  id: string;
  label: string;
  operator: CustomerScoreRuleOperator;
  value?: number;
  valueMax?: number;
  score: number;
  reason?: string;
}

export interface CustomerScoreValueMapping {
  value: string | number | boolean | null;
  score: number;
  label: string;
  reason?: string;
}

export interface CustomerScoreAlternativeNumericSource {
  field: string;
  label: string;
  rules: CustomerScoreNumericRule[];
}

export type CustomerScoreScoringMethod = "step" | "linear_points";
export type CustomerScoreMonotonicDirection = "increasing" | "decreasing";

export interface CustomerScoreLinearPoint {
  value: number;
  score: number;
  label?: string;
}

export interface CustomerScoreFactorConfig {
  key: string;
  label: string;
  category: CustomerScoreCategory;
  // Field keys are validated at runtime against each vertical's allowed-field
  // catalog (home loans: ALLOWED_CUSTOMER_SCORE_FIELDS; personal/commercial:
  // their score-model modules), so the type stays vertical-agnostic.
  field: string;
  fieldType: CustomerScoreFieldType;
  enabled: boolean;
  weight: number;
  missingScore: number;
  // Omitted is the historical `step` method. Keeping it optional preserves the
  // byte shape and behavior of all existing governed/default models.
  scoringMethod?: CustomerScoreScoringMethod;
  points?: CustomerScoreLinearPoint[];
  monotonicDirection?: CustomerScoreMonotonicDirection;
  rules?: CustomerScoreNumericRule[];
  // A numeric factor may select the first populated alternative source while
  // retaining one shared weight and missing score. Existing models omit this.
  alternativeNumericSources?: CustomerScoreAlternativeNumericSource[];
  mappings?: CustomerScoreValueMapping[];
}

export interface CustomerScoreBandConfig {
  key: CustomerScoreResult["band"];
  label: string;
  minScore: number;
}

export interface CustomerScoreRateCurveConfig {
  // Omitted on historical governed models, which retain their signed
  // adjustment curve for immutable quote reconstruction.
  pricingBasis?: CustomerScorePricingBasis;
  neutralScore: number;
  discountSlope: number;
  loadingSlope: number;
  maxDiscount: number;
  maxLoading: number;
  // Personal v8+ can govern distinct secured/unsecured discount caps. Older
  // Personal models and the other verticals omit this map and retain the
  // single maxDiscount curve.
  maxDiscountBySecurity?: {
    secured: number;
    unsecured: number;
  };
  // Legacy-only neutral margin. Discount-entitlement curves always use zero;
  // historical Commercial curves may carry an additive facility margin.
  neutralMargin?: number;
}

export type CustomerScorePricingBasis =
  "legacy_signed_adjustment" | "discount_entitlement_v1";

export interface CustomerScoreModelConfig {
  id: number | null;
  productArea: CustomerScoreProductArea;
  version: number;
  name: string;
  description?: string | null;
  // Version-scoped publication metadata or legacy governance evidence is
  // carried only at the policy boundary; model bodies and quote score
  // explanations deliberately exclude it.
  governanceEvidence?: unknown;
  factors: CustomerScoreFactorConfig[];
  bands: CustomerScoreBandConfig[];
  rateCurve: CustomerScoreRateCurveConfig;
}

export interface CustomerScoreFactor {
  key: string;
  label: string;
  category: CustomerScoreCategory;
  weight: number;
  score: number;
  weightedPoints: number;
  reason: string;
}

export interface CustomerScoreResult {
  modelId?: number | null;
  modelVersion?: number;
  modelName?: string;
  score: number;
  band: "excellent" | "strong" | "standard" | "watch" | "weak";
  pricingBasis: CustomerScorePricingBasis;
  // Percentage of the vertical discount cap earned by the score (0..100).
  // Null only for legacy signed curves.
  discountEntitlementPct: number | null;
  // Score at or below which a discount-entitlement curve awards no discount.
  discountThresholdScore: number;
  maxDiscountPct: number;
  // Positive percentage-point discount magnitude. Legacy loadings report 0.
  scoreDiscountPct: number;
  // Historical compatibility alias: discount is negative, loading positive.
  pricingAdjustment: number;
  factors: CustomerScoreFactor[];
}

export interface PricingResult {
  lvr: number | null;
  cardedRate: number | null;
  cardedComparisonRate: number | null; // context/display only
  selectedRateBandId: number | null;
  selectedRateRole?: import("./rate-role").PublishedRateRole | null;
  customerScore: CustomerScoreResult | null;
  pricingBasis: CustomerScorePricingBasis;
  discountEntitlementPct: number | null;
  discountThresholdScore: number;
  maxDiscountPct: number;
  scoreDiscountPct: number;
  startingRate: number | null;
  discountBlockedByFloorPct: number;
  competitorComparison: CompetitorComparison | null;
  appliedAdjustments: AppliedAdjustment[];
  totalAdjustment: number; // signed sum (negative => net discount)
  totalDiscount: number; // magnitude of net discount (0 if net loading)
  suggestedRate: number | null;
  // Score-curve rate band around the suggested rate: floor = carded + max
  // discount, top = carded + max loading. Null when there is no carded rate.
  floorRate: number | null;
  topRate: number | null;
  requestedRate: number | null;
  finalDisplayRate: number | null; // rate used for repayment/margin (requested ?? suggested)
  requestedRateAnalysis: RequestedRateAnalysis | null;
  retentionPricing?:
    import("./retention-pricing").RetentionPricingConstraint | null;
  repaymentAtSuggested: RepaymentEstimate | null;
  repaymentAtRequested: RepaymentEstimate | null;
  monthlyRepayment: number | null;
  fortnightlyRepayment: number | null;
  estimatedAnnualInterestRevenue: number | null;
  margin: MarginResult;
  profitability: Profitability;
  approvalRequired: boolean;
  approvalLevel: ApprovalLevel;
  approvalReasons: ApprovalReason[];
  suggestedNextAction: string;
  warnings: WarningItem[];
  explanationText: string;
  policySnapshot?: PricingPolicySnapshot;
}
