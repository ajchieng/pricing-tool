// Independently authored fictional demonstration policy and labels.
// Generic financial arithmetic and public regulatory classifications live in the engines.

import type {
  PersonalLoanPurpose,
  PersonalProductSecurityType,
  PersonalSecurityType,
} from "./types";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import { PROFITABILITY_TAX_RATE } from "@/lib/pricing/profitability-policy";

export const PERSONAL_LOAN_LIMITS = {
  minLoanAmount: 3_000,
  maxLoanAmount: 120_000,
  maxUnsecuredLoanAmount: 60_000,
  minTermMonths: 12,
  maxTermMonths: 96,
} as const;

// Base annual rate by security position. Lender publishes one fully-secured
// personal-loan rate and one unsecured/other personal-loan rate.
export const PERSONAL_BASE_RATES: Record<
  PersonalSecurityType,
  { label: string; rate: number }
> = {
  secured_vehicle: { label: "Secured Personal Loan", rate: 8.35 },
  secured_savings: { label: "Secured Personal Loan", rate: 8.35 },
  unsecured: { label: "Unsecured Personal Loan", rate: 12.65 },
};

// Absolute guardrails on the suggested rate after the score adjustment.
export const PERSONAL_RATE_BOUNDS = {
  // Historical signed curves use this fallback bound. Discount-only models use
  // their governed effective cap, including distinct security-specific caps.
  floorBelowBase: 1.2,
  ceiling: 22.0,
} as const;

// Affordability thresholds on repayment as a share of monthly surplus
// (net income − living expenses − existing debt repayments).
export const PERSONAL_AFFORDABILITY = {
  comfortableMaxPct: 45,
  adequateMaxPct: 72,
  tightMaxPct: 100, // above this => insufficient
} as const;

// Approval escalation thresholds.
export const PERSONAL_APPROVAL = {
  unsecuredManagerAmount: 35_000, // unsecured above this => manager
  largeAmountManager: 90_000, // any security type above this => manager
  requestedBelowSuggestedManager: 0.3, // discount beyond this => manager
  requestedBelowSuggestedSenior: 0.9, // discount beyond this => senior
} as const;

// Fictional personal-loan profitability assumptions.
// Quote inputs can override any dollar line item or cost of funds. The annual
// dollar defaults below are derived as % of loan amount in the calculator.
export const PERSONAL_PROFITABILITY_TAX_RATE = PROFITABILITY_TAX_RATE;

export const PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS: Record<
  PersonalProductSecurityType,
  {
    costOfFunds: number;
    targetMargin: number;
    hardMinimumMargin: number;
    expensesPct: number;
  }
> = {
  secured: {
    costOfFunds: 4.1,
    targetMargin: 2.4,
    hardMinimumMargin: 1.2,
    expensesPct: 0.7,
  },
  unsecured: {
    costOfFunds: 4.8,
    targetMargin: 4.2,
    hardMinimumMargin: 2.8,
    expensesPct: 1.25,
  },
};

export const PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS: Record<
  ProfitabilityChannel,
  {
    commissionsPct: number;
    otherIncomePct: number;
  }
> = {
  direct: {
    commissionsPct: 0,
    otherIncomePct: 0.08,
  },
  broker: {
    commissionsPct: 0.8,
    otherIncomePct: 0.06,
  },
  online: {
    commissionsPct: 0,
    otherIncomePct: 0.04,
  },
};

export const PERSONAL_PURPOSE_LABELS: Record<PersonalLoanPurpose, string> = {
  car_purchase: "Car purchase",
  debt_consolidation: "Debt consolidation",
  home_improvement: "Home improvement",
  travel_lifestyle: "Travel / lifestyle",
  medical: "Medical",
  other: "Other",
};

export const PERSONAL_SECURITY_LABELS: Record<PersonalSecurityType, string> = {
  secured_vehicle: "Secured — vehicle",
  secured_savings: "Secured — Lender savings",
  unsecured: "Unsecured",
};

export function personalProductSecurityType(
  securityType: PersonalSecurityType,
): PersonalProductSecurityType {
  return securityType === "unsecured" ? "unsecured" : "secured";
}
