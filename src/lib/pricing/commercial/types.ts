// Pure domain types for the commercial loan pricing engine. Framework-free
// and deterministic. New Commercial pricing discounts the selected base rate
// from a customer score built from business risk, security, facility,
// cash-flow and relationship facts.

import type {
  ApprovalLevel,
  ApprovalReason,
  CustomerScoreResult,
  CustomerScorePricingBasis,
  Profitability,
  ProfitabilityChannel,
  RequestedRateBenchmark,
  WarningItem,
  PricingPolicySnapshot,
} from "@/lib/pricing/types";
import type {
  CapitalStandardStatus,
  CommercialCapitalExposureClass,
} from "@/lib/pricing/capital/types";
import type { PublishedRateRole } from "@/lib/pricing/rate-role";

export type CommercialFacilityType =
  "term_loan" | "overdraft" | "equipment_finance" | "commercial_property";

export type CommercialLoanType = "standard" | "non_standard";

export type CommercialPropertyTransactionType = "purchase" | "refinance";

export type CommercialRepaymentType =
  "principal_and_interest" | "interest_only" | "revolving";

export type IndustryCategory =
  | "agriculture"
  | "manufacturing"
  | "construction"
  | "retail_hospitality"
  | "transport_logistics"
  | "professional_services"
  | "health_education"
  | "property_investment"
  | "other";

// grade_1 = strongest, grade_5 = watch list.
export type BusinessRiskGrade =
  "grade_1" | "grade_2" | "grade_3" | "grade_4" | "grade_5";

export type FinancialsQuality =
  "audited" | "accountant_prepared" | "management_accounts" | "estimated";

export type RevenueTrend = "growing" | "stable" | "declining" | "volatile";

export type ProfitTrend =
  "improving" | "stable_profitable" | "breakeven" | "loss_making";

export type TaxStatus = "clear" | "payment_plan" | "arrears" | "unknown";

export type CommercialSecurityType =
  | "commercial_property"
  | "residential_property"
  | "business_assets"
  | "cash_deposits"
  | "unsecured";

export interface CommercialSecurityInput {
  type: CommercialSecurityType;
  value: number | null;
  description?: string | null;
  isPrimary: boolean;
}

export interface CommercialPricingInput {
  facilityType: CommercialFacilityType;
  /** Defaults to standard at the request and engine compatibility boundary. */
  loanType?: CommercialLoanType;
  loanAmount: number;
  purchasePrice?: number | null;
  customerEquityContribution?: number | null;
  propertyTransactionType?: CommercialPropertyTransactionType | null;
  /** @deprecated Legacy equipment request compatibility only. */
  equipmentPurchasePrice?: number | null;
  /** @deprecated Legacy equipment request compatibility only. */
  equipmentCustomerContribution?: number | null;
  loanTermYears?: number | null; // null for revolving overdrafts
  repaymentType: CommercialRepaymentType;

  industryCategory: IndustryCategory;
  businessRiskGrade: BusinessRiskGrade;
  yearsTrading?: number | null;
  annualRevenue?: number | null;
  ebitda?: number | null;
  existingAnnualDebtService?: number | null;
  financialsQuality?: FinancialsQuality | null;
  financialsAgeMonths?: number | null;
  revenueTrend?: RevenueTrend | null;
  profitTrend?: ProfitTrend | null;
  taxStatus?: TaxStatus | null;
  largestCustomerRevenueAboveThreshold?: boolean | null;
  // Legacy compatibility input only. New quote workspaces capture the
  // governed threshold question above instead of a raw percentage.
  customerConcentrationPct?: number | null;

  securityType: CommercialSecurityType;
  securityValue?: number | null;
  securities?: CommercialSecurityInput[];

  existingRelationship?: boolean;
  operatingInRegion?: boolean | null;
  vipCustomer?: boolean;
  yearsWithLender?: number | null;
  otherLenderExposure?: number | null;

  marketRateId?: string | null;
  competitorLender?: string | null;
  competitorRate?: number | null;
  competitorNotes?: string | null;
  requestedRate?: number | null;
  requestedReason?: string | null;
  requestedReasonNotes?: string | null;

  // Annual Lender deal-profitability inputs. Product/facility fees are display
  // context only and never feed this waterfall.
  channel?: ProfitabilityChannel;
  brokerName?: string | null;
  brokerCompany?: string | null;
  expectedUtilisationPct?: number | null;
  costOfFunds?: number | null;
  commissions?: number | null;
  otherIncome?: number | null;
  upfrontFeeOverride?: number | null;
  monthlyFeeOverride?: number | null;
  expenses?: number | null;
  expectedCreditLossOverrideAmount?: number | null;
  expectedCreditLossOverrideEnabled?: boolean;
  expectedCreditLossOverrideReason?: string | null;

  currentDrawnBalance?: number | null;
  apsExposureClass?: CommercialCapitalExposureClass | null;
  capitalClassificationConfirmed?: boolean;
  capitalPropertyStandardStatus?: CapitalStandardStatus | null;
  capitalPropertyCashFlowDependent?: boolean | null;
  riskWeightOverridePct?: number | null;
  taxRateOverridePct?: number | null;
  creditConversionFactorOverridePct?: number | null;
  capitalOverrideReason?: string | null;
}

// Governed per-channel / per-facility profitability defaults, expressed as
// % of profitability exposure p.a. Blank annual line items resolve to these
// at calculation time; explicit quote inputs always win.
export interface CommercialProfitabilityDefaultConfig {
  id: number;
  channel: ProfitabilityChannel;
  facilityType: CommercialFacilityType;
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
  active: boolean;
}

// One legacy margin-build component retained for historical reconstruction.
export interface MarginComponent {
  key: string;
  label: string;
  amount: number; // signed percentage points
  reason: string;
}

export type ServiceabilityBand =
  "not_assessed" | "strong" | "acceptable" | "marginal" | "insufficient";

export interface CashFlowAssessment {
  band: ServiceabilityBand;
  ebitda: number | null;
  existingAnnualDebtService: number | null;
  newAnnualDebtService: number | null;
  totalAnnualDebtService: number | null;
  debtServiceCoverRatio: number | null; // EBITDA / total debt service
}

export interface SecurityAssessment {
  securities: CommercialSecurityInput[];
  primarySecurityType: CommercialSecurityType;
  totalSecurityValue: number | null;
  securityValue: number | null;
  securityCoverageRatio: number | null; // securityValue / loanAmount
  label: string;
}

export interface CommercialFees {
  establishmentFee: number;
  annualLineFeePct: number | null; // overdraft facilities only
  documentationFee: number | null; // equipment finance only
}

export interface CommercialMarginAssessment {
  costOfFunds: number | null;
  estimatedMargin: number | null;
  targetMargin: number | null;
  scoreMarginFloorPct: number;
  hardMinimumNetInterestMarginPct: number;
  /** Historical/UI compatibility alias for hardMinimumNetInterestMarginPct. */
  hardMinimumMargin: number;
  status: "unavailable" | "healthy" | "below_target" | "below_hard_minimum";
}

export interface CommercialProfitability extends Profitability {
  expectedUtilisationPct: number;
  profitabilityExposure: number;
}

export interface CommercialPricingResult {
  policySnapshot?: PricingPolicySnapshot;
  // Customer score drives the discount from the selected base rate. It is null
  // only on legacy quotes that predate the governed score model.
  customerScore: CustomerScoreResult | null;
  pricingBasis: CustomerScorePricingBasis;
  discountEntitlementPct: number | null;
  discountThresholdScore: number;
  maxDiscountPct: number;
  scoreDiscountPct: number;
  startingRate: number;
  suggestedRate: number;
  discountBlockedByFloorPct: number;
  // Governed cutoff used by the score calculation and persisted with the quote.
  customerConcentrationThresholdPct: number;
  // Null only when reconstructing a historical quote saved before this input
  // was captured. New calculations always return a canonical value.
  loanType: CommercialLoanType | null;
  baseRateName: string;
  baseRate: number;
  selectedRateId?: number | null;
  selectedRateRole?: PublishedRateRole;
  // Legacy margin components — populated only on quotes saved before the
  // customer score model; new pricing emits an empty list.
  components: MarginComponent[];
  // Compatibility signed movement: negative for a new score discount, or the
  // historical score-derived margin for a legacy pricing basis.
  totalMargin: number;
  marginFloorApplied: boolean;
  indicativeRate: number; // compatibility alias for suggestedRate
  // New basis: base minus full discount through base. Legacy basis: the saved
  // score-margin/loading band. Null on old quotes without a stored band.
  floorRate: number | null;
  topRate: number | null;
  requestedRate: number | null;
  requestedRateBenchmark: RequestedRateBenchmark | null;
  competitorRate: number | null;
  competitorGapFromIndicative: number | null;
  finalDisplayRate: number; // requested ?? indicative (drives repayments)
  cashFlow: CashFlowAssessment;
  security: SecurityAssessment;
  fees: CommercialFees;
  margin: CommercialMarginAssessment;
  profitability: CommercialProfitability;
  annualRepayment: number | null; // null when the facility is revolving
  monthlyRepayment: number | null;
  approvalRequired: boolean;
  approvalLevel: ApprovalLevel;
  approvalReasons: ApprovalReason[];
  warnings: WarningItem[];
  explanationText: string;
}
