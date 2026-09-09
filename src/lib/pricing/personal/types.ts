// Pure domain types for the personal loan pricing engine. Framework-free and
// deterministic, mirroring the home-loan engine's separation of concerns.

import type {
  ApprovalLevel,
  ApprovalReason,
  CustomerScoreResult,
  CustomerScorePricingBasis,
  EmploymentStability,
  MarginStatus,
  Operator,
  Profitability,
  ProfitabilityChannel,
  BrokerVolumeBand,
  LoanCustomerStream,
  RequestedRateBenchmark,
  PricingPolicySnapshot,
  WarningItem,
} from "@/lib/pricing/types";
import type { RetentionPricingConstraint } from "@/lib/pricing/retention-pricing";
import type { PublishedRateRole } from "@/lib/pricing/rate-role";

export type PersonalLoanPurpose =
  | "car_purchase"
  | "debt_consolidation"
  | "home_improvement"
  | "travel_lifestyle"
  | "medical"
  | "other";

export type PersonalSecurityType =
  "secured_vehicle" | "secured_savings" | "unsecured";

export type PersonalProductSecurityType = "secured" | "unsecured";

export type PersonalEmploymentStability =
  EmploymentStability | "government_benefits";

export type PersonalRiskTier =
  "tier_a" | "tier_b" | "tier_c" | "tier_d" | "tier_e" | "not_scored";

export type AffordabilityStatus =
  "not_assessed" | "comfortable" | "adequate" | "tight" | "insufficient";

export interface PersonalPricingInput {
  productId?: number | null;
  loanPurpose: PersonalLoanPurpose;
  securityType: PersonalSecurityType;
  loanAmount: number;
  loanTermMonths: number;

  creditScores?: number[];
  creditScore?: number | null; // arithmetic mean of Equifax scores
  employmentIncomeStability?: PersonalEmploymentStability;
  existingMember?: boolean;
  customerStream?: LoanCustomerStream;
  yearsAsMember?: number | null;
  currentCustomerRate?: number | null;
  retentionArrearsHardship18Months?: boolean | null;
  retentionArrearsPast12Months?: boolean | null;
  riskNotes?: string | null;

  netMonthlyIncome?: number | null;
  monthlyLivingExpenses?: number | null;
  existingMonthlyDebtRepayments?: number | null;

  marketRateId?: string | null;
  competitorLender?: string | null;
  competitorRate?: number | null;
  competitorNotes?: string | null;
  requestedRate?: number | null;
  requestedReason?: string | null;
  requestedReasonNotes?: string | null;

  // Profitability inputs feeding the annual P&L waterfall.
  // costOfFunds is a percentage p.a.; remaining line items are annual dollars.
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
  expectedCreditLossOverrideAmount?: number | null;
  expectedCreditLossOverrideEnabled?: boolean;
  expectedCreditLossOverrideReason?: string | null;
  riskWeightOverridePct?: number | null;
  taxRateOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

export interface PersonalProductConfig {
  id: number | null;
  name: string;
  productCategory: string;
  securityType: PersonalProductSecurityType;
  rateType: "fixed";
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  cardedRate: number;
  selectedRateId?: number | null;
  pricingRole?: PublishedRateRole;
  comparisonRate: number | null;
  active: boolean;
  notes: string | null;
  sourceUrl: string | null;
  fees: {
    establishmentFee: number | null;
    monthlyServiceFee: number | null;
    onlineRedrawFee: number | null;
    branchRedrawFee: number | null;
    defaultFee: number | null;
  };
  redrawAvailable: boolean;
}

export interface PersonalMarginSettingConfig {
  id: number;
  securityType: PersonalProductSecurityType | null;
  personalProductId: number | null;
  estimatedCostOfFunds: number;
  targetMargin: number;
  hardMinimumMargin: number;
  active: boolean;
}

export interface PersonalProfitabilityDefaultConfig {
  id: number;
  channel: ProfitabilityChannel;
  securityType: PersonalProductSecurityType;
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
  active: boolean;
}

export interface PersonalApprovalRuleConfig {
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

export interface PersonalProfitability extends Profitability {
  targetMargin: number | null;
  hardMinimumMargin: number | null;
  marginStatus: MarginStatus;
}

// One line of the rate build-up shown on the quote breakdown.
export interface PersonalRateComponent {
  key: string;
  label: string;
  amount: number; // signed percentage points
  reason: string;
}

export interface AffordabilityAssessment {
  status: AffordabilityStatus;
  netMonthlyIncome: number | null;
  monthlyLivingExpenses: number | null;
  existingMonthlyDebtRepayments: number | null;
  monthlySurplus: number | null; // income - expenses - existing debt
  monthlyRepayment: number | null;
  repaymentToSurplusPct: number | null; // repayment / surplus * 100
  residualMonthlyIncome: number | null; // surplus - repayment
}

export interface PersonalPricingResult {
  policySnapshot?: PricingPolicySnapshot;
  // Customer score drives the signed adjustment to the carded rate. Null only on
  // legacy quotes priced under the old risk-tier build-up.
  customerScore: CustomerScoreResult | null;
  pricingBasis: CustomerScorePricingBasis;
  discountEntitlementPct: number | null;
  discountThresholdScore: number;
  maxDiscountPct: number;
  scoreDiscountPct: number;
  startingRate: number;
  discountBlockedByFloorPct: number;
  // Legacy risk-tier fields — populated only on quotes saved before the
  // customer score model; new pricing never sets them.
  riskTier?: PersonalRiskTier;
  riskTierLabel?: string;
  riskTierMargin?: number;
  baseRate: number;
  selectedRateId?: number | null;
  selectedRateRole?: PublishedRateRole;
  productId?: number | null;
  productName?: string | null;
  comparisonRate?: number | null;
  productNotes?: string | null;
  components: PersonalRateComponent[];
  totalAdjustment: number; // score-derived signed adjustment to carded rate
  suggestedRate: number;
  // Score-curve rate band around the suggested rate, clamped to the personal
  // rate bounds: floor = base − max discount, top = base + max loading. Null on
  // legacy quotes reconstructed without a stored band.
  floorRate: number | null;
  topRate: number | null;
  requestedRate: number | null;
  requestedRateBenchmark: RequestedRateBenchmark | null;
  competitorRate: number | null;
  competitorGapFromSuggested: number | null;
  finalDisplayRate: number; // effective requested/constrained rate (drives economics)
  retentionPricing: RetentionPricingConstraint | null;
  monthlyRepayment: number;
  totalInterestOverTerm: number;
  profitability: PersonalProfitability;
  affordability: AffordabilityAssessment;
  approvalRequired: boolean;
  approvalLevel: ApprovalLevel;
  approvalReasons: ApprovalReason[];
  warnings: WarningItem[];
  explanationText: string;
}
