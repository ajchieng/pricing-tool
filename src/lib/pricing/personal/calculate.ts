// Personal loan pricing engine — pure and deterministic. Rate build-up:
//   product carded rate + customer score adjustment
// where the customer score synthesises borrower risk, affordability, loan
// details into one governed model (./score-model), plus a
// repayment-affordability assessment that drives warnings and approval
// escalation. Base rates, bounds and thresholds come from ./config.

import type {
  ApprovalLevel,
  ApprovalReason,
  CustomerScoreModelConfig,
  Operator,
  PolicyComponentFallbacks,
  WarningItem,
} from "@/lib/pricing/types";
import {
  PERSONAL_AFFORDABILITY,
  PERSONAL_BASE_RATES,
  PERSONAL_LOAN_LIMITS,
  PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS,
  PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS,
  PERSONAL_RATE_BOUNDS,
  PERSONAL_SECURITY_LABELS,
  personalProductSecurityType,
} from "./config";
import {
  DEFAULT_PERSONAL_SCORE_MODEL,
  evaluatePersonalScoreModel,
} from "./score-model";
import { personalRateCurveForSecurity } from "./discount-policy";
import {
  isDiscountEntitlementCurve,
  pricingAdjustmentRangeForCurve,
} from "../score-engine";
import type {
  AffordabilityAssessment,
  PersonalApprovalRuleConfig,
  PersonalMarginSettingConfig,
  PersonalProfitabilityDefaultConfig,
  PersonalProductConfig,
  PersonalPricingInput,
  PersonalPricingResult,
} from "./types";
import { calculateCapitalAllocation } from "@/lib/pricing/capital/calculate";
import { classifyPersonalCapital } from "@/lib/pricing/capital/personal";
import {
  isPolicyPercentBelow,
  policyPercentDifference,
} from "@/lib/pricing/policy-percent";
import {
  calculateQuoteFeeIncome,
  type QuoteFeeSettingConfig,
} from "@/lib/pricing/quote-fees";
import {
  applyRetentionPricingConstraint,
  type RetentionPricingConstraint,
} from "@/lib/pricing/retention-pricing";
import { fallbackPersonalApprovalRules } from "./approval-policy";
import { selectPersonalMarginSetting } from "@/lib/pricing/cost-of-funds-defaults";
import { amortisingCashFlow } from "@/lib/pricing/cash-flow";
import {
  isMinimumCustomerRate,
  publishedRateRole,
} from "@/lib/pricing/rate-role";
import { personalEmploymentRequiresReview } from "./employment-stability";

const APPROVAL_SEVERITY: Record<ApprovalLevel, number> = {
  none: 0,
  manager: 1,
  senior: 2,
  review: 3,
  exception: 4,
};

function maxApproval(a: ApprovalLevel, b: ApprovalLevel): ApprovalLevel {
  return APPROVAL_SEVERITY[b] > APPROVAL_SEVERITY[a] ? b : a;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function amountFromPct(loanAmount: number, pct: number): number {
  return round2(loanAmount * (pct / 100));
}

function compare(
  actual: number,
  operator: Operator,
  expected: number,
): boolean {
  switch (operator) {
    case "lte":
      return actual <= expected;
    case "lt":
      return actual < expected;
    case "gte":
      return actual >= expected;
    case "gt":
      return actual > expected;
    case "eq":
      return actual === expected;
    default:
      return false;
  }
}

export function monthlyRepaymentFor(
  loanAmount: number,
  annualRatePct: number,
  termMonths: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (loanAmount * r * factor) / (factor - 1);
}

export function validatePersonalInput(
  input: PersonalPricingInput,
  product: PersonalProductConfig | null = null,
): string[] {
  const errors: string[] = [];
  const L = PERSONAL_LOAN_LIMITS;
  const minLoanAmount = product?.minLoanAmount ?? L.minLoanAmount;
  const maxLoanAmount = product?.maxLoanAmount ?? L.maxLoanAmount;
  const minTermMonths = product?.minTermMonths ?? L.minTermMonths;
  const maxTermMonths = product?.maxTermMonths ?? L.maxTermMonths;
  if (input.loanAmount < minLoanAmount || input.loanAmount > maxLoanAmount) {
    errors.push(
      `Loan amount must be between $${minLoanAmount.toLocaleString("en-AU")} and $${maxLoanAmount.toLocaleString("en-AU")}.`,
    );
  }
  if (
    input.loanTermMonths < minTermMonths ||
    input.loanTermMonths > maxTermMonths
  ) {
    errors.push(
      `Loan term must be between ${minTermMonths} and ${maxTermMonths} months.`,
    );
  }
  return errors;
}

function assessAffordability(
  input: PersonalPricingInput,
  monthlyRepayment: number | null,
): AffordabilityAssessment {
  const income = input.netMonthlyIncome ?? null;
  const expenses = input.monthlyLivingExpenses ?? null;
  const existingDebt = input.existingMonthlyDebtRepayments ?? null;

  if (income == null || expenses == null || monthlyRepayment == null) {
    return {
      status: "not_assessed",
      netMonthlyIncome: income,
      monthlyLivingExpenses: expenses,
      existingMonthlyDebtRepayments: existingDebt,
      monthlySurplus: null,
      monthlyRepayment,
      repaymentToSurplusPct: null,
      residualMonthlyIncome: null,
    };
  }

  const surplus = income - expenses - (existingDebt ?? 0);
  const pct = surplus > 0 ? (monthlyRepayment / surplus) * 100 : null;
  const A = PERSONAL_AFFORDABILITY;
  const status =
    surplus <= 0 || pct == null || pct > A.tightMaxPct
      ? "insufficient"
      : pct <= A.comfortableMaxPct
        ? "comfortable"
        : pct <= A.adequateMaxPct
          ? "adequate"
          : "tight";

  return {
    status,
    netMonthlyIncome: income,
    monthlyLivingExpenses: expenses,
    existingMonthlyDebtRepayments: existingDebt,
    monthlySurplus: round2(surplus),
    monthlyRepayment,
    repaymentToSurplusPct: pct == null ? null : round2(pct),
    residualMonthlyIncome: round2(surplus - monthlyRepayment),
  };
}

interface PersonalApprovalFacts {
  loanAmount: number;
  unsecuredAmount: number | null;
  requestedBelowSuggestedAmount: number;
  creditNotScored: boolean;
  scoreBandWatch: boolean;
  scoreBandWeak: boolean;
  affordabilityTight: boolean;
  affordabilityNotAssessed: boolean;
  marginBelowTarget: boolean;
  marginBelowHardMin: boolean;
  employmentReviewRequired: boolean;
  retentionApplied: boolean;
}

function booleanCondition(
  value: boolean,
  rule: PersonalApprovalRuleConfig,
): boolean {
  if (rule.conditionValue === "false") return value === false;
  return value === true;
}

export function evaluatePersonalApproval(
  rules: PersonalApprovalRuleConfig[],
  facts: PersonalApprovalFacts,
): { level: ApprovalLevel; reasons: ApprovalReason[] } {
  const activeRules = (
    rules.length > 0 ? rules : fallbackPersonalApprovalRules()
  )
    .filter((rule) => rule.active)
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
  const reasons: ApprovalReason[] = [];
  let level: ApprovalLevel = "none";

  for (const rule of activeRules) {
    const expected = Number(rule.conditionValue);
    let matched = false;
    switch (rule.conditionType) {
      case "loan_amount":
        matched = compare(facts.loanAmount, rule.conditionOperator, expected);
        break;
      case "unsecured_amount":
        matched =
          facts.unsecuredAmount != null &&
          compare(facts.unsecuredAmount, rule.conditionOperator, expected);
        break;
      case "requested_below_suggested":
        matched =
          Number.isFinite(expected) && rule.conditionValue !== ""
            ? compare(
                facts.requestedBelowSuggestedAmount,
                rule.conditionOperator,
                expected,
              )
            : facts.requestedBelowSuggestedAmount > 0;
        break;
      case "credit_not_scored":
        matched = booleanCondition(facts.creditNotScored, rule);
        break;
      case "score_band_watch":
        matched = booleanCondition(facts.scoreBandWatch, rule);
        break;
      case "score_band_weak":
        matched = booleanCondition(facts.scoreBandWeak, rule);
        break;
      case "affordability_tight":
        matched = booleanCondition(facts.affordabilityTight, rule);
        break;
      case "affordability_not_assessed":
        matched = booleanCondition(facts.affordabilityNotAssessed, rule);
        break;
      case "margin_below_target":
        matched = booleanCondition(facts.marginBelowTarget, rule);
        break;
      case "margin_below_hard_min":
        matched = booleanCondition(facts.marginBelowHardMin, rule);
        break;
      case "employment_review_required":
        matched = booleanCondition(facts.employmentReviewRequired, rule);
        break;
      case "retention_applied":
        matched = booleanCondition(facts.retentionApplied, rule);
        break;
      default:
        matched = false;
    }
    if (matched && rule.approvalLevel !== "none") {
      reasons.push({ level: rule.approvalLevel, message: rule.reasonText });
      level = maxApproval(level, rule.approvalLevel);
    }
  }

  reasons.sort(
    (a, b) => APPROVAL_SEVERITY[b.level] - APPROVAL_SEVERITY[a.level],
  );
  return { level, reasons };
}

function resolvePersonalMargin({
  input,
  marginSettings,
  product,
  productMatchesInput,
  finalDisplayRate,
}: {
  input: PersonalPricingInput;
  marginSettings: PersonalMarginSettingConfig[];
  product: PersonalProductConfig | null;
  productMatchesInput: boolean;
  finalDisplayRate: number;
}): {
  costOfFunds: number;
  estimatedMargin: number;
  targetMargin: number | null;
  hardMinimumMargin: number | null;
  status: PersonalPricingResult["profitability"]["marginStatus"];
} {
  const securityClass = productMatchesInput
    ? product!.securityType
    : personalProductSecurityType(input.securityType);
  const inputCostOfFunds =
    input.costOfFunds != null && input.costOfFunds >= 0
      ? input.costOfFunds
      : null;
  const setting = selectPersonalMarginSetting(
    marginSettings,
    product?.id ?? null,
    securityClass,
  );
  const fallbackAssumptions =
    PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS[securityClass];
  const costOfFunds =
    inputCostOfFunds ??
    setting?.estimatedCostOfFunds ??
    fallbackAssumptions.costOfFunds;
  const exactMargin = policyPercentDifference(finalDisplayRate, costOfFunds);
  const estimatedMargin = round2(exactMargin);
  const targetMargin =
    setting?.targetMargin ?? fallbackAssumptions.targetMargin;
  const hardMinimumMargin =
    setting?.hardMinimumMargin ?? fallbackAssumptions.hardMinimumMargin;
  let status: PersonalPricingResult["profitability"]["marginStatus"] =
    "healthy";
  if (isPolicyPercentBelow(exactMargin, hardMinimumMargin)) {
    status = "below_hard_minimum";
  } else if (isPolicyPercentBelow(exactMargin, targetMargin)) {
    status = "below_target";
  }

  return {
    costOfFunds,
    estimatedMargin,
    targetMargin,
    hardMinimumMargin,
    status,
  };
}

function resolvePersonalProfitabilityDefaults(
  defaults: PersonalProfitabilityDefaultConfig[],
  channel: PersonalPricingInput["channel"],
  securityType: PersonalProductConfig["securityType"],
) {
  const normalizedChannel = channel ?? "direct";
  const row =
    defaults.find(
      (item) =>
        item.active &&
        item.channel === normalizedChannel &&
        item.securityType === securityType,
    ) ?? null;
  const channelAssumptions =
    PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS[normalizedChannel];
  const securityAssumptions =
    PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS[securityType];
  return {
    commissionsPct: row?.commissionsPct ?? channelAssumptions.commissionsPct,
    otherIncomePct: row?.otherIncomePct ?? channelAssumptions.otherIncomePct,
    expensesPct: row?.expensesPct ?? securityAssumptions.expensesPct,
  };
}

export function calculatePersonalLoanPricing(
  input: PersonalPricingInput,
  scoreModel: CustomerScoreModelConfig = DEFAULT_PERSONAL_SCORE_MODEL,
  product: PersonalProductConfig | null = null,
  governedConfig: {
    marginSettings?: PersonalMarginSettingConfig[];
    approvalRules?: PersonalApprovalRuleConfig[];
    profitabilityDefaults?: PersonalProfitabilityDefaultConfig[];
    capitalRatioPct?: number | null;
    quoteFeeSetting?: QuoteFeeSettingConfig;
    componentFallbacks?: PolicyComponentFallbacks;
  } = {},
): PersonalPricingResult {
  const warnings: WarningItem[] = [];
  const approvalReasons: ApprovalReason[] = [];
  let approvalLevel: ApprovalLevel = "none";

  const escalate = (level: ApprovalLevel, message: string) => {
    approvalLevel = maxApproval(approvalLevel, level);
    approvalReasons.push({ level, message });
  };

  const componentWarnings: Array<{
    key: Exclude<keyof PolicyComponentFallbacks, "product">;
    code: string;
    message: string;
    severity?: WarningItem["severity"];
  }> = [
    {
      key: "scoreModel",
      code: "personal_score_model_fallback",
      message:
        "No current governed personal score model is available; compiled score policy is in use.",
    },
    {
      key: "margin",
      code: "personal_margin_fallback",
      message:
        "No matching governed personal margin setting is available; compiled margin assumptions are in use and pricing requires an exception.",
      severity: "critical",
    },
    {
      key: "approval",
      code: "personal_approval_fallback",
      message:
        "The complete governed personal approval-rule set is unavailable; compiled escalation rules are in use.",
    },
    {
      key: "profitability",
      code: "personal_profitability_fallback",
      message:
        "One or more governed personal profitability scopes are incomplete; compiled line-item assumptions are in use.",
    },
    {
      key: "fees",
      code: "personal_fee_fallback",
      message:
        "The governed personal quote-fee setting is unavailable; quote fees default to zero.",
    },
    {
      key: "capital",
      code: "personal_capital_fallback",
      message:
        "The governed capital-allocation setting is unavailable; indicative ROE cannot be completed.",
    },
  ];
  for (const warning of componentWarnings) {
    if (governedConfig.componentFallbacks?.[warning.key]) {
      warnings.push({
        code: warning.code,
        message: warning.message,
        severity: warning.severity ?? "warning",
      });
    }
  }
  // --- Rate build-up: carded rate minus score discount (legacy curves retain
  // their signed movement only for historical compatibility) ---
  const fallbackBase = PERSONAL_BASE_RATES[input.securityType];
  const productMatchesInput =
    product?.securityType === personalProductSecurityType(input.securityType);
  const securityClass = productMatchesInput
    ? product.securityType
    : personalProductSecurityType(input.securityType);
  // A governed product always carries a numeric id. `id == null` (the code
  // fallback product) or a security-class mismatch means we are pricing off the
  // hardcoded bootstrap rates rather than the governed catalogue.
  const usingGovernedProduct =
    product != null && product.id != null && productMatchesInput;
  const base = usingGovernedProduct
    ? { label: product.name, rate: product.cardedRate }
    : fallbackBase;
  const selectedRateId = usingGovernedProduct
    ? (product.selectedRateId ?? null)
    : null;
  const selectedRateRole = usingGovernedProduct
    ? publishedRateRole(product.pricingRole)
    : "carded_pricing_anchor";
  if (!usingGovernedProduct) {
    warnings.push({
      code: "personal_product_fallback",
      message:
        "No active governed personal loan product and rate matched this scenario — priced from code fallback rates. Indicative only; confirm against the current Lender catalogue.",
      severity: "warning",
    });
  }

  // Enforce the selected product's own amount/term limits (the zod schema only
  // guards the global policy envelope). A breach is a hard stop, mirroring the
  // home-loan below/above-limit behaviour.
  const limitErrors = validatePersonalInput(
    input,
    usingGovernedProduct ? product : null,
  );
  for (const message of limitErrors) {
    warnings.push({
      code: "personal_limit_breach",
      message,
      severity: "critical",
    });
    escalate("exception", message);
  }

  const customerScore = evaluatePersonalScoreModel(input, scoreModel, {
    baseRate: base.rate,
  });

  const totalAdjustment = customerScore.pricingAdjustment;
  const discountOnly = isDiscountEntitlementCurve(scoreModel.rateCurve);
  const floor = isMinimumCustomerRate(selectedRateRole)
    ? base.rate
    : discountOnly
      ? Number.NEGATIVE_INFINITY
      : base.rate - PERSONAL_RATE_BOUNDS.floorBelowBase;
  const rawDiscountedRate = base.rate + totalAdjustment;
  const ordinarySuggestedRate = round2(
    Math.min(PERSONAL_RATE_BOUNDS.ceiling, Math.max(floor, rawDiscountedRate)),
  );
  const discountBlockedByFloorPct = round2(
    Math.max(0, ordinarySuggestedRate - rawDiscountedRate),
  );

  // Score-curve rate band around the suggested rate, clamped to the same bounds
  // the suggested rate itself respects.
  const adjustmentRange = pricingAdjustmentRangeForCurve(
    personalRateCurveForSecurity(scoreModel.rateCurve, securityClass),
  );
  let floorRate = round2(Math.max(floor, base.rate + adjustmentRange.min));
  let topRate = round2(
    Math.min(PERSONAL_RATE_BOUNDS.ceiling, base.rate + adjustmentRange.max),
  );

  const requestedRate = input.requestedRate ?? null;
  const benchmarkInput: PersonalPricingInput = {
    ...input,
    requestedRate: null,
    requestedReason: null,
    requestedReasonNotes: null,
  };
  const benchmarkScore = evaluatePersonalScoreModel(
    benchmarkInput,
    scoreModel,
    { baseRate: base.rate },
  );
  const benchmarkOrdinaryRate = Math.min(
    PERSONAL_RATE_BOUNDS.ceiling,
    Math.max(floor, base.rate + benchmarkScore.pricingAdjustment),
  );
  const approvalBenchmarkRate = applyRetentionPricingConstraint(
    benchmarkInput,
    benchmarkOrdinaryRate,
  ).suggestedRate;
  const requestedRateBenchmark =
    requestedRate == null
      ? null
      : {
          approvalBenchmarkRate,
          requestedDiscountFromBenchmark: Math.max(
            0,
            policyPercentDifference(approvalBenchmarkRate, requestedRate),
          ),
          benchmarkScore: benchmarkScore.score,
          benchmarkScoreAdjustment: benchmarkScore.pricingAdjustment,
          benchmarkScoreModelId: benchmarkScore.modelId ?? null,
          benchmarkScoreModelVersion: benchmarkScore.modelVersion ?? null,
          benchmarkScoreModelName: benchmarkScore.modelName ?? null,
        };
  const competitorRate = input.competitorRate ?? null;
  const competitorGapFromSuggested =
    competitorRate == null
      ? null
      : round2(ordinarySuggestedRate - competitorRate);
  if (
    competitorRate != null &&
    competitorGapFromSuggested != null &&
    competitorGapFromSuggested > 0
  ) {
    warnings.push({
      code: "competitor_lower",
      message: `Competitor rate (${competitorRate.toFixed(2)}%) is ${competitorGapFromSuggested.toFixed(2)}% lower than the suggested rate.`,
      severity: "info",
    });
  }
  const retentionConstraint = applyRetentionPricingConstraint(
    input,
    ordinarySuggestedRate,
  );
  let retentionPricing: RetentionPricingConstraint | null =
    input.customerStream === "retention" ? retentionConstraint : null;
  let suggestedRate = retentionConstraint.suggestedRate;
  let finalDisplayRate = retentionConstraint.finalDisplayRate;
  if (isMinimumCustomerRate(selectedRateRole) && suggestedRate < base.rate) {
    suggestedRate = base.rate;
    if (requestedRate == null) {
      finalDisplayRate = Math.max(base.rate, finalDisplayRate);
    }
    if (retentionPricing) {
      retentionPricing = {
        ...retentionPricing,
        suggestedRate,
        finalDisplayRate,
      };
    }
  }
  const retentionAdjustment = round2(suggestedRate - ordinarySuggestedRate);
  const components =
    retentionPricing && retentionAdjustment !== 0
      ? [
          {
            key: "retention_constraint",
            label: "Retention constraint",
            amount: retentionAdjustment,
            reason:
              retentionPricing.outcome === "no_further_discount"
                ? "No further discount can be provided."
                : "Only 60% of the otherwise available additional discount can be provided.",
          },
        ]
      : [];
  if (retentionPricing) {
    floorRate = suggestedRate;
    topRate = round2(Math.max(topRate, suggestedRate));
    if (retentionPricing.outcome === "partial_additional_discount") {
      warnings.push({
        code: "retention_discount_limited",
        message:
          "Retention pricing is limited to 60% of the otherwise available additional discount.",
        severity: "warning",
      });
    } else if (retentionPricing.outcome === "no_further_discount") {
      warnings.push({
        code: "retention_no_further_discount",
        message: "No further discount can be provided.",
        severity: "warning",
      });
    }
  }
  if (
    requestedRate != null &&
    isMinimumCustomerRate(selectedRateRole) &&
    isPolicyPercentBelow(requestedRate, base.rate)
  ) {
    warnings.push({
      code: "requested_below_product_rate_floor",
      message: `Requested rate (${requestedRate.toFixed(2)}%) is below the governed minimum customer rate (${base.rate.toFixed(2)}%).`,
      severity: "critical",
    });
    escalate("exception", "Requested rate is below the product rate floor.");
  }

  // --- Repayments at the rate that will actually be offered ---
  const monthlyRepayment = round2(
    monthlyRepaymentFor(
      input.loanAmount,
      finalDisplayRate,
      input.loanTermMonths,
    ),
  );
  const totalInterestOverTerm = round2(
    monthlyRepayment * input.loanTermMonths - input.loanAmount,
  );

  // --- Profitability ---
  // Same annual waterfall as home loans, but fallback assumptions are
  // personal-loan-specific and keyed by secured/unsecured plus channel.
  const channel = input.channel ?? "direct";
  const loanAmountBase = input.loanAmount > 0 ? input.loanAmount : null;
  const profitabilitySecurityType = usingGovernedProduct
    ? product.securityType
    : personalProductSecurityType(input.securityType);
  const margin = resolvePersonalMargin({
    input,
    marginSettings: governedConfig.marginSettings ?? [],
    product,
    productMatchesInput,
    finalDisplayRate,
  });
  const profitabilityDefaults = resolvePersonalProfitabilityDefaults(
    governedConfig.profitabilityDefaults ?? [],
    channel,
    profitabilitySecurityType,
  );
  const costOfFunds = margin.costOfFunds;
  const grossMarginPct = round2(finalDisplayRate - costOfFunds);
  const cashFlow =
    loanAmountBase != null
      ? amortisingCashFlow({
          principal: loanAmountBase,
          annualCustomerRatePct: finalDisplayRate,
          annualFundingRatePct: costOfFunds,
          termMonths: input.loanTermMonths,
        })
      : null;
  const estimatedAnnualInterestRevenue = cashFlow?.interestRevenue ?? null;
  const estimatedAnnualFundingCost = cashFlow?.fundingCost ?? null;
  const estimatedAnnualNetInterestIncome =
    estimatedAnnualInterestRevenue != null && estimatedAnnualFundingCost != null
      ? round2(estimatedAnnualInterestRevenue - estimatedAnnualFundingCost)
      : null;
  const firstYearInterestAt = (rate: number): number | null =>
    loanAmountBase == null
      ? null
      : amortisingCashFlow({
          principal: loanAmountBase,
          annualCustomerRatePct: rate,
          termMonths: input.loanTermMonths,
        }).interestRevenue;
  const revenueLostVsCarded =
    estimatedAnnualInterestRevenue == null
      ? null
      : round2(
          (firstYearInterestAt(base.rate) ?? estimatedAnnualInterestRevenue) -
            estimatedAnnualInterestRevenue,
        );
  const revenueLostVsSuggested =
    estimatedAnnualInterestRevenue == null
      ? null
      : round2(
          (firstYearInterestAt(suggestedRate) ??
            estimatedAnnualInterestRevenue) - estimatedAnnualInterestRevenue,
        );
  const defaultCommissions =
    loanAmountBase != null
      ? amountFromPct(loanAmountBase, profitabilityDefaults.commissionsPct)
      : null;
  const commissions =
    channel === "online" ? 0 : (input.commissions ?? defaultCommissions);
  const otherIncome =
    input.otherIncome ??
    (loanAmountBase != null
      ? amountFromPct(loanAmountBase, profitabilityDefaults.otherIncomePct)
      : null);
  const feeIncome = calculateQuoteFeeIncome(
    input.upfrontFeeOverride,
    governedConfig.quoteFeeSetting,
    input.monthlyFeeOverride,
  );
  if (governedConfig.quoteFeeSetting?.configured === false) {
    warnings.push({
      code: "quote_fee_policy_unavailable",
      message:
        "Governed personal-loan quote fees are unavailable — $0 defaults were used for fees without a quote override.",
      severity: "warning",
    });
  }
  const expenses =
    input.expenses ??
    (loanAmountBase != null
      ? amountFromPct(loanAmountBase, profitabilityDefaults.expensesPct)
      : null);
  const grossMarginDollars = estimatedAnnualNetInterestIncome;
  const netIncome =
    grossMarginDollars != null
      ? round2(
          grossMarginDollars -
            (commissions ?? 0) +
            (otherIncome ?? 0) +
            feeIncome.firstYearFeeIncome,
        )
      : null;
  // Final profit, tax and returns are unavailable until the service layer
  // applies the governed expected-loss policy.
  const profitBeforeTax = null;
  const tax = null;
  const profitAfterTax = null;
  const returnOnAssets = null;
  const personalCapitalClassification = classifyPersonalCapital({
    loanAmount: input.loanAmount,
    riskWeightOverridePct: input.riskWeightOverridePct ?? null,
    capitalOverrideReason: input.capitalOverrideReason ?? null,
  });
  const capitalAllocation =
    governedConfig.capitalRatioPct != null
      ? calculateCapitalAllocation(
          {
            ...personalCapitalClassification,
            capitalRatioPct: governedConfig.capitalRatioPct,
          },
          profitAfterTax,
        )
      : null;
  if (governedConfig.capitalRatioPct == null) {
    warnings.push({
      code: "capital_config_unavailable",
      message:
        "Capital allocation configuration is unavailable — indicative ROE cannot be calculated.",
      severity: "critical",
    });
  }
  const profitability: PersonalPricingResult["profitability"] = {
    customerRate: finalDisplayRate,
    estimatedAnnualInterestRevenue,
    estimatedAnnualFundingCost,
    estimatedAnnualNetInterestIncome,
    netInterestMargin: grossMarginPct,
    revenueLostVsCarded,
    revenueLostVsSuggested,
    cashFlow,
    costOfFunds,
    grossMarginPct,
    channel,
    commissions,
    otherIncome,
    feeIncome,
    expenses,
    taxRatePct: null,
    tax,
    averageAssets: cashFlow?.averageOutstandingBalance ?? loanAmountBase,
    netIncome,
    profitBeforeTax,
    profitAfterTax,
    returnOnAssets,
    capitalAllocation,
    targetMargin: margin.targetMargin,
    hardMinimumMargin: margin.hardMinimumMargin,
    marginStatus: margin.status,
  };
  if (governedConfig.componentFallbacks?.margin) {
    escalate(
      "exception",
      "Governed personal margin policy is unavailable; pricing requires an exception.",
    );
  }
  if (margin.status === "below_target") {
    warnings.push({
      code: "margin_below_target",
      message: `Estimated margin (${margin.estimatedMargin.toFixed(2)}%) is below the target margin (${margin.targetMargin?.toFixed(2)}%).`,
      severity: "warning",
    });
  } else if (margin.status === "below_hard_minimum") {
    warnings.push({
      code: "margin_below_hard_min",
      message: `Estimated margin (${margin.estimatedMargin.toFixed(2)}%) is below the HARD MINIMUM margin (${margin.hardMinimumMargin?.toFixed(2)}%).`,
      severity: "critical",
    });
  }

  // --- Affordability ---
  const affordability = assessAffordability(input, monthlyRepayment);
  if (affordability.status === "not_assessed") {
    warnings.push({
      code: "affordability_not_assessed",
      message:
        "Affordability not assessed — capture net income and living expenses before proceeding.",
      severity: "warning",
    });
  } else if (affordability.status === "tight") {
    warnings.push({
      code: "affordability_tight",
      message: `Repayment uses ${affordability.repaymentToSurplusPct?.toFixed(0)}% of the borrower's monthly surplus.`,
      severity: "warning",
    });
  } else if (affordability.status === "insufficient") {
    warnings.push({
      code: "affordability_insufficient",
      message:
        "Repayment exceeds the borrower's available monthly surplus — the loan does not appear serviceable as structured.",
      severity: "critical",
    });
    escalate("exception", "Repayment exceeds available monthly surplus.");
  }

  // --- Customer score escalation ---
  const creditNotScored =
    input.customerStream !== "retention" &&
    (input.creditScore == null || Number.isNaN(input.creditScore));
  if (creditNotScored) {
    warnings.push({
      code: "credit_not_scored",
      message:
        "No credit score captured — priced near the neutral score pending credit review.",
      severity: "warning",
    });
  }
  if (customerScore.band === "weak") {
    warnings.push({
      code: "score_band_weak",
      message: "Weak customer score band — refer to credit before quoting.",
      severity: "warning",
    });
  }

  // --- Structure escalation ---
  if (
    input.securityType === "unsecured" &&
    input.loanAmount > PERSONAL_LOAN_LIMITS.maxUnsecuredLoanAmount
  ) {
    warnings.push({
      code: "unsecured_above_policy",
      message: `Unsecured lending above $${PERSONAL_LOAN_LIMITS.maxUnsecuredLoanAmount.toLocaleString("en-AU")} is outside policy.`,
      severity: "critical",
    });
    escalate("exception", "Unsecured amount exceeds policy maximum.");
  }
  if (
    input.customerStream !== "retention" &&
    (input.employmentIncomeStability === "contractor_casual" ||
      input.employmentIncomeStability === "self_employed")
  ) {
    warnings.push({
      code: "income_non_standard",
      message: "Non-standard income — verify income evidence.",
      severity: "info",
    });
  }

  // --- Configured approval escalation ---
  const requestedBelowSuggestedAmount =
    requestedRateBenchmark?.requestedDiscountFromBenchmark ?? 0;
  const { level: ruleLevel, reasons: ruleReasons } = evaluatePersonalApproval(
    governedConfig.approvalRules ?? [],
    {
      loanAmount: input.loanAmount,
      unsecuredAmount:
        input.securityType === "unsecured" ? input.loanAmount : null,
      requestedBelowSuggestedAmount,
      creditNotScored,
      scoreBandWatch: customerScore.band === "watch",
      scoreBandWeak: customerScore.band === "weak",
      affordabilityTight: affordability.status === "tight",
      affordabilityNotAssessed: affordability.status === "not_assessed",
      marginBelowTarget: margin.status === "below_target",
      marginBelowHardMin: margin.status === "below_hard_minimum",
      employmentReviewRequired:
        input.customerStream !== "retention" &&
        personalEmploymentRequiresReview(input.employmentIncomeStability),
      retentionApplied: input.customerStream === "retention",
    },
  );
  approvalLevel = maxApproval(approvalLevel, ruleLevel);
  approvalReasons.push(...ruleReasons);
  approvalReasons.sort(
    (a, b) => APPROVAL_SEVERITY[b.level] - APPROVAL_SEVERITY[a.level],
  );

  const scoreExplanation = discountOnly
    ? `${product?.name ?? PERSONAL_SECURITY_LABELS[input.securityType]} carded rate of ${base.rate.toFixed(2)}% less a customer score discount of ${customerScore.scoreDiscountPct.toFixed(2)}% (score ${customerScore.score.toFixed(0)}/100) gives an ordinary suggested rate of ${ordinarySuggestedRate.toFixed(2)}% p.a.`
    : `${product?.name ?? PERSONAL_SECURITY_LABELS[input.securityType]} carded rate of ${base.rate.toFixed(2)}% ${totalAdjustment >= 0 ? "plus" : "less"} a legacy customer score adjustment of ${Math.abs(totalAdjustment).toFixed(2)}% (score ${customerScore.score.toFixed(0)}/100) gives an ordinary suggested rate of ${ordinarySuggestedRate.toFixed(2)}% p.a.`;
  const explanationText = retentionPricing
    ? `${scoreExplanation} Retention policy gives a suggested rate of ${suggestedRate.toFixed(2)}% p.a.`
    : scoreExplanation.replace("an ordinary suggested", "a suggested");

  return {
    customerScore,
    pricingBasis: customerScore.pricingBasis,
    discountEntitlementPct: customerScore.discountEntitlementPct,
    discountThresholdScore: customerScore.discountThresholdScore,
    maxDiscountPct: customerScore.maxDiscountPct,
    scoreDiscountPct: customerScore.scoreDiscountPct,
    startingRate: base.rate,
    discountBlockedByFloorPct,
    baseRate: base.rate,
    selectedRateId,
    selectedRateRole,
    productId: productMatchesInput ? (product?.id ?? null) : null,
    productName: productMatchesInput ? (product?.name ?? null) : null,
    comparisonRate: productMatchesInput
      ? (product?.comparisonRate ?? null)
      : null,
    productNotes: productMatchesInput ? (product?.notes ?? null) : null,
    components,
    totalAdjustment,
    suggestedRate,
    floorRate,
    topRate,
    requestedRate,
    requestedRateBenchmark,
    competitorRate,
    competitorGapFromSuggested,
    finalDisplayRate,
    retentionPricing,
    monthlyRepayment,
    totalInterestOverTerm,
    profitability,
    affordability,
    approvalRequired: approvalLevel !== "none",
    approvalLevel,
    approvalReasons,
    warnings,
    explanationText,
  };
}
