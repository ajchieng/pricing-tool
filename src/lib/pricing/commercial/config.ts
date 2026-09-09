// Independently authored fictional demonstration policy and labels.
// Generic financial arithmetic and public regulatory classifications live in the engines.

import type {
  BusinessRiskGrade,
  CommercialFacilityType,
  CommercialLoanType,
  CommercialSecurityType,
  FinancialsQuality,
  IndustryCategory,
  ProfitTrend,
  RevenueTrend,
  TaxStatus,
} from "./types";
import { PROFITABILITY_TAX_RATE } from "@/lib/pricing/profitability-policy";

export const COMMERCIAL_LOAN_LIMITS = {
  minLoanAmount: 40_000,
  maxLoanAmount: 6_000_000,
  minTermYears: 1,
  maxTermYears: 24,
} as const;

export const COMMERCIAL_PROFITABILITY_TAX_RATE = PROFITABILITY_TAX_RATE;

export const COMMERCIAL_LOAN_TYPES = [
  "standard",
  "non_standard",
] as const satisfies readonly CommercialLoanType[];

// Reference base rates per facility and loan type. Governed product-rate rows
// override these values independently for every facility × loan-type scope.
// New discount-only quotes start from this selected base rate. Historical
// pricing bases may still reconstruct an additive score-derived margin.
export const COMMERCIAL_BASE_RATES: Record<
  CommercialFacilityType,
  Record<
    CommercialLoanType,
    { label: string; baseRateName: string; rate: number }
  >
> = {
  term_loan: {
    standard: {
      label: "Business term loan",
      baseRateName: "Lender Business Lending Base Rate",
      rate: 8.15,
    },
    non_standard: {
      label: "Business term loan",
      baseRateName: "Lender Business Lending Base Rate",
      rate: 9.25,
    },
  },
  overdraft: {
    standard: {
      label: "Business overdraft",
      baseRateName: "Lender Overdraft Base Rate",
      rate: 8.15,
    },
    non_standard: {
      label: "Business overdraft",
      baseRateName: "Lender Overdraft Base Rate",
      rate: 9.25,
    },
  },
  equipment_finance: {
    standard: {
      label: "Equipment finance",
      baseRateName: "Lender Equipment Finance Base Rate",
      rate: 8.15,
    },
    non_standard: {
      label: "Equipment finance",
      baseRateName: "Lender Equipment Finance Base Rate",
      rate: 9.25,
    },
  },
  commercial_property: {
    standard: {
      label: "Commercial property loan",
      baseRateName: "Lender Commercial Property Base Rate",
      rate: 8.15,
    },
    non_standard: {
      label: "Commercial property loan",
      baseRateName: "Lender Commercial Property Base Rate",
      rate: 9.25,
    },
  },
};

// Display labels for the risk/security/industry inputs. These inputs feed the
// customer score model rather than carrying their own margin tables.
export const RISK_GRADE_LABELS: Record<BusinessRiskGrade, string> = {
  grade_1: "Grade 1 — Strong",
  grade_2: "Grade 2 — Sound",
  grade_3: "Grade 3 — Acceptable",
  grade_4: "Grade 4 — Elevated",
  grade_5: "Grade 5 — Watch",
};

export const INDUSTRY_LABELS: Record<IndustryCategory, string> = {
  agriculture: "Agriculture",
  manufacturing: "Manufacturing",
  construction: "Construction",
  retail_hospitality: "Retail / hospitality",
  transport_logistics: "Transport / logistics",
  professional_services: "Professional services",
  health_education: "Health / education",
  property_investment: "Property investment",
  other: "Other",
};

export const FINANCIALS_QUALITY_LABELS: Record<FinancialsQuality, string> = {
  audited: "Audited financials",
  accountant_prepared: "Accountant-prepared",
  management_accounts: "Management accounts",
  estimated: "Estimated / owner-provided",
};

export const REVENUE_TREND_LABELS: Record<RevenueTrend, string> = {
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
  volatile: "Volatile",
};

export const PROFIT_TREND_LABELS: Record<ProfitTrend, string> = {
  improving: "Improving",
  stable_profitable: "Stable profitable",
  breakeven: "Break-even / thin",
  loss_making: "Loss-making",
};

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  clear: "Clear",
  payment_plan: "Payment plan",
  arrears: "Arrears",
  unknown: "Unknown",
};

export const COMMERCIAL_SECURITY_LABELS: Record<
  CommercialSecurityType,
  string
> = {
  commercial_property: "Commercial property",
  residential_property: "Residential property",
  business_assets: "Business assets (GSA)",
  cash_deposits: "Cash / deposits held",
  unsecured: "Unsecured",
};

// Coverage bands from securityValue / loanAmount — display and warnings only;
// coverage feeds the score model as a factor.
export const SECURITY_COVERAGE_LABELS: Array<{
  minCoverage: number; // ratio, e.g. 1.5 = 150% of the facility
  label: string;
}> = [
  { minCoverage: 1.5, label: "Fully secured (≥150% coverage)" },
  { minCoverage: 1.0, label: "Secured (≥100% coverage)" },
  { minCoverage: 0.5, label: "Partially secured (≥50% coverage)" },
  { minCoverage: 0, label: "Largely unsecured (<50% coverage)" },
];

// Legacy-only score-margin floor retained for historical reconstruction and
// old governed policy rows. Discount-only calculations do not apply it.
export const COMMERCIAL_MARGIN_FLOOR = 0.9;

// Facility fees.
export const COMMERCIAL_FEES = {
  establishmentFeePct: 0.4, // % of facility limit
  establishmentFeeMin: 650,
  overdraftLineFeePct: 0.65, // % p.a. of limit, overdrafts only
  equipmentDocumentationFee: 275,
} as const;

export const COMMERCIAL_POLICY_PRODUCT_NOTE =
  "Commercial lending policy baseline.";

// Debt-service cover (EBITDA / total annual debt service) bands.
export const DSCR_BANDS = {
  strongMin: 1.8,
  acceptableMin: 1.35,
  marginalMin: 1.15, // below marginalMin but >= 1.0 is still "marginal"; < 1.0 insufficient
} as const;

// Largest-customer revenue share above this percentage is captured as a
// Yes/No commercial risk fact. The active CommercialApprovalSetting overrides
// this demonstration value and each saved quote snapshots the threshold it used.
export const COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT = 32;

// Approval escalation thresholds.
export const COMMERCIAL_APPROVAL = {
  seniorExposure: 1_200_000, // facility above this => senior
  reviewExposure: 3_000_000, // facility above this => review
  requestedBelowIndicativeManager: 0.2,
  requestedBelowIndicativeSenior: 0.6,
} as const;

export const FACILITY_TYPE_LABELS: Record<CommercialFacilityType, string> = {
  term_loan: "Business term loan",
  overdraft: "Business overdraft",
  equipment_finance: "Equipment finance",
  commercial_property: "Commercial property loan",
};
