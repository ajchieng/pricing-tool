// Commercial loan pricing engine — pure and deterministic. New governed
// pricing subtracts a customer-score discount from the facility base rate:
//   indicative rate = base rate - customer score discount
// where the customer score synthesises business credit quality, cash-flow
// cover, security, facility structure and relationship value into one governed
// model (./score-model). Cash-flow (DSCR) and security-coverage assessments
// drive warnings and approval escalation. Base rates, fees and thresholds come
// from ./config.

import type {
  ApprovalLevel,
  ApprovalReason,
  CustomerScoreModelConfig,
  PolicyComponentFallbacks,
  WarningItem,
} from "@/lib/pricing/types";
import {
  COMMERCIAL_APPROVAL,
  COMMERCIAL_BASE_RATES,
  COMMERCIAL_FEES,
  COMMERCIAL_MARGIN_FLOOR,
  COMMERCIAL_SECURITY_LABELS,
  DSCR_BANDS,
  COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  SECURITY_COVERAGE_LABELS,
} from "./config";
import {
  DEFAULT_COMMERCIAL_SCORE_MODEL,
  evaluateCommercialScoreModel,
} from "./score-model";
import { annualDebtServiceFor } from "./debt-service";
import {
  isDiscountEntitlementCurve,
  pricingAdjustmentRangeForCurve,
} from "../score-engine";
import type {
  CashFlowAssessment,
  CommercialFacilityType,
  CommercialLoanType,
  CommercialFees,
  CommercialPricingInput,
  CommercialPricingResult,
  CommercialProfitabilityDefaultConfig,
  SecurityAssessment,
  ServiceabilityBand,
} from "./types";
import { calculateCapitalAllocation } from "@/lib/pricing/capital/calculate";
import { classifyCommercialCapital } from "@/lib/pricing/capital/commercial";
import type { CommercialCapitalExposureClass } from "@/lib/pricing/capital/types";
import {
  isPolicyPercentBelow,
  policyPercentDifference,
} from "@/lib/pricing/policy-percent";
import { summariseCommercialSecurities } from "./securities";
import {
  calculateQuoteFeeIncome,
  type QuoteFeeSettingConfig,
} from "@/lib/pricing/quote-fees";
import type { ExpectedLossPolicyConfig } from "@/lib/pricing/credit-risk/policy-validation";
import {
  isMinimumCustomerRate,
  publishedRateRole,
  type PublishedRateRole,
} from "@/lib/pricing/rate-role";

// Re-exported for backward compatibility — callers/tests import it from here.
export { annualDebtServiceFor } from "./debt-service";

// Governed pricing inputs the engine reads. Defaults come from ./config (code
// baselines) so existing callers/tests keep their behaviour; the DB-backed
// service (./service) supplies governed values and sets `productFallback` when
// no governed product/rate matched the facility.
export interface CommercialPricingConfig {
  scoreModel: CustomerScoreModelConfig;
  productId?: number | null;
  marginSettingIds?: number[];
  approvalSettingIds?: number[];
  baseRates: Record<
    CommercialFacilityType,
    Record<
      CommercialLoanType,
      {
        label: string;
        baseRateName: string;
        rate: number;
        selectedRateId?: number | null;
        pricingRole?: PublishedRateRole | null;
      }
    >
  >;
  marginFloor: number;
  marginPolicy?: {
    estimatedCostOfFunds: number | null;
    targetMargin: number | null;
    scoreMarginFloorPct?: number | null;
    hardMinimumNetInterestMarginPct?: number | null;
    /** Compatibility input for governed rows created before the split. */
    hardMinimumMargin: number;
  };
  productLimits?: {
    minLoanAmount: number | null;
    maxLoanAmount: number | null;
    minTermYears: number | null;
    maxTermYears: number | null;
  };
  fees: {
    establishmentFeePct: number;
    establishmentFeeMin: number;
    overdraftLineFeePct: number;
    equipmentDocumentationFee: number;
  };
  approval: {
    seniorExposure: number;
    reviewExposure: number;
    requestedBelowIndicativeManager: number;
    requestedBelowIndicativeSenior: number;
  };
  dscrBands: { strongMin: number; acceptableMin: number };
  customerConcentrationThresholdPct: number;
  // Governed profitability defaults; blank annual line items resolve to the
  // matching channel/facility row (% of profitability exposure), else zero.
  profitabilityDefaults?: CommercialProfitabilityDefaultConfig[];
  // When true, the facility had no governed product/rate and fell back to code
  // constants — the engine surfaces a `commercial_product_fallback` warning.
  productFallback?: boolean;
  componentFallbacks?: PolicyComponentFallbacks;
  capitalRatioPct?: number | null;
  quoteFeeSetting?: QuoteFeeSettingConfig;
  expectedLossPolicy?: ExpectedLossPolicyConfig | null;
}

export const DEFAULT_COMMERCIAL_PRICING_CONFIG: CommercialPricingConfig = {
  scoreModel: DEFAULT_COMMERCIAL_SCORE_MODEL,
  baseRates: COMMERCIAL_BASE_RATES,
  marginFloor: COMMERCIAL_MARGIN_FLOOR,
  marginPolicy: {
    estimatedCostOfFunds: null,
    targetMargin: null,
    scoreMarginFloorPct: COMMERCIAL_MARGIN_FLOOR,
    hardMinimumNetInterestMarginPct: COMMERCIAL_MARGIN_FLOOR,
    hardMinimumMargin: COMMERCIAL_MARGIN_FLOOR,
  },
  productLimits: {
    minLoanAmount: null,
    maxLoanAmount: null,
    minTermYears: null,
    maxTermYears: null,
  },
  fees: {
    establishmentFeePct: COMMERCIAL_FEES.establishmentFeePct,
    establishmentFeeMin: COMMERCIAL_FEES.establishmentFeeMin,
    overdraftLineFeePct: COMMERCIAL_FEES.overdraftLineFeePct,
    equipmentDocumentationFee: COMMERCIAL_FEES.equipmentDocumentationFee,
  },
  approval: {
    seniorExposure: COMMERCIAL_APPROVAL.seniorExposure,
    reviewExposure: COMMERCIAL_APPROVAL.reviewExposure,
    requestedBelowIndicativeManager:
      COMMERCIAL_APPROVAL.requestedBelowIndicativeManager,
    requestedBelowIndicativeSenior:
      COMMERCIAL_APPROVAL.requestedBelowIndicativeSenior,
  },
  dscrBands: {
    strongMin: DSCR_BANDS.strongMin,
    acceptableMin: DSCR_BANDS.acceptableMin,
  },
  customerConcentrationThresholdPct:
    COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  profitabilityDefaults: [],
  capitalRatioPct: 11.5,
};

// There are deliberately no code-fallback profitability assumptions: without a
// governed row a blank line item stays zero, so fallback economics can never
// leak into the lender P&L.
function resolveCommercialProfitabilityDefaults(
  defaults: CommercialProfitabilityDefaultConfig[],
  channel: CommercialPricingInput["channel"],
  facilityType: CommercialFacilityType,
): Pick<
  CommercialProfitabilityDefaultConfig,
  "commissionsPct" | "otherIncomePct" | "expensesPct"
> {
  const normalizedChannel = channel ?? "direct";
  const row =
    defaults.find(
      (item) =>
        item.active &&
        item.channel === normalizedChannel &&
        item.facilityType === facilityType,
    ) ?? null;
  return {
    commissionsPct: row?.commissionsPct ?? null,
    otherIncomePct: row?.otherIncomePct ?? null,
    expensesPct: row?.expensesPct ?? null,
  };
}

const APPROVAL_ORDER: ApprovalLevel[] = [
  "none",
  "manager",
  "senior",
  "review",
  "exception",
];

function maxApproval(a: ApprovalLevel, b: ApprovalLevel): ApprovalLevel {
  return APPROVAL_ORDER.indexOf(b) > APPROVAL_ORDER.indexOf(a) ? b : a;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

function commercialLimitErrors(
  input: CommercialPricingInput,
  limits: CommercialPricingConfig["productLimits"],
): string[] {
  if (!limits) return [];
  const errors: string[] = [];
  const minLoanAmount = limits.minLoanAmount;
  const maxLoanAmount = limits.maxLoanAmount;
  if (
    minLoanAmount != null &&
    maxLoanAmount != null &&
    (input.loanAmount < minLoanAmount || input.loanAmount > maxLoanAmount)
  ) {
    errors.push(
      `Facility amount must be between ${formatMoney(minLoanAmount)} and ${formatMoney(maxLoanAmount)}.`,
    );
  } else if (minLoanAmount != null && input.loanAmount < minLoanAmount) {
    errors.push(
      `Facility amount must be at least ${formatMoney(minLoanAmount)}.`,
    );
  } else if (maxLoanAmount != null && input.loanAmount > maxLoanAmount) {
    errors.push(
      `Facility amount must be no more than ${formatMoney(maxLoanAmount)}.`,
    );
  }

  const term = input.loanTermYears ?? null;
  if (term == null) return errors;
  const minTermYears = limits.minTermYears;
  const maxTermYears = limits.maxTermYears;
  if (
    minTermYears != null &&
    maxTermYears != null &&
    (term < minTermYears || term > maxTermYears)
  ) {
    errors.push(
      `Facility term must be between ${minTermYears} and ${maxTermYears} years.`,
    );
  } else if (minTermYears != null && term < minTermYears) {
    errors.push(`Facility term must be at least ${minTermYears} years.`);
  } else if (maxTermYears != null && term > maxTermYears) {
    errors.push(`Facility term must be no more than ${maxTermYears} years.`);
  }
  return errors;
}

export function assessCashFlow(
  input: CommercialPricingInput,
  finalRate: number,
  dscrBands: CommercialPricingConfig["dscrBands"],
): CashFlowAssessment {
  const newAnnualDebtService = round2(annualDebtServiceFor(input, finalRate));
  const ebitda = input.ebitda ?? null;
  const existing = input.existingAnnualDebtService ?? null;

  if (ebitda == null) {
    return {
      band: "not_assessed",
      ebitda,
      existingAnnualDebtService: existing,
      newAnnualDebtService,
      totalAnnualDebtService: null,
      debtServiceCoverRatio: null,
    };
  }

  const total = round2((existing ?? 0) + newAnnualDebtService);
  // Band on the exact ratio and round only for display, so a DSCR sitting on a
  // policy boundary cannot be flipped into a different band by 2dp rounding.
  const exactDscr = total > 0 ? ebitda / total : null;
  const dscr = exactDscr == null ? null : round2(exactDscr);
  const band: ServiceabilityBand =
    exactDscr == null || exactDscr < 1.0
      ? "insufficient"
      : exactDscr >= dscrBands.strongMin
        ? "strong"
        : exactDscr >= dscrBands.acceptableMin
          ? "acceptable"
          : "marginal";

  return {
    band,
    ebitda,
    existingAnnualDebtService: existing,
    newAnnualDebtService,
    totalAnnualDebtService: total,
    debtServiceCoverRatio: dscr,
  };
}

export function calculateCommercialLoanPricing(
  input: CommercialPricingInput,
  config: CommercialPricingConfig = DEFAULT_COMMERCIAL_PRICING_CONFIG,
): CommercialPricingResult {
  const warnings: WarningItem[] = [];
  const approvalReasons: ApprovalReason[] = [];
  let approvalLevel: ApprovalLevel = "none";

  const escalate = (level: ApprovalLevel, message: string) => {
    approvalLevel = maxApproval(approvalLevel, level);
    approvalReasons.push({ level, message });
  };

  if (config.productFallback) {
    warnings.push({
      code: "commercial_product_fallback",
      message:
        "No governed commercial product/rate matched this facility — pricing used the built-in baseline rates and fees.",
      severity: "info",
    });
  }

  const componentWarnings: Array<{
    key: Exclude<keyof PolicyComponentFallbacks, "product">;
    code: string;
    message: string;
  }> = [
    {
      key: "scoreModel",
      code: "commercial_score_model_fallback",
      message:
        "No current governed commercial score model is available; compiled score policy is in use.",
    },
    {
      key: "margin",
      code: "commercial_margin_fallback",
      message:
        "No matching governed commercial margin setting is available; compiled margin policy is in use.",
    },
    {
      key: "approval",
      code: "commercial_approval_fallback",
      message:
        "The governed commercial approval controls are unavailable; compiled escalation thresholds are in use.",
    },
    {
      key: "profitability",
      code: "commercial_profitability_fallback",
      message:
        "One or more governed commercial profitability scopes are incomplete; blank line items resolve to zero.",
    },
    {
      key: "fees",
      code: "commercial_fee_fallback",
      message:
        "Governed commercial product or quote fees are incomplete; compiled or zero fee values are in use.",
    },
    {
      key: "capital",
      code: "commercial_capital_fallback",
      message:
        "The governed capital-allocation setting is unavailable; indicative ROE cannot be completed.",
    },
  ];
  for (const warning of componentWarnings) {
    if (config.componentFallbacks?.[warning.key]) {
      warnings.push({
        code: warning.code,
        message: warning.message,
        severity: "warning",
      });
    }
  }
  // --- Rate construction: selected base rate less score discount ---
  const loanType = input.loanType ?? "standard";
  const base =
    config.baseRates[input.facilityType]?.[loanType] ??
    COMMERCIAL_BASE_RATES[input.facilityType][loanType];
  const selectedRateId = base.selectedRateId ?? null;
  const selectedRateRole = publishedRateRole(base.pricingRole);
  const customerScore = evaluateCommercialScoreModel(input, config.scoreModel, {
    baseRate: base.rate,
    customerConcentrationThresholdPct: config.customerConcentrationThresholdPct,
  });

  for (const message of commercialLimitErrors(input, config.productLimits)) {
    warnings.push({
      code: "commercial_limit_breach",
      message,
      severity: "critical",
    });
    escalate("exception", message);
  }

  // Security coverage — display, warnings and approvals (also a score factor).
  const securitySummary = summariseCommercialSecurities(input);
  const exactCoverage =
    securitySummary.primarySecurityType === "unsecured" ||
    securitySummary.totalSecurityValue == null
      ? securitySummary.primarySecurityType === "unsecured"
        ? 0
        : null
      : securitySummary.totalSecurityValue / input.loanAmount;
  const coverage = exactCoverage == null ? null : round2(exactCoverage);
  const coverageBand =
    exactCoverage == null
      ? null
      : (SECURITY_COVERAGE_LABELS.find((b) => exactCoverage >= b.minCoverage) ??
        SECURITY_COVERAGE_LABELS[SECURITY_COVERAGE_LABELS.length - 1]);

  const scoreMargin = customerScore.pricingAdjustment;
  const discountOnly = isDiscountEntitlementCurve(config.scoreModel.rateCurve);
  const marginPolicy = config.marginPolicy ?? {
    estimatedCostOfFunds: null,
    targetMargin: null,
    scoreMarginFloorPct: config.marginFloor,
    hardMinimumNetInterestMarginPct: config.marginFloor,
    hardMinimumMargin: config.marginFloor,
  };
  const legacyMarginFloor =
    marginPolicy.hardMinimumMargin ?? config.marginFloor;
  const scoreMarginFloor =
    marginPolicy.scoreMarginFloorPct ?? legacyMarginFloor;
  const hardMinimumNetInterestMargin =
    marginPolicy.hardMinimumNetInterestMarginPct ?? legacyMarginFloor;
  const productRateMarginFloor = isMinimumCustomerRate(selectedRateRole)
    ? 0
    : Number.NEGATIVE_INFINITY;
  const applicableScoreMarginFloor = discountOnly
    ? Number.NEGATIVE_INFINITY
    : scoreMarginFloor;
  const totalMargin = Math.max(
    applicableScoreMarginFloor,
    scoreMargin,
    productRateMarginFloor,
  );
  const marginFloorApplied = totalMargin !== scoreMargin;
  const indicativeRate = round2(base.rate + totalMargin);
  const discountBlockedByFloorPct = round2(
    Math.max(0, totalMargin - scoreMargin),
  );

  // Legacy models retain their historical floor/loading range. Discount-only
  // models range from the selected base less the cap to the selected base.
  const adjustmentRange = pricingAdjustmentRangeForCurve(
    config.scoreModel.rateCurve,
  );
  const floorRate = round2(
    base.rate +
      Math.max(
        applicableScoreMarginFloor,
        adjustmentRange.min,
        productRateMarginFloor,
      ),
  );
  const topRate = round2(
    base.rate + Math.max(applicableScoreMarginFloor, adjustmentRange.max),
  );

  const requestedRate = input.requestedRate ?? null;
  const benchmarkInput: CommercialPricingInput = {
    ...input,
    requestedRate: null,
    requestedReason: null,
    requestedReasonNotes: null,
  };
  const benchmarkScore = evaluateCommercialScoreModel(
    benchmarkInput,
    config.scoreModel,
    {
      baseRate: base.rate,
      customerConcentrationThresholdPct:
        config.customerConcentrationThresholdPct,
    },
  );
  const benchmarkMargin = Math.max(
    applicableScoreMarginFloor,
    benchmarkScore.pricingAdjustment,
    productRateMarginFloor,
  );
  const approvalBenchmarkRate = base.rate + benchmarkMargin;
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
  const competitorGapFromIndicative =
    competitorRate == null ? null : round2(indicativeRate - competitorRate);
  if (
    competitorRate != null &&
    competitorGapFromIndicative != null &&
    competitorGapFromIndicative > 0
  ) {
    const comparisonLabel = discountOnly ? "suggested rate" : "indicative rate";
    warnings.push({
      code: "competitor_lower",
      message: `Competitor rate (${competitorRate.toFixed(2)}%) is ${competitorGapFromIndicative.toFixed(2)}% lower than the ${comparisonLabel}.`,
      severity: "info",
    });
  }
  const finalDisplayRate = requestedRate ?? indicativeRate;
  const marginCostOfFunds =
    input.costOfFunds ?? marginPolicy.estimatedCostOfFunds;
  const exactEstimatedMargin =
    marginCostOfFunds == null
      ? null
      : policyPercentDifference(finalDisplayRate, marginCostOfFunds);
  const estimatedMargin =
    exactEstimatedMargin == null ? null : round2(exactEstimatedMargin);
  let marginStatus: CommercialPricingResult["margin"]["status"] =
    estimatedMargin == null ? "unavailable" : "healthy";
  if (
    exactEstimatedMargin != null &&
    isPolicyPercentBelow(exactEstimatedMargin, hardMinimumNetInterestMargin)
  ) {
    marginStatus = "below_hard_minimum";
    warnings.push({
      code: "commercial_margin_below_hard_min",
      message: `Estimated margin of ${estimatedMargin!.toFixed(2)}% is below the ${hardMinimumNetInterestMargin.toFixed(2)}% hard minimum net interest margin.`,
      severity: "critical",
    });
    escalate("exception", "Estimated margin is below the hard minimum margin.");
  } else if (
    exactEstimatedMargin != null &&
    marginPolicy.targetMargin != null &&
    isPolicyPercentBelow(exactEstimatedMargin, marginPolicy.targetMargin)
  ) {
    marginStatus = "below_target";
    warnings.push({
      code: "commercial_margin_below_target",
      message: `Estimated margin of ${estimatedMargin!.toFixed(2)}% is below the ${marginPolicy.targetMargin.toFixed(2)}% target margin.`,
      severity: "warning",
    });
    escalate("manager", "Estimated margin is below target.");
  }

  // --- Repayments at the offered rate ---
  const revolving = input.repaymentType === "revolving" || !input.loanTermYears;
  const annualRepayment = revolving
    ? null
    : round2(annualDebtServiceFor(input, finalDisplayRate));
  const monthlyRepayment =
    annualRepayment == null ? null : round2(annualRepayment / 12);

  // --- Annual Lender profitability ---
  // Commercial facility fees deliberately stay outside this waterfall.
  const channel = input.channel ?? "direct";
  const expectedUtilisationPct =
    input.facilityType === "overdraft"
      ? (input.expectedUtilisationPct ?? 65)
      : 100;
  const profitabilityExposure = round2(
    input.loanAmount * (expectedUtilisationPct / 100),
  );
  const estimatedAnnualInterestRevenue = round2(
    profitabilityExposure * (finalDisplayRate / 100),
  );
  const estimatedAnnualFundingCost =
    marginCostOfFunds == null
      ? null
      : round2(profitabilityExposure * (marginCostOfFunds / 100));
  const estimatedAnnualNetInterestIncome =
    estimatedAnnualFundingCost == null
      ? null
      : round2(estimatedAnnualInterestRevenue - estimatedAnnualFundingCost);
  const grossMarginPct =
    marginCostOfFunds == null
      ? null
      : round2(finalDisplayRate - marginCostOfFunds);
  // Blank annual line items resolve to the governed channel/facility default
  // (% of profitability exposure), else zero. Explicit inputs always win.
  const profitabilityDefaults = resolveCommercialProfitabilityDefaults(
    config.profitabilityDefaults ?? [],
    input.channel,
    input.facilityType,
  );
  const defaultAmount = (pct: number | null): number =>
    pct == null ? 0 : round2(profitabilityExposure * (pct / 100));
  const commissions =
    channel === "online"
      ? 0
      : (input.commissions ??
        defaultAmount(profitabilityDefaults.commissionsPct));
  const otherIncome =
    input.otherIncome ?? defaultAmount(profitabilityDefaults.otherIncomePct);
  const feeIncome = calculateQuoteFeeIncome(
    input.upfrontFeeOverride,
    config.quoteFeeSetting,
    input.monthlyFeeOverride,
  );
  if (config.quoteFeeSetting?.configured === false) {
    warnings.push({
      code: "quote_fee_policy_unavailable",
      message:
        "Governed commercial-loan quote fees are unavailable — $0 defaults were used for fees without a quote override.",
      severity: "warning",
    });
  }
  const expenses =
    input.expenses ?? defaultAmount(profitabilityDefaults.expensesPct);
  const netIncome =
    estimatedAnnualNetInterestIncome == null
      ? null
      : round2(
          estimatedAnnualNetInterestIncome -
            commissions +
            otherIncome +
            feeIncome.firstYearFeeIncome,
        );
  // Final profit, tax and returns are unavailable until the service layer
  // applies the governed expected-loss policy.
  const profitBeforeTax = null;
  const tax = null;
  const profitAfterTax = null;
  const returnOnAssets = null;
  const suggestedCapitalClass: CommercialCapitalExposureClass =
    input.facilityType === "commercial_property"
      ? "commercial_property_dependent"
      : input.annualRevenue != null &&
          input.annualRevenue < 75_000_000 &&
          input.loanAmount + (input.otherLenderExposure ?? 0) < 1_500_000
        ? "sme_retail"
        : input.annualRevenue != null && input.annualRevenue < 75_000_000
          ? "sme_corporate"
          : "general_corporate";
  const commercialCapitalClassification = classifyCommercialCapital({
    facilityType: input.facilityType,
    loanAmount: input.loanAmount,
    currentDrawnBalance: input.currentDrawnBalance ?? null,
    annualRevenue: input.annualRevenue ?? null,
    otherLenderExposure: input.otherLenderExposure ?? null,
    securityValue: input.securityValue ?? null,
    apsExposureClass: input.apsExposureClass ?? suggestedCapitalClass,
    capitalClassificationConfirmed:
      input.capitalClassificationConfirmed ?? false,
    capitalPropertyStandardStatus:
      input.capitalPropertyStandardStatus ??
      (input.facilityType === "commercial_property" ? "unconfirmed" : null),
    capitalPropertyCashFlowDependent:
      input.capitalPropertyCashFlowDependent ?? null,
    riskWeightOverridePct: input.riskWeightOverridePct ?? null,
    creditConversionFactorOverridePct:
      input.creditConversionFactorOverridePct ?? null,
    capitalOverrideReason: input.capitalOverrideReason ?? null,
  });
  const capitalAllocation =
    config.capitalRatioPct != null
      ? calculateCapitalAllocation(
          {
            ...commercialCapitalClassification,
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
  for (const code of commercialCapitalClassification.warnings) {
    warnings.push({
      code,
      message:
        "APS capital classification is unconfirmed — indicative ROE uses a conservative risk weight.",
      severity: "warning",
    });
  }
  const profitability: CommercialPricingResult["profitability"] = {
    customerRate: finalDisplayRate,
    estimatedAnnualInterestRevenue,
    estimatedAnnualFundingCost,
    estimatedAnnualNetInterestIncome,
    netInterestMargin: grossMarginPct,
    revenueLostVsCarded: null,
    revenueLostVsSuggested: round2(
      profitabilityExposure * ((indicativeRate - finalDisplayRate) / 100),
    ),
    costOfFunds: marginCostOfFunds,
    grossMarginPct,
    channel,
    commissions,
    otherIncome,
    feeIncome,
    expenses,
    taxRatePct: null,
    tax,
    averageAssets: profitabilityExposure,
    netIncome,
    profitBeforeTax,
    profitAfterTax,
    returnOnAssets,
    capitalAllocation,
    expectedUtilisationPct,
    profitabilityExposure,
  };

  // --- Fees ---
  const fees: CommercialFees = {
    establishmentFee: round2(
      Math.max(
        config.fees.establishmentFeeMin,
        (config.fees.establishmentFeePct / 100) * input.loanAmount,
      ),
    ),
    annualLineFeePct:
      input.facilityType === "overdraft"
        ? config.fees.overdraftLineFeePct
        : null,
    documentationFee:
      input.facilityType === "equipment_finance"
        ? config.fees.equipmentDocumentationFee
        : null,
  };

  // --- Cash flow / serviceability ---
  const cashFlow = assessCashFlow(input, finalDisplayRate, config.dscrBands);
  if (cashFlow.band === "not_assessed") {
    warnings.push({
      code: "cash_flow_not_assessed",
      message:
        "Business cash flow not assessed — capture EBITDA and existing debt service before quoting.",
      severity: "warning",
    });
    escalate("review", "Business cash flow has not been assessed.");
  } else if (cashFlow.band === "marginal") {
    warnings.push({
      code: "dscr_marginal",
      message: `Debt service cover of ${cashFlow.debtServiceCoverRatio?.toFixed(2)}x is below the ${config.dscrBands.acceptableMin.toFixed(2)}x policy benchmark.`,
      severity: "warning",
    });
    escalate("review", "Debt service cover below policy benchmark.");
  } else if (cashFlow.band === "insufficient") {
    warnings.push({
      code: "dscr_insufficient",
      message:
        "EBITDA does not cover total debt service — the facility does not appear serviceable as structured.",
      severity: "critical",
    });
    escalate("exception", "Debt service cover below 1.0x.");
  }

  // --- Security posture ---
  const security: SecurityAssessment = {
    securities: securitySummary.securities,
    primarySecurityType: securitySummary.primarySecurityType,
    totalSecurityValue: securitySummary.totalSecurityValue,
    securityValue: securitySummary.totalSecurityValue,
    securityCoverageRatio: coverage,
    label:
      coverageBand?.label ??
      COMMERCIAL_SECURITY_LABELS[securitySummary.primarySecurityType],
  };
  if (coverage == null && securitySummary.primarySecurityType !== "unsecured") {
    warnings.push({
      code: "security_value_missing",
      message:
        "One or more security values have not been captured, so total coverage cannot be assessed.",
      severity: "warning",
    });
    escalate("manager", "Security coverage not assessed.");
  } else if (exactCoverage != null && exactCoverage < 1.0) {
    warnings.push({
      code: "partially_secured",
      message: "Facility is not fully covered by security.",
      severity: exactCoverage < 0.5 ? "warning" : "info",
    });
    escalate("manager", "Facility not fully secured.");
  }

  // --- Customer score / structure escalation ---
  if (customerScore.band === "watch") {
    escalate("manager", "Marginal customer score band.");
  } else if (customerScore.band === "weak") {
    warnings.push({
      code: "score_band_weak",
      message:
        "Weak customer score band — refer to business credit before quoting.",
      severity: "warning",
    });
    escalate("review", "Weak customer score band.");
  }
  if ((input.yearsTrading ?? null) != null && input.yearsTrading! < 3) {
    warnings.push({
      code: "early_stage_business",
      message: "Business has been trading for less than 3 years.",
      severity: "warning",
    });
    escalate("manager", "Early-stage business (trading < 3 years).");
  }

  const totalExposure = input.loanAmount + (input.otherLenderExposure ?? 0);
  if (totalExposure > config.approval.reviewExposure) {
    escalate("review", "Aggregate exposure above the large-exposure limit.");
  } else if (totalExposure > config.approval.seniorExposure) {
    escalate("senior", "Aggregate exposure requires senior sign-off.");
  }

  // --- Requested rate escalation ---
  if (requestedRate != null) {
    const discount =
      requestedRateBenchmark?.requestedDiscountFromBenchmark ?? 0;
    const exactImpliedMargin = policyPercentDifference(
      requestedRate,
      base.rate,
    );
    const impliedMargin = round2(exactImpliedMargin);
    const automaticRateFloor = isMinimumCustomerRate(selectedRateRole)
      ? base.rate
      : Number.NEGATIVE_INFINITY;
    const nimApprovalFloor =
      marginCostOfFunds == null
        ? Number.NEGATIVE_INFINITY
        : marginCostOfFunds + hardMinimumNetInterestMargin;
    const absoluteRequestedRateFloor = discountOnly
      ? Math.max(automaticRateFloor, nimApprovalFloor)
      : Math.max(
          base.rate + scoreMarginFloor,
          automaticRateFloor,
          nimApprovalFloor,
        );
    if (
      Number.isFinite(absoluteRequestedRateFloor) &&
      isPolicyPercentBelow(requestedRate, absoluteRequestedRateFloor)
    ) {
      const floorLabel =
        Number.isFinite(automaticRateFloor) &&
        isPolicyPercentBelow(requestedRate, automaticRateFloor)
          ? "explicit minimum customer rate"
          : "hard-NIM approval floor";
      warnings.push({
        code: "requested_below_margin_floor",
        message: `Requested rate is below the ${floorLabel} of ${absoluteRequestedRateFloor.toFixed(2)}% (a ${impliedMargin.toFixed(2)}% movement from base).`,
        severity: "critical",
      });
      escalate("exception", `Requested rate is below the ${floorLabel}.`);
    } else if (discount > config.approval.requestedBelowIndicativeSenior) {
      escalate(
        "senior",
        `Requested rate is ${discount.toFixed(2)}% below the ${discountOnly ? "suggested" : "indicative"} rate.`,
      );
    } else if (discount > config.approval.requestedBelowIndicativeManager) {
      escalate(
        "manager",
        `Requested rate is ${discount.toFixed(2)}% below the ${discountOnly ? "suggested" : "indicative"} rate.`,
      );
    }
  }

  const explanationText = discountOnly
    ? `${base.baseRateName} of ${base.rate.toFixed(2)}% less a customer score discount of ${customerScore.scoreDiscountPct.toFixed(2)}% (score ${customerScore.score.toFixed(0)}/100) gives a suggested rate of ${indicativeRate.toFixed(2)}% p.a.`
    : `${base.baseRateName} of ${base.rate.toFixed(2)}% plus a legacy customer score margin of ${totalMargin.toFixed(2)}% (score ${customerScore.score.toFixed(0)}/100) gives an indicative rate of ${indicativeRate.toFixed(2)}% p.a.`;

  return {
    customerScore,
    pricingBasis: customerScore.pricingBasis,
    discountEntitlementPct: customerScore.discountEntitlementPct,
    discountThresholdScore: customerScore.discountThresholdScore,
    maxDiscountPct: customerScore.maxDiscountPct,
    scoreDiscountPct: customerScore.scoreDiscountPct,
    startingRate: base.rate,
    suggestedRate: indicativeRate,
    discountBlockedByFloorPct,
    customerConcentrationThresholdPct: config.customerConcentrationThresholdPct,
    loanType,
    baseRateName: base.baseRateName,
    baseRate: base.rate,
    selectedRateId,
    selectedRateRole,
    components: [],
    totalMargin,
    marginFloorApplied,
    indicativeRate,
    floorRate,
    topRate,
    requestedRate,
    requestedRateBenchmark,
    competitorRate,
    competitorGapFromIndicative,
    finalDisplayRate,
    cashFlow,
    security,
    fees,
    margin: {
      costOfFunds: marginCostOfFunds,
      estimatedMargin,
      targetMargin: marginPolicy.targetMargin,
      scoreMarginFloorPct: discountOnly ? 0 : scoreMarginFloor,
      hardMinimumNetInterestMarginPct: hardMinimumNetInterestMargin,
      hardMinimumMargin: hardMinimumNetInterestMargin,
      status: marginStatus,
    },
    profitability,
    annualRepayment,
    monthlyRepayment,
    approvalRequired: approvalLevel !== "none",
    approvalLevel,
    approvalReasons,
    warnings,
    explanationText,
  };
}
