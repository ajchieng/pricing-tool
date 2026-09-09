// Fictional score model, generic fact derivation and weighted-score evaluation.
// The selected rate minus its score entitlement produces the indicative rate.

import {
  discountOnlyRateCurve,
  evaluateScoreModel,
  factorConfig,
  map,
  rule,
  sanitizeScoreModelJson,
  scoreModelBody,
  scoreModelFromRow,
  type ScoreFacts,
  type ScoreModelBody,
  type ScoreModelRow,
} from "@/lib/pricing/score-engine";
import type {
  CustomerScoreCategory,
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreResult,
} from "@/lib/pricing/types";
import { annualDebtServiceFor } from "./debt-service";
import {
  COMMERCIAL_BASE_RATES,
  COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
} from "./config";
import { policyPercentDifference } from "../policy-percent";
import type { CommercialPricingInput } from "./types";
import { summariseCommercialSecurities } from "./securities";

export const COMMERCIAL_SCORE_FIELDS: Array<{
  field: string;
  label: string;
  fieldType: CustomerScoreFactorConfig["fieldType"];
  category: CustomerScoreCategory;
}> = [
  {
    field: "businessRiskGrade",
    label: "Business risk grade",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "dscrAtBase",
    label: "Debt service cover (at base rate)",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "industryCategory",
    label: "Industry",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "yearsTrading",
    label: "Years trading",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "annualRevenue",
    label: "Annual revenue",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "financialsQuality",
    label: "Financials quality",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "financialsAgeMonths",
    label: "Financials age",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "revenueTrend",
    label: "Revenue trend",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "profitTrend",
    label: "Profit trend",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "taxStatus",
    label: "ATO tax status",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "largestCustomerRevenueAboveThreshold",
    label: "Largest customer above revenue threshold",
    fieldType: "boolean",
    category: "risk",
  },
  {
    field: "securityType",
    label: "Security type",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "securityCoverageRatio",
    label: "Security coverage ratio",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "facilityType",
    label: "Facility type",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "repaymentType",
    label: "Repayment type",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "loanAmount",
    label: "Facility amount",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "loanTermYears",
    label: "Facility term",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "yearsWithLender",
    label: "Years with Lender",
    fieldType: "number",
    category: "relationship",
  },
  {
    field: "existingRelationship",
    label: "Existing relationship",
    fieldType: "boolean",
    category: "relationship",
  },
  {
    field: "operatingInRegion",
    label: "Operating / based in Region",
    fieldType: "boolean",
    category: "relationship",
  },
  {
    field: "vipCustomer",
    label: "VIP customer",
    fieldType: "boolean",
    category: "strategic",
  },
  {
    field: "competitorRate",
    label: "Competitor rate",
    fieldType: "number",
    category: "strategic",
  },
  {
    field: "requestedRate",
    label: "Requested rate",
    fieldType: "number",
    category: "strategic",
  },
  {
    field: "requestedReason",
    label: "Requested reason",
    fieldType: "enum",
    category: "strategic",
  },
];

// Existing published models may still contain the retired numeric field. It
// remains valid for loading/previewing those versions but is intentionally
// omitted from the admin editor's add-factor choices.
export const COMMERCIAL_SCORE_VALIDATION_FIELDS = [
  ...COMMERCIAL_SCORE_FIELDS,
  {
    field: "customerConcentrationPct",
    label: "Largest customer concentration (legacy)",
    fieldType: "number" as const,
    category: "risk" as const,
  },
];

export const COMMERCIAL_SCORE_FIELD_SET: ReadonlySet<string> = new Set(
  COMMERCIAL_SCORE_VALIDATION_FIELDS.map((item) => item.field),
);

const DEMO_BANDS: import("@/lib/pricing/types").CustomerScoreBandConfig[] = [
  { key: "excellent", label: "Excellent", minScore: 86 },
  { key: "strong", label: "Strong", minScore: 69 },
  { key: "standard", label: "Standard", minScore: 54 },
  { key: "watch", label: "Watch", minScore: 36 },
  { key: "weak", label: "Weak", minScore: 0 },
];
// All figures below are fictional teaching assumptions, independently authored for this demo.
export const DEFAULT_COMMERCIAL_SCORE_MODEL: CustomerScoreModelConfig = {
  id: 1003,
  productArea: "commercial",
  version: 1001,
  name: "Illustrative commercial score model",
  description:
    "Fictional demonstration; not a lender policy or credit decision.",
  bands: DEMO_BANDS,
  rateCurve: discountOnlyRateCurve(1.1, 46),
  factors: [
    factorConfig(
      "dscrAtBase",
      "Debt service cover",
      "risk",
      "dscrAtBase",
      33,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          1.75,
          "Fictional example policy band.",
        ),
        rule(
          "other",
          "Standard demo band",
          "present",
          57,
          undefined,
          "Fictional example policy band.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "yearsTrading",
      "Years trading",
      "risk",
      "yearsTrading",
      22,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          5,
          "Fictional example policy band.",
        ),
        rule(
          "other",
          "Standard demo band",
          "present",
          57,
          undefined,
          "Fictional example policy band.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "securityCoverageRatio",
      "Security coverage",
      "loan",
      "securityCoverageRatio",
      19,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          1.35,
          "Fictional example policy band.",
        ),
        rule(
          "other",
          "Standard demo band",
          "present",
          57,
          undefined,
          "Fictional example policy band.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "yearsWithLender",
      "Relationship tenure",
      "relationship",
      "yearsWithLender",
      14,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          4,
          "Fictional example policy band.",
        ),
        rule(
          "other",
          "Standard demo band",
          "present",
          57,
          undefined,
          "Fictional example policy band.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "loanAmount",
      "Facility size",
      "loan",
      "loanAmount",
      12,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          91,
          850000,
          "Fictional example policy band.",
        ),
        rule(
          "other",
          "Standard demo band",
          "present",
          57,
          undefined,
          "Fictional example policy band.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "businessRiskGrade",
      "Business risk grade",
      "risk",
      "businessRiskGrade",
      24,
      44,
      [
        map("grade_1", 95, "Strong", "Fictional demonstration scoring band."),
        map("grade_2", 82, "Sound", "Fictional demonstration scoring band."),
        map(
          "grade_3",
          64,
          "Acceptable",
          "Fictional demonstration scoring band.",
        ),
        map("grade_4", 42, "Elevated", "Fictional demonstration scoring band."),
        map("grade_5", 21, "Watch", "Fictional demonstration scoring band."),
      ],
      "enum",
    ),
    factorConfig(
      "financialsQuality",
      "Financial evidence",
      "risk",
      "financialsQuality",
      11,
      44,
      [
        map("audited", 93, "Audited", "Fictional demonstration scoring band."),
        map(
          "accountant_prepared",
          83,
          "Accountant prepared",
          "Fictional demonstration scoring band.",
        ),
        map(
          "management_accounts",
          61,
          "Management accounts",
          "Fictional demonstration scoring band.",
        ),
        map(
          "estimated",
          39,
          "Estimated",
          "Fictional demonstration scoring band.",
        ),
      ],
      "enum",
    ),
    factorConfig(
      "taxStatus",
      "Tax status",
      "risk",
      "taxStatus",
      8,
      44,
      [
        map("clear", 90, "Clear", "Fictional demonstration scoring band."),
        map(
          "payment_plan",
          60,
          "Payment plan",
          "Fictional demonstration scoring band.",
        ),
        map("arrears", 28, "Arrears", "Fictional demonstration scoring band."),
        map("unknown", 43, "Unknown", "Fictional demonstration scoring band."),
      ],
      "enum",
    ),
    factorConfig(
      "financialsAgeMonths",
      "Financial evidence age",
      "risk",
      "financialsAgeMonths",
      7,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          89,
          8,
          "Fictional demonstration threshold.",
        ),
        rule(
          "standard",
          "Standard demo band",
          "present",
          53,
          undefined,
          "Fictional demonstration threshold.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "annualRevenue",
      "Annual revenue",
      "risk",
      "annualRevenue",
      6,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          89,
          1800000,
          "Fictional demonstration threshold.",
        ),
        rule(
          "standard",
          "Standard demo band",
          "present",
          53,
          undefined,
          "Fictional demonstration threshold.",
        ),
      ],
      "number",
    ),
    factorConfig(
      "profitTrend",
      "Profit trend",
      "risk",
      "profitTrend",
      8,
      44,
      [
        map(
          "improving",
          92,
          "Improving",
          "Fictional demonstration scoring band.",
        ),
        map(
          "stable_profitable",
          80,
          "Stable profitable",
          "Fictional demonstration scoring band.",
        ),
        map(
          "breakeven",
          46,
          "Break even",
          "Fictional demonstration scoring band.",
        ),
        map(
          "loss_making",
          24,
          "Loss making",
          "Fictional demonstration scoring band.",
        ),
      ],
      "enum",
    ),
  ],
};

// Cash-flow and coverage facts are derived at the facility base rate (not the
// final rate) so the score never depends on its own output.
export function resolveCommercialScoreFacts(
  input: CommercialPricingInput,
  baseRate: number | null = COMMERCIAL_BASE_RATES[input.facilityType][
    input.loanType ?? "standard"
  ].rate,
  customerConcentrationThresholdPct: number = COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
): ScoreFacts {
  const ebitda = input.ebitda ?? null;
  let dscrAtBase: number | null = null;
  if (ebitda != null && baseRate != null) {
    const totalDebtService =
      (input.existingAnnualDebtService ?? 0) +
      annualDebtServiceFor(input, baseRate);
    dscrAtBase = totalDebtService > 0 ? ebitda / totalDebtService : null;
  }

  const security = summariseCommercialSecurities(input);
  const securityCoverageRatio =
    security.primarySecurityType === "unsecured"
      ? 0
      : security.totalSecurityValue == null
        ? null
        : security.totalSecurityValue / input.loanAmount;
  const concentrationThreshold =
    Number.isFinite(customerConcentrationThresholdPct) &&
    customerConcentrationThresholdPct > 0 &&
    customerConcentrationThresholdPct < 100
      ? customerConcentrationThresholdPct
      : COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT;
  const largestCustomerRevenueAboveThreshold =
    input.largestCustomerRevenueAboveThreshold ??
    (input.customerConcentrationPct == null
      ? null
      : input.customerConcentrationPct > concentrationThreshold);
  // Existing governed models may still contain the old numeric factor. Feed
  // those models a deterministic low/high proxy so the new Yes/No input keeps
  // affecting pricing until a new boolean-factor model is published.
  const legacyCustomerConcentrationFact =
    input.customerConcentrationPct ??
    (largestCustomerRevenueAboveThreshold == null
      ? null
      : largestCustomerRevenueAboveThreshold
        ? 100
        : 0);

  return {
    businessRiskGrade: { value: input.businessRiskGrade },
    dscrAtBase: { value: dscrAtBase },
    industryCategory: { value: input.industryCategory },
    yearsTrading: { value: input.yearsTrading ?? null },
    annualRevenue: { value: input.annualRevenue ?? null },
    financialsQuality: { value: input.financialsQuality ?? null },
    financialsAgeMonths: { value: input.financialsAgeMonths ?? null },
    revenueTrend: { value: input.revenueTrend ?? null },
    profitTrend: { value: input.profitTrend ?? null },
    taxStatus: { value: input.taxStatus ?? null },
    largestCustomerRevenueAboveThreshold: {
      value: largestCustomerRevenueAboveThreshold,
    },
    customerConcentrationPct: { value: legacyCustomerConcentrationFact },
    securityType: { value: security.primarySecurityType },
    securityCoverageRatio: { value: securityCoverageRatio },
    facilityType: { value: input.facilityType },
    repaymentType: { value: input.repaymentType },
    loanAmount: { value: input.loanAmount },
    loanTermYears: { value: input.loanTermYears ?? null },
    yearsWithLender: { value: input.yearsWithLender ?? null },
    existingRelationship: { value: input.existingRelationship ?? null },
    operatingInRegion: { value: input.operatingInRegion ?? null },
    vipCustomer: { value: input.vipCustomer ?? false },
    competitorRate: { value: input.competitorRate ?? null },
    requestedRate: {
      value:
        input.requestedRate == null
          ? null
          : input.competitorRate == null
            ? input.requestedRate
            : policyPercentDifference(
                input.requestedRate,
                input.competitorRate,
              ),
      ...(input.requestedRate == null
        ? {}
        : {
            present: input.competitorRate == null,
            numericComparison: input.competitorRate != null,
          }),
    },
    requestedReason: { value: input.requestedReason ?? null },
  };
}

export function evaluateCommercialScoreModel(
  input: CommercialPricingInput,
  model: CustomerScoreModelConfig = DEFAULT_COMMERCIAL_SCORE_MODEL,
  options: {
    baseRate?: number | null;
    customerConcentrationThresholdPct?: number;
  } = {},
): CustomerScoreResult {
  return evaluateScoreModel(
    resolveCommercialScoreFacts(
      input,
      options.baseRate,
      options.customerConcentrationThresholdPct,
    ),
    model,
    COMMERCIAL_SCORE_FIELD_SET,
  );
}

export function sanitizeCommercialScoreModelJson(
  value: unknown,
): ScoreModelBody {
  return sanitizeScoreModelJson(
    value,
    DEFAULT_COMMERCIAL_SCORE_MODEL,
    COMMERCIAL_SCORE_FIELD_SET,
  );
}

export function commercialScoreModelBody(
  model: CustomerScoreModelConfig,
): ScoreModelBody {
  return scoreModelBody(model, COMMERCIAL_SCORE_FIELD_SET);
}

export function commercialScoreModelFromRow(
  row: ScoreModelRow | null,
): CustomerScoreModelConfig {
  return scoreModelFromRow(
    row,
    DEFAULT_COMMERCIAL_SCORE_MODEL,
    sanitizeCommercialScoreModelJson,
  );
}
