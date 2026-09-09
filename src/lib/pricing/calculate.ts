// Deterministic, framework-free pricing calculation service.
//
// Core model:
//   Suggested Rate = Carded Product Rate - Customer Score Discount
//                  - Active Product-Specific Discounts
//
// Products, rates, margin settings and approval rules are passed in via
// PricingConfig. Seeded legacy adjustment rules are inactive by default, but any
// active rules still stack on top of the customer-score adjustment.

import {
  AdjustmentRuleConfig,
  AppliedAdjustment,
  ApprovalLevel,
  ApprovalReason,
  CustomerScoreResult,
  ApprovalRuleConfig,
  MarginResult,
  Operator,
  PricingConfig,
  PricingInput,
  PricingResult,
  ProductRateConfig,
  RepaymentEstimate,
  WarningItem,
} from "./types";
import { calculateQuoteFeeIncome } from "./quote-fees";
import {
  DEFAULT_CUSTOMER_SCORE_MODEL,
  calculateCustomerScore,
  evaluateCustomerScoreModel,
} from "./customer-score";
import { calculateCapitalAllocation } from "./capital/calculate";
import { classifyHomeCapital } from "./capital/home";
import {
  isPolicyPercentBelow,
  policyPercentDifference,
} from "./policy-percent";
import { pricingAdjustmentRangeForCurve } from "./score-engine";
import { isMultipleLenderProductRelationship } from "./lender-products";
import {
  applyRetentionPricingConstraint,
  type RetentionPricingConstraint,
} from "./retention-pricing";
import { selectHomeMarginSetting } from "./cost-of-funds-defaults";
import { amortisingCashFlow } from "./cash-flow";
import { isMinimumCustomerRate, publishedRateRole } from "./rate-role";

const APPROVAL_SEVERITY: Record<ApprovalLevel, number> = {
  none: 0,
  manager: 1,
  senior: 2,
  review: 3, // credit/pricing review (risk-driven)
  exception: 4,
};

/** Round to a fixed number of decimal places, avoiding float noise. */
function round(value: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** LVR as a percentage to 2dp. Returns null if property value is invalid. */
export function calculateLvr(
  loanAmount: number,
  propertyValue: number,
): number | null {
  if (!(propertyValue > 0) || !(loanAmount >= 0)) return null;
  return round((loanAmount / propertyValue) * 100, 2);
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

function isEffective(rate: ProductRateConfig, now: Date): boolean {
  if (!rate.active) return false;
  if (rate.effectiveFrom && new Date(rate.effectiveFrom) > now) return false;
  if (rate.effectiveTo && new Date(rate.effectiveTo) <= now) return false;
  return true;
}

/**
 * Find the carded rate band for a given LVR. Picks the active, in-effect band
 * whose [lvrMin, lvrMax] contains the LVR. If several match, the narrowest band
 * wins (most specific), then most-recent effectiveFrom, then lowest row ID.
 */
export function findRateBand(
  rates: ProductRateConfig[],
  lvr: number,
  now: Date = new Date(),
): ProductRateConfig | null {
  const matches = rates
    .filter((r) => isEffective(r, now))
    .filter((r) => lvr >= r.lvrMin && lvr <= r.lvrMax);
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const widthA = a.lvrMax - a.lvrMin;
    const widthB = b.lvrMax - b.lvrMin;
    if (widthA !== widthB) return widthA - widthB;
    const fromA = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const fromB = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    if (fromA !== fromB) return fromB - fromA;
    return a.id - b.id;
  });
  return matches[0];
}

/** Standard amortised repayment for principal & interest. */
export function amortisedPayment(
  principal: number,
  annualRatePct: number,
  periodsPerYear: number,
  years: number,
): number {
  const n = periodsPerYear * years;
  if (n <= 0) return 0;
  const r = annualRatePct / 100 / periodsPerYear;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

function repaymentEstimate(
  principal: number,
  annualRatePct: number,
  years: number,
): RepaymentEstimate {
  const monthly = amortisedPayment(principal, annualRatePct, 12, years);
  const fortnightly = amortisedPayment(principal, annualRatePct, 26, years);
  const totalInterestOverTerm = monthly * 12 * years - principal;
  return {
    monthly: round(monthly, 2),
    fortnightly: round(fortnightly, 2),
    totalInterestOverTerm: round(Math.max(0, totalInterestOverTerm), 2),
  };
}

function evaluateMargin(
  config: PricingConfig,
  input: PricingInput,
  customerRate: number | null,
): MarginResult {
  const empty: MarginResult = {
    customerRate: customerRate ?? 0,
    estimatedCostOfFunds: null,
    estimatedMargin: null,
    targetMargin: null,
    hardMinimumMargin: null,
    status: "unavailable",
  };
  if (customerRate == null) return empty;

  const inputCostOfFunds =
    input.costOfFunds != null && input.costOfFunds >= 0
      ? input.costOfFunds
      : null;

  const productId = config.product?.id ?? null;
  const m = selectHomeMarginSetting(
    config.marginSettings,
    productId,
    input.loanPurpose,
    input.rateType,
  );

  if (!m) {
    if (inputCostOfFunds == null) return { ...empty, customerRate };
    return {
      customerRate,
      estimatedCostOfFunds: inputCostOfFunds,
      estimatedMargin: round(
        policyPercentDifference(customerRate, inputCostOfFunds),
        2,
      ),
      targetMargin: null,
      hardMinimumMargin: null,
      status: "healthy",
    };
  }

  const costOfFunds = inputCostOfFunds ?? m.estimatedCostOfFunds;
  const exactMargin = policyPercentDifference(customerRate, costOfFunds);
  const margin = round(exactMargin, 2);
  let status: MarginResult["status"] = "healthy";
  if (isPolicyPercentBelow(exactMargin, m.hardMinimumMargin)) {
    status = "below_hard_minimum";
  } else if (isPolicyPercentBelow(exactMargin, m.targetMargin)) {
    status = "below_target";
  }

  return {
    customerRate,
    estimatedCostOfFunds: costOfFunds,
    estimatedMargin: margin,
    targetMargin: m.targetMargin,
    hardMinimumMargin: m.hardMinimumMargin,
    status,
  };
}

interface ApprovalFacts {
  totalDiscount: number;
  requestedBelowSuggested: boolean;
  competitorMatch: boolean;
  retentionApplied: boolean;
  marginBelowTarget: boolean;
  marginBelowHardMin: boolean;
  loanAmount: number;
  lvrExceedsMax: boolean;
  requestedBelowMin: boolean;
  // Customer risk context
  serviceabilityBorderline: boolean;
  serviceabilityReviewRequired: boolean;
  incomeReviewRequired: boolean;
  riskNotAssessed: boolean;
  // Granular numeric figures (null when not entered).
  creditScore: number | null;
  dtiRatio: number | null;
  grossAnnualIncome: number | null;
}

function evaluateApproval(
  rules: ApprovalRuleConfig[],
  facts: ApprovalFacts,
): { level: ApprovalLevel; reasons: ApprovalReason[] } {
  const reasons: ApprovalReason[] = [];
  let level: ApprovalLevel = "none";

  const activeRules = rules
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const rule of activeRules) {
    let matched = false;
    const op = rule.conditionOperator;
    switch (rule.conditionType) {
      case "total_discount":
        matched = compare(facts.totalDiscount, op, Number(rule.conditionValue));
        break;
      case "requested_below_suggested":
        matched = facts.requestedBelowSuggested;
        break;
      case "competitor_match":
        matched = facts.competitorMatch;
        break;
      case "retention_applied":
        matched = facts.retentionApplied;
        break;
      case "margin_below_target":
        matched = facts.marginBelowTarget;
        break;
      case "margin_below_hard_min":
        matched = facts.marginBelowHardMin;
        break;
      case "loan_amount":
        matched = compare(facts.loanAmount, op, Number(rule.conditionValue));
        break;
      case "lvr_exceeds_max":
        matched = facts.lvrExceedsMax;
        break;
      case "requested_below_min":
        matched = facts.requestedBelowMin;
        break;
      // --- Customer risk context (boolean facts; operator/value ignored) ---
      case "serviceability_borderline":
        matched = facts.serviceabilityBorderline;
        break;
      case "serviceability_review_required":
        matched = facts.serviceabilityReviewRequired;
        break;
      case "income_review_required":
        matched = facts.incomeReviewRequired;
        break;
      case "risk_not_assessed":
        matched = facts.riskNotAssessed;
        break;
      // --- Granular numeric thresholds ---
      case "credit_score":
        matched =
          facts.creditScore != null &&
          compare(facts.creditScore, op, Number(rule.conditionValue));
        break;
      case "dti_ratio":
        matched =
          facts.dtiRatio != null &&
          compare(facts.dtiRatio, op, Number(rule.conditionValue));
        break;
      case "gross_annual_income":
        matched =
          facts.grossAnnualIncome != null &&
          compare(facts.grossAnnualIncome, op, Number(rule.conditionValue));
        break;
      default:
        matched = false;
    }
    if (matched && rule.approvalLevel !== "none") {
      reasons.push({ level: rule.approvalLevel, message: rule.reasonText });
      if (APPROVAL_SEVERITY[rule.approvalLevel] > APPROVAL_SEVERITY[level]) {
        level = rule.approvalLevel;
      }
    }
  }

  // Surface the reasons that drove the final (most severe) level first.
  reasons.sort(
    (a, b) => APPROVAL_SEVERITY[b.level] - APPROVAL_SEVERITY[a.level],
  );
  return { level, reasons };
}

/**
 * Product-specific adjustment rules. Each active rule is scoped (product / loan
 * purpose / rate type — null means "any") and gated by a single condition on
 * LVR, loan amount or a relationship flag. Matched rules produce signed
 * adjustments (discount negative, loading positive) that STACK ADDITIVELY on top
 * of the customer-score adjustment.
 */
function evaluateAdjustmentRules(
  rules: AdjustmentRuleConfig[],
  input: PricingInput,
  ctx: { productId: number | null; lvr: number | null },
): AppliedAdjustment[] {
  const applied: AppliedAdjustment[] = [];
  const activeRules = rules
    .filter((r) => r.active && r.ruleType === "discount")
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const rule of activeRules) {
    // Scope filter — a null scope field means the rule applies to anything.
    if (
      rule.appliesToProductId != null &&
      rule.appliesToProductId !== ctx.productId
    )
      continue;
    if (
      rule.appliesToLoanPurpose != null &&
      rule.appliesToLoanPurpose !== input.loanPurpose
    )
      continue;
    if (
      rule.appliesToRateType != null &&
      rule.appliesToRateType !== input.rateType
    )
      continue;

    // Condition match.
    const op = rule.conditionOperator;
    let matched = false;
    switch (rule.conditionType) {
      case "lvr":
        matched =
          ctx.lvr != null && compare(ctx.lvr, op, Number(rule.conditionValue));
        break;
      case "loan_amount":
        matched = compare(input.loanAmount, op, Number(rule.conditionValue));
        break;
      case "existing_member":
        matched = input.existingMember === true;
        break;
      case "retention_scenario":
        matched = input.retentionScenario === true;
        break;
      case "multiple_lender_products":
        matched = isMultipleLenderProductRelationship(input.lenderProducts);
        break;
      default:
        matched = false;
    }
    if (!matched) continue;

    // adjustmentAmount is stored as a positive magnitude; sign by rule type.
    const magnitude = Math.abs(rule.adjustmentAmount);
    const signed = rule.ruleType === "discount" ? -magnitude : magnitude;
    applied.push({
      ruleId: rule.id,
      name: rule.name,
      ruleType: rule.ruleType,
      amount: round(signed, 4),
      reason:
        rule.reasonText ??
        `${rule.name}: ${formatSigned(signed)}% ${rule.ruleType}.`,
      requiresApproval: rule.requiresApproval,
      category: "product",
    });
  }
  return applied;
}

export function calculatePricing(
  input: PricingInput,
  config: PricingConfig,
): PricingResult {
  const warnings: WarningItem[] = [];
  const now = new Date();

  if (config.customerScoreModelFallback) {
    warnings.push({
      code: "home_score_model_fallback",
      message:
        "No contract-valid governed home-loan score model is available; compiled score policy is in use.",
      severity: "warning",
    });
  }

  // --- Input validation ---
  if (!(input.loanAmount > 0)) {
    warnings.push({
      code: "loan_amount_invalid",
      message: "Loan amount missing or invalid.",
      severity: "critical",
    });
  }
  if (!(input.propertyValue > 0)) {
    warnings.push({
      code: "property_value_invalid",
      message: "Property value missing or invalid.",
      severity: "critical",
    });
  }

  const lvr = calculateLvr(input.loanAmount, input.propertyValue);

  if (lvr != null && lvr > 100 && !config.allowLoanAmountAbovePropertyValue) {
    warnings.push({
      code: "loan_exceeds_property",
      message: "Loan amount exceeds property value (LVR over 100%).",
      severity: "critical",
    });
  }

  const product = config.product;

  // --- Product eligibility ---
  let productEligible = true;
  if (!product) {
    productEligible = false;
    warnings.push({
      code: "product_missing",
      message: "No product selected.",
      severity: "critical",
    });
  } else {
    if (!product.active) {
      productEligible = false;
      warnings.push({
        code: "product_inactive",
        message: "Selected product is not active.",
        severity: "critical",
      });
    }
    if (
      product.loanPurpose !== input.loanPurpose ||
      product.rateType !== input.rateType ||
      (product.rateType === "fixed" &&
        product.fixedPeriodMonths !== input.fixedPeriodMonths)
    ) {
      productEligible = false;
      warnings.push({
        code: "product_scenario_mismatch",
        message: "Product is not available for this loan scenario.",
        severity: "critical",
      });
    }
    if (
      product.minLoanAmount != null &&
      input.loanAmount < product.minLoanAmount
    ) {
      productEligible = false;
      warnings.push({
        code: "below_min_loan",
        message: `Loan amount is below the product minimum of ${product.minLoanAmount.toLocaleString()}.`,
        severity: "critical",
      });
    }
    if (
      product.maxLoanAmount != null &&
      input.loanAmount > product.maxLoanAmount
    ) {
      productEligible = false;
      warnings.push({
        code: "above_max_loan",
        message: `Loan amount is above the product maximum of ${product.maxLoanAmount.toLocaleString()}.`,
        severity: "critical",
      });
    }
  }

  const lvrExceedsMax =
    product?.maxLvr != null && lvr != null && lvr > product.maxLvr;
  if (lvrExceedsMax) {
    warnings.push({
      code: "lvr_exceeds_max",
      message: `LVR of ${lvr?.toFixed(2)}% exceeds the product maximum of ${product?.maxLvr}%.`,
      severity: "critical",
    });
  }

  // --- Carded rate lookup ---
  let cardedRate: number | null = null;
  let cardedComparisonRate: number | null = null;
  let selectedRateBandId: number | null = null;
  let selectedRateRole: PricingResult["selectedRateRole"] = null;
  if (product && lvr != null) {
    const band = findRateBand(
      config.productRates.filter((r) => r.productId === product.id),
      lvr,
      now,
    );
    if (band) {
      cardedRate = band.cardedRate;
      cardedComparisonRate = band.comparisonRate ?? null;
      selectedRateBandId = band.id;
      selectedRateRole = publishedRateRole(band.pricingRole);
    } else {
      warnings.push({
        code: "missing_rate",
        message: "Missing carded rate for this product and LVR band.",
        severity: "critical",
      });
    }
  }

  // --- Customer score pricing adjustment ---
  const customerScore: CustomerScoreResult = config.customerScoreModel
    ? evaluateCustomerScoreModel(input, config.customerScoreModel)
    : calculateCustomerScore(input);
  const appliedAdjustments: AppliedAdjustment[] = [];
  let suggestedRate: number | null = cardedRate;
  let discountBlockedByFloorPct = 0;

  if (cardedRate != null) {
    const scoreSigned = customerScore.pricingAdjustment;
    appliedAdjustments.push({
      ruleId: 0,
      name: "Customer score discount",
      ruleType: scoreSigned <= 0 ? "discount" : "loading",
      amount: round(scoreSigned, 4),
      reason:
        customerScore.discountEntitlementPct == null
          ? `Legacy customer score ${customerScore.score.toFixed(2)} (${customerScore.band}) drives a ${formatSigned(scoreSigned)}% pricing adjustment.`
          : `Customer score ${customerScore.score.toFixed(2)} (${customerScore.band}) earns ${customerScore.discountEntitlementPct.toFixed(2)}% of the available discount, or ${customerScore.scoreDiscountPct.toFixed(4)} percentage points.`,
      requiresApproval: false,
      category: "strategic",
    });

    // Product-specific adjustment rules stack additively on top of the score.
    const productAdjustments = evaluateAdjustmentRules(
      config.adjustmentRules,
      input,
      { productId: product?.id ?? null, lvr },
    );
    appliedAdjustments.push(...productAdjustments);

    const totalSigned = round(
      scoreSigned +
        productAdjustments.reduce((sum, adj) => sum + adj.amount, 0),
      4,
    );
    const rawDiscountedRate = cardedRate + totalSigned;
    suggestedRate = round(
      isMinimumCustomerRate(selectedRateRole)
        ? Math.max(cardedRate, rawDiscountedRate)
        : rawDiscountedRate,
      4,
    );
    discountBlockedByFloorPct = round(
      Math.max(0, suggestedRate - rawDiscountedRate),
      4,
    );
  }

  const ordinarySuggestedRate = suggestedRate;
  let retentionPricing: RetentionPricingConstraint | null = null;
  let constrainedFinalDisplayRate: number | null = null;
  if (ordinarySuggestedRate != null) {
    retentionPricing = applyRetentionPricingConstraint(
      input,
      ordinarySuggestedRate,
    );
    suggestedRate = retentionPricing.suggestedRate;
    constrainedFinalDisplayRate = retentionPricing.finalDisplayRate;
    const constraintAmount = round(suggestedRate - ordinarySuggestedRate, 4);
    if (constraintAmount > 0) {
      appliedAdjustments.push({
        ruleId: -1,
        name: "Retention arrears constraint",
        ruleType: "discount_withheld",
        amount: constraintAmount,
        reason:
          retentionPricing.outcome === "no_further_discount"
            ? "No further discount can be provided."
            : "Only 60% of the otherwise available additional discount can be provided.",
        requiresApproval: false,
        category: "relationship",
      });
    }
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
    cardedRate != null &&
    isMinimumCustomerRate(selectedRateRole) &&
    suggestedRate != null &&
    suggestedRate < cardedRate
  ) {
    suggestedRate = cardedRate;
    if (input.requestedRate == null) {
      constrainedFinalDisplayRate = Math.max(
        cardedRate,
        constrainedFinalDisplayRate ?? cardedRate,
      );
    }
    if (retentionPricing) {
      retentionPricing = {
        ...retentionPricing,
        suggestedRate,
        finalDisplayRate:
          input.requestedRate == null
            ? (constrainedFinalDisplayRate ?? suggestedRate)
            : retentionPricing.finalDisplayRate,
      };
    }
  }

  const totalAdjustment =
    cardedRate != null && suggestedRate != null
      ? round(suggestedRate - cardedRate, 4)
      : 0;
  const totalDiscount = totalAdjustment < 0 ? round(-totalAdjustment, 4) : 0;

  // Score-curve rate band around the suggested rate. Discount-only models span
  // full entitlement through no discount; legacy curves retain their saved
  // discount/loading range for compatibility.
  let floorRate: number | null = null;
  let topRate: number | null = null;
  if (cardedRate != null) {
    const curve =
      config.customerScoreModel?.rateCurve ??
      DEFAULT_CUSTOMER_SCORE_MODEL.rateCurve;
    const bounds = pricingAdjustmentRangeForCurve(curve);
    floorRate = round(
      isMinimumCustomerRate(selectedRateRole)
        ? Math.max(cardedRate, cardedRate + bounds.min)
        : cardedRate + bounds.min,
      4,
    );
    topRate = round(cardedRate + bounds.max, 4);
  }

  // --- Requested rate analysis ---
  const requestedRate = input.requestedRate ?? null;
  let requestedRateAnalysis = null as PricingResult["requestedRateAnalysis"];
  if (requestedRate != null && suggestedRate != null && cardedRate != null) {
    const benchmarkInput: PricingInput = {
      ...input,
      requestedRate: null,
      requestedReason: null,
    };
    const benchmarkScore = config.customerScoreModel
      ? evaluateCustomerScoreModel(benchmarkInput, config.customerScoreModel)
      : calculateCustomerScore(benchmarkInput);
    const benchmarkProductAdjustments = evaluateAdjustmentRules(
      config.adjustmentRules,
      benchmarkInput,
      { productId: product?.id ?? null, lvr },
    );
    const rawBenchmarkOrdinaryRate =
      cardedRate +
      benchmarkScore.pricingAdjustment +
      benchmarkProductAdjustments.reduce(
        (sum, adjustment) => sum + adjustment.amount,
        0,
      );
    const benchmarkOrdinaryRate = isMinimumCustomerRate(selectedRateRole)
      ? Math.max(cardedRate, rawBenchmarkOrdinaryRate)
      : rawBenchmarkOrdinaryRate;
    const approvalBenchmarkRate = applyRetentionPricingConstraint(
      benchmarkInput,
      benchmarkOrdinaryRate,
    ).suggestedRate;
    const requestedDiscountFromBenchmark = Math.max(
      0,
      policyPercentDifference(approvalBenchmarkRate, requestedRate),
    );
    const diffFromSuggested = round(suggestedRate - requestedRate, 4);
    requestedRateAnalysis = {
      requestedRate,
      belowSuggested: requestedRate < suggestedRate,
      differenceFromSuggested: diffFromSuggested,
      belowApprovalBenchmark: requestedRate < approvalBenchmarkRate,
      approvalBenchmarkRate,
      requestedDiscountFromBenchmark,
      benchmarkScore: benchmarkScore.score,
      benchmarkScoreAdjustment: benchmarkScore.pricingAdjustment,
      benchmarkScoreModelId: benchmarkScore.modelId ?? null,
      benchmarkScoreModelVersion: benchmarkScore.modelVersion ?? null,
      benchmarkScoreModelName: benchmarkScore.modelName ?? null,
      differenceFromCompetitor:
        input.competitorRate != null
          ? round(requestedRate - input.competitorRate, 4)
          : null,
    };
    if (requestedRate < approvalBenchmarkRate) {
      warnings.push({
        code: "requested_below_suggested",
        message: `Requested rate (${requestedRate.toFixed(2)}%) is ${requestedDiscountFromBenchmark.toFixed(2)}% below the request-independent approval benchmark.`,
        severity: "warning",
      });
    }
    if (
      isMinimumCustomerRate(selectedRateRole) &&
      isPolicyPercentBelow(requestedRate, cardedRate)
    ) {
      warnings.push({
        code: "requested_below_product_rate_floor",
        message: `Requested rate (${requestedRate.toFixed(2)}%) is below the governed minimum customer rate (${cardedRate.toFixed(2)}%).`,
        severity: "critical",
      });
    }
  }

  // --- Competitor comparison ---
  if (input.competitorRate != null && suggestedRate != null) {
    const gap = round(suggestedRate - input.competitorRate, 4);
    if (gap > 0) {
      warnings.push({
        code: "competitor_lower",
        message: `Competitor rate (${input.competitorRate.toFixed(2)}%) is ${gap.toFixed(2)}% lower than the suggested rate.`,
        severity: "info",
      });
    }
  }

  // --- Effective customer rate for repayment + margin ---
  const finalDisplayRate =
    constrainedFinalDisplayRate ??
    (requestedRate != null ? requestedRate : suggestedRate);

  // --- Repayments ---
  const repaymentAtSuggested =
    suggestedRate != null && input.loanAmount > 0 && input.loanTermYears > 0
      ? repaymentEstimate(input.loanAmount, suggestedRate, input.loanTermYears)
      : null;
  const repaymentAtRequested =
    requestedRate != null && input.loanAmount > 0 && input.loanTermYears > 0
      ? repaymentEstimate(input.loanAmount, requestedRate, input.loanTermYears)
      : null;
  const activeRepayment =
    requestedRate != null && finalDisplayRate === requestedRate
      ? repaymentAtRequested
      : repaymentAtSuggested;

  // --- Margin ---
  const margin = evaluateMargin(config, input, finalDisplayRate);

  const cashFlow =
    finalDisplayRate != null && input.loanAmount > 0 && input.loanTermYears > 0
      ? amortisingCashFlow({
          principal: input.loanAmount,
          annualCustomerRatePct: finalDisplayRate,
          annualFundingRatePct: margin.estimatedCostOfFunds,
          termMonths: input.loanTermYears * 12,
        })
      : null;
  const estimatedAnnualInterestRevenue = cashFlow?.interestRevenue ?? null;

  if (margin.status === "below_target") {
    warnings.push({
      code: "margin_below_target",
      message: `Estimated margin (${margin.estimatedMargin?.toFixed(2)}%) is below the target margin (${margin.targetMargin?.toFixed(2)}%).`,
      severity: "warning",
    });
  } else if (margin.status === "below_hard_minimum") {
    warnings.push({
      code: "margin_below_hard_min",
      message: `Estimated margin (${margin.estimatedMargin?.toFixed(2)}%) is below the HARD MINIMUM margin (${margin.hardMinimumMargin?.toFixed(2)}%).`,
      severity: "critical",
    });
  }

  // --- Customer risk context: facts + warnings ---
  // Defaults when not supplied.
  const income = input.employmentIncomeStability ?? "not_assessed";
  const serviceability = input.serviceabilityStatus ?? "not_assessed";

  const retentionRiskAssessed =
    input.customerStream === "retention" &&
    input.currentCustomerRate != null &&
    input.retentionArrearsHardship18Months != null &&
    (input.retentionArrearsHardship18Months === false ||
      input.retentionArrearsPast12Months != null);
  const riskNotAssessed =
    input.customerStream === "retention"
      ? !retentionRiskAssessed
      : income === "not_assessed" &&
        serviceability === "not_assessed" &&
        input.creditScore == null &&
        input.dtiRatio == null &&
        input.grossAnnualIncome == null &&
        input.serviceabilityNsi == null;

  // These warnings are advisory. Risk also contributes to the customer score
  // above, while approval rules can still require review for specific flags.
  const riskWarnings: WarningItem[] = [];
  if (riskNotAssessed) {
    riskWarnings.push({
      code: "risk_not_assessed",
      message:
        "Customer risk context has not been assessed — pricing is indicative only and subject to credit assessment.",
      severity: "info",
    });
  }
  if (serviceability === "borderline") {
    riskWarnings.push({
      code: "serviceability_borderline",
      message: "Serviceability status is Borderline.",
      severity: "warning",
    });
  }
  if (serviceability === "review_required") {
    riskWarnings.push({
      code: "serviceability_review",
      message: "Serviceability status is marked Review required.",
      severity: "warning",
    });
  }
  if (income === "self_employed" || income === "contractor_casual") {
    riskWarnings.push({
      code: "income_non_standard",
      message:
        "Employment/income is non-standard (self-employed or contractor/casual) — review recommended.",
      severity: "info",
    });
  }
  if (income === "review_required") {
    riskWarnings.push({
      code: "income_review",
      message: "Employment/income stability is marked Review required.",
      severity: "warning",
    });
  }
  warnings.push(...riskWarnings);

  // --- Approval evaluation ---
  const retentionApplied = input.retentionScenario;
  const competitorMatch =
    input.competitorRate != null &&
    input.requestedReason === "competitor_match";

  const approvalFacts: ApprovalFacts = {
    totalDiscount,
    requestedBelowSuggested:
      requestedRateAnalysis?.belowApprovalBenchmark ?? false,
    competitorMatch,
    retentionApplied,
    marginBelowTarget: margin.status === "below_target",
    marginBelowHardMin: margin.status === "below_hard_minimum",
    loanAmount: input.loanAmount,
    lvrExceedsMax: !!lvrExceedsMax,
    requestedBelowMin:
      requestedRate != null &&
      cardedRate != null &&
      isMinimumCustomerRate(selectedRateRole) &&
      isPolicyPercentBelow(requestedRate, cardedRate),
    serviceabilityBorderline: serviceability === "borderline",
    serviceabilityReviewRequired: serviceability === "review_required",
    incomeReviewRequired: income === "review_required",
    riskNotAssessed,
    creditScore: input.creditScore ?? null,
    dtiRatio: input.dtiRatio ?? null,
    grossAnnualIncome: input.grossAnnualIncome ?? null,
  };

  const { level: ruleLevel, reasons } = evaluateApproval(
    config.approvalRules,
    approvalFacts,
  );

  let approvalLevel: ApprovalLevel = ruleLevel;

  // Product adjustment rules can flag that they require sign-off; surface those
  // as manager-level approval reasons.
  for (const adj of appliedAdjustments.filter((a) => a.requiresApproval)) {
    reasons.push({
      level: "manager",
      message: `${adj.name} requires approval.`,
    });
    if (APPROVAL_SEVERITY.manager > APPROVAL_SEVERITY[approvalLevel]) {
      approvalLevel = "manager";
    }
  }

  // Hard stops independent of approval rules: ineligible product / missing
  // data / LVR over max => pricing exception.
  const hasCritical = warnings.some((w) => w.severity === "critical");
  if (!productEligible || lvrExceedsMax || cardedRate == null) {
    if (APPROVAL_SEVERITY.exception > APPROVAL_SEVERITY[approvalLevel]) {
      approvalLevel = "exception";
    }
    if (!reasons.some((r) => r.level === "exception")) {
      reasons.unshift({
        level: "exception",
        message:
          "Pricing exception: required pricing data is missing or the product is not eligible for this scenario. Do not proceed.",
      });
    }
  } else if (
    hasCritical &&
    APPROVAL_SEVERITY.exception > APPROVAL_SEVERITY[approvalLevel]
  ) {
    approvalLevel = "exception";
  }

  const approvalRequired = approvalLevel !== "none";

  // --- Explanation text ---
  const explanationText = buildExplanation({
    cardedRate,
    suggestedRate,
    totalAdjustment,
    totalDiscount,
    customerScore,
    appliedAdjustments,
    approvalLevel,
    reasons,
    margin,
    requestedRateAnalysis,
    competitorRate: input.competitorRate ?? null,
    retentionPricing,
  });

  // --- Profitability summary ---
  const costOfFunds = margin.estimatedCostOfFunds;
  const annualFundingCost = cashFlow?.fundingCost ?? null;
  const annualNetInterestIncome =
    estimatedAnnualInterestRevenue != null && annualFundingCost != null
      ? round(estimatedAnnualInterestRevenue - annualFundingCost, 2)
      : null;
  const firstYearInterestAt = (rate: number | null): number | null =>
    rate != null && input.loanAmount > 0 && input.loanTermYears > 0
      ? amortisingCashFlow({
          principal: input.loanAmount,
          annualCustomerRatePct: rate,
          termMonths: input.loanTermYears * 12,
        }).interestRevenue
      : null;
  const cardedInterest = firstYearInterestAt(cardedRate);
  const suggestedInterest = firstYearInterestAt(suggestedRate);
  const revenueLostVsCarded =
    cardedInterest != null && estimatedAnnualInterestRevenue != null
      ? round(cardedInterest - estimatedAnnualInterestRevenue, 2)
      : null;
  const revenueLostVsSuggested =
    suggestedInterest != null && estimatedAnnualInterestRevenue != null
      ? round(suggestedInterest - estimatedAnnualInterestRevenue, 2)
      : null;

  // --- P&L waterfall ---
  // Everything at/above customer rate is derived; the $ lines below are typed
  // per quote, and the subtotals are rolled up. Gross margin (%) is bridged to
  // dollars using loan amount so ROA is internally consistent with the quote.
  const grossMarginPct = margin.estimatedMargin; // customerRate − costOfFunds
  const channel = input.channel ?? "direct";
  const commissions = channel === "online" ? 0 : (input.commissions ?? null);
  const otherIncome = input.otherIncome ?? null;
  const feeIncome = calculateQuoteFeeIncome(
    input.upfrontFeeOverride,
    config.quoteFeeSetting,
    input.monthlyFeeOverride,
  );
  if (config.quoteFeeSetting?.configured === false) {
    warnings.push({
      code: "quote_fee_policy_unavailable",
      message:
        "Governed home-loan quote fees are unavailable — $0 defaults were used for fees without a quote override.",
      severity: "warning",
    });
  }
  const expenses = input.expenses ?? null;
  const loanAmountBase = input.loanAmount > 0 ? input.loanAmount : null;

  const grossMarginDollars = annualNetInterestIncome;
  const netIncome =
    grossMarginDollars != null
      ? round(
          grossMarginDollars -
            (commissions ?? 0) +
            (otherIncome ?? 0) +
            feeIncome.firstYearFeeIncome,
          2,
        )
      : null;
  // Final profit, tax and returns are unavailable until the service layer
  // applies the governed expected-loss policy.
  const profitBeforeTax = null;
  const tax = null;
  const profitAfterTax = null;
  const returnOnAssets = null;
  const homeCapitalClassification = classifyHomeCapital({
    loanAmount: input.loanAmount,
    propertyValue: input.propertyValue,
    loanPurpose: input.loanPurpose,
    capitalStandardStatus: input.capitalStandardStatus ?? "unconfirmed",
    eligibleLmi: input.eligibleLmi ?? false,
    homeGuaranteeSchemeEligible: input.homeGuaranteeSchemeEligible ?? false,
    riskWeightOverridePct: input.riskWeightOverridePct ?? null,
    capitalOverrideReason: input.capitalOverrideReason ?? null,
  });
  const capitalAllocation =
    config.capitalRatioPct != null
      ? calculateCapitalAllocation(
          {
            ...homeCapitalClassification,
            capitalRatioPct: config.capitalRatioPct,
          },
          profitAfterTax,
        )
      : null;
  if (config.capitalRatioPct == null) {
    warnings.push({
      code: "capital_config_unavailable",
      message:
        "Capital allocation configuration is unavailable — indicative ROE cannot be calculated.",
      severity: "critical",
    });
  }
  for (const code of homeCapitalClassification.warnings) {
    warnings.push({
      code,
      message:
        "APS capital classification is unconfirmed — indicative ROE uses a conservative 100% risk weight.",
      severity: "warning",
    });
  }

  const profitability: PricingResult["profitability"] = {
    customerRate: finalDisplayRate,
    estimatedAnnualInterestRevenue,
    estimatedAnnualFundingCost: annualFundingCost,
    estimatedAnnualNetInterestIncome: annualNetInterestIncome,
    netInterestMargin: margin.estimatedMargin,
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
  };

  const suggestedNextAction = nextActionFor(approvalLevel);

  return {
    lvr,
    cardedRate,
    cardedComparisonRate,
    selectedRateBandId,
    selectedRateRole,
    customerScore,
    pricingBasis: customerScore.pricingBasis,
    discountEntitlementPct: customerScore.discountEntitlementPct,
    discountThresholdScore: customerScore.discountThresholdScore,
    maxDiscountPct: customerScore.maxDiscountPct,
    scoreDiscountPct: customerScore.scoreDiscountPct,
    startingRate: cardedRate,
    discountBlockedByFloorPct,
    competitorComparison: null,
    appliedAdjustments,
    totalAdjustment,
    totalDiscount,
    suggestedRate,
    floorRate,
    topRate,
    requestedRate,
    finalDisplayRate,
    requestedRateAnalysis,
    retentionPricing,
    repaymentAtSuggested,
    repaymentAtRequested,
    monthlyRepayment: activeRepayment?.monthly ?? null,
    fortnightlyRepayment: activeRepayment?.fortnightly ?? null,
    estimatedAnnualInterestRevenue,
    margin,
    profitability,
    approvalRequired,
    approvalLevel,
    approvalReasons: reasons,
    suggestedNextAction,
    warnings,
    explanationText,
  };
}

function nextActionFor(level: ApprovalLevel): string {
  switch (level) {
    case "manager":
      return "Route to a manager for pricing approval before proceeding.";
    case "senior":
      return "Route to senior for pricing approval before proceeding.";
    case "review":
      return "Refer for credit/pricing review before proceeding — pricing is indicative and subject to credit assessment.";
    case "exception":
      return "Do not proceed: pricing exception. Resolve the hard stop or escalate.";
    default:
      return "No approval required — proceed.";
  }
}

function buildExplanation(args: {
  cardedRate: number | null;
  suggestedRate: number | null;
  totalAdjustment: number;
  totalDiscount: number;
  customerScore: CustomerScoreResult;
  appliedAdjustments: AppliedAdjustment[];
  approvalLevel: ApprovalLevel;
  reasons: ApprovalReason[];
  margin: MarginResult;
  requestedRateAnalysis: PricingResult["requestedRateAnalysis"];
  competitorRate: number | null;
  retentionPricing: RetentionPricingConstraint | null;
}): string {
  const lines: string[] = [];
  if (args.suggestedRate == null || args.cardedRate == null) {
    lines.push(
      "A suggested rate could not be produced because required pricing data is missing. Review warnings before proceeding.",
    );
    return lines.join("\n");
  }

  lines.push(`Suggested rate: ${args.suggestedRate.toFixed(2)}%`);
  lines.push(`Carded rate: ${args.cardedRate.toFixed(2)}%`);
  lines.push(
    args.customerScore.pricingBasis === "discount_entitlement_v1"
      ? `Total discount: ${args.totalDiscount.toFixed(2)}%`
      : `Legacy total adjustment: ${formatSigned(args.totalAdjustment)}%`,
  );
  lines.push(
    `Customer score: ${args.customerScore.score.toFixed(2)} / 100 (${args.customerScore.band})`,
  );

  if (args.appliedAdjustments.length > 0) {
    lines.push("");
    lines.push("Pricing breakdown:");
    for (const a of args.appliedAdjustments) {
      lines.push(`• ${a.name}: ${formatSigned(a.amount)}% — ${a.reason}`);
    }
  }

  if (args.retentionPricing?.outcome === "partial_additional_discount") {
    lines.push("");
    lines.push(
      "Retention limit: only 60% of the otherwise available additional discount can be provided.",
    );
  } else if (args.retentionPricing?.outcome === "no_further_discount") {
    lines.push("");
    lines.push("Retention limit: No further discount can be provided.");
  }

  lines.push("");
  if (args.approvalLevel === "none") {
    lines.push("Approval required: No approval required.");
  } else {
    lines.push(`Approval required: ${labelForLevel(args.approvalLevel)}`);
    if (args.reasons.length > 0) {
      lines.push("Reason:");
      for (const r of args.reasons) {
        lines.push(`• ${r.message}`);
      }
    }
  }

  if (args.requestedRateAnalysis?.belowSuggested) {
    lines.push("");
    lines.push(
      `Note: requested rate is ${args.requestedRateAnalysis.differenceFromSuggested.toFixed(2)}% below the suggested rate.`,
    );
  }

  if (
    args.margin.status !== "unavailable" &&
    args.margin.estimatedMargin != null
  ) {
    lines.push("");
    lines.push(
      `Estimated margin: ${args.margin.estimatedMargin.toFixed(2)}% (${marginLabel(args.margin.status)}).`,
    );
  }

  return lines.join("\n");
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function labelForLevel(level: ApprovalLevel): string {
  switch (level) {
    case "manager":
      return "Manager approval";
    case "senior":
      return "Senior approval";
    case "review":
      return "Credit/Pricing review";
    case "exception":
      return "Pricing exception / do not proceed";
    default:
      return "No approval required";
  }
}

function marginLabel(status: MarginResult["status"]): string {
  switch (status) {
    case "healthy":
      return "healthy";
    case "below_target":
      return "below target";
    case "below_hard_minimum":
      return "below hard minimum";
    default:
      return "unavailable";
  }
}
