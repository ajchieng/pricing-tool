import {
  factorConfig,
  discountOnlyRateCurve,
  map,
  round,
  rule,
  sanitizeScoreModelJson,
  scoreModelBody,
  scoreModelFromRow,
  scoreToPricingAdjustmentWithCurve,
  evaluateScoreModel,
  type ScoreFacts,
  type ScoreModelRow,
} from "./score-engine";
import type {
  CustomerScoreCategory,
  CustomerScoreFactorConfig,
  CustomerScoreField,
  CustomerScoreModelConfig,
  CustomerScoreRateCurveConfig,
  CustomerScoreResult,
  PricingInput,
} from "./types";
import { policyPercentDifference } from "./policy-percent";

function lvr(input: PricingInput): number | null {
  if (!(input.loanAmount >= 0) || !(input.propertyValue > 0)) return null;
  return round((input.loanAmount / input.propertyValue) * 100, 2);
}

const DEFAULT_RATE_CURVE: CustomerScoreRateCurveConfig = discountOnlyRateCurve(
  0.85,
  46,
);

export const ALLOWED_CUSTOMER_SCORE_FIELDS: Array<{
  field: CustomerScoreField;
  label: string;
  fieldType: CustomerScoreFactorConfig["fieldType"];
  category: CustomerScoreCategory;
}> = [
  {
    field: "channel",
    label: "Origination channel",
    fieldType: "enum",
    category: "strategic",
  },
  {
    field: "loanPurpose",
    label: "Loan purpose",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "rateType",
    label: "Rate type",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "fixedPeriodMonths",
    label: "Fixed period",
    fieldType: "number",
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
    label: "Loan amount",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "propertyValueAndLvr",
    label: "Property value / LVR",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "loanTermYears",
    label: "Loan term",
    fieldType: "number",
    category: "loan",
  },
  {
    field: "customerStream",
    label: "Customer stream",
    fieldType: "enum",
    category: "relationship",
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
  {
    field: "livesInServiceRegion",
    label: "Lives in Region",
    fieldType: "enum",
    category: "strategic",
  },
  {
    field: "vipCustomer",
    label: "VIP customer",
    fieldType: "boolean",
    category: "relationship",
  },
  {
    field: "brokerInRegion",
    label: "Broker in region",
    fieldType: "enum",
    category: "strategic",
  },
  {
    field: "brokerVolumeBand",
    label: "Broker 12-month volume",
    fieldType: "enum",
    category: "strategic",
  },
  {
    field: "brokerDiscretionPct",
    label: "Broker discretion percentage",
    fieldType: "number",
    category: "strategic",
  },
  {
    field: "creditScore",
    label: "Credit score",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "dtiRatio",
    label: "DTI ratio",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "grossAnnualIncome",
    label: "Gross annual income",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "serviceabilityNsi",
    label: "Serviceability NSI",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "retentionArrearsHardship18Months",
    label: "Retention arrears or hardship in 18 months",
    fieldType: "boolean",
    category: "risk",
  },
  {
    field: "retentionArrearsPast12Months",
    label: "Retention arrears in 12 months",
    fieldType: "boolean",
    category: "risk",
  },
  {
    field: "yearsAsMember",
    label: "Years as member",
    fieldType: "number",
    category: "relationship",
  },
  {
    field: "existingLenderLoan",
    label: "Existing Lender loan",
    fieldType: "enum",
    category: "relationship",
  },
  {
    field: "lenderProductCount",
    label: "Existing Lender product count",
    fieldType: "number",
    category: "relationship",
  },
];

const DEMO_BANDS: import("@/lib/pricing/types").CustomerScoreBandConfig[] = [
  { key: "excellent", label: "Excellent", minScore: 86 },
  { key: "strong", label: "Strong", minScore: 69 },
  { key: "standard", label: "Standard", minScore: 54 },
  { key: "watch", label: "Watch", minScore: 36 },
  { key: "weak", label: "Weak", minScore: 0 },
];
// All figures below are fictional teaching assumptions, independently authored for this demo.
export const DEFAULT_CUSTOMER_SCORE_MODEL: CustomerScoreModelConfig = {
  id: 1001,
  productArea: "home",
  version: 1001,
  name: "Illustrative home score model",
  description:
    "Fictional demonstration; not a lender policy or credit decision.",
  bands: DEMO_BANDS,
  rateCurve: discountOnlyRateCurve(0.85, 46),
  factors: [
    factorConfig(
      "creditScore",
      "Credit score",
      "risk",
      "creditScore",
      28,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          730,
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
      "dtiRatio",
      "Debt to income",
      "risk",
      "dtiRatio",
      17,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          91,
          4.2,
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
    {
      ...factorConfig(
        "grossAnnualIncome",
        "Annual income",
        "risk",
        "grossAnnualIncome",
        14,
        44,
        [
          rule(
            "preferred",
            "Preferred demo band",
            "gte",
            91,
            95000,
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
      alternativeNumericSources: [
        {
          field: "serviceabilityNsi",
          label: "Serviceability NSI",
          rules: [
            rule(
              "higher_surplus",
              "Higher surplus",
              "gte",
              89,
              2100,
              "Fictional monthly surplus band.",
            ),
            rule(
              "other_surplus",
              "Standard surplus",
              "present",
              59,
              undefined,
              "Fictional monthly surplus band.",
            ),
          ],
        },
      ],
    },
    factorConfig(
      "propertyValueAndLvr",
      "Loan to value",
      "loan",
      "propertyValueAndLvr",
      17,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          91,
          74,
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
      "yearsAsMember",
      "Relationship tenure",
      "relationship",
      "yearsAsMember",
      8,
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
      6,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          280000,
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
      "retentionArrearsHardship18Months",
      "Previous hardship",
      "risk",
      "retentionArrearsHardship18Months",
      5,
      44,
      [
        map(false, 91, "No", "Fictional example policy band."),
        map(true, 33, "Yes", "Fictional example policy band."),
      ],
      "boolean",
    ),
    factorConfig(
      "retentionArrearsPast12Months",
      "Recent arrears",
      "risk",
      "retentionArrearsPast12Months",
      5,
      44,
      [
        map(false, 91, "No", "Fictional example policy band."),
        map(true, 33, "Yes", "Fictional example policy band."),
      ],
      "boolean",
    ),
  ],
};

export function scoreToPricingAdjustment(score: number): number {
  return scoreToPricingAdjustmentWithCurve(score, DEFAULT_RATE_CURVE);
}

const ALLOWED_CUSTOMER_SCORE_FIELD_SET: ReadonlySet<string> = new Set(
  ALLOWED_CUSTOMER_SCORE_FIELDS.map((item) => item.field),
);

function rawFieldValue(
  input: PricingInput,
  field: CustomerScoreField,
): string | number | boolean | null {
  if (field === "channel") return input.channel ?? "direct";
  if (field === "propertyValueAndLvr") return lvr(input);
  if (field === "lenderProductCount") {
    return input.customerStream === "new_to_bank"
      ? null
      : (input.lenderProducts?.length ?? null);
  }
  if (
    (field === "brokerInRegion" ||
      field === "brokerVolumeBand" ||
      field === "brokerDiscretionPct") &&
    input.channel !== "broker"
  ) {
    return null;
  }
  if (field === "requestedRate" && input.requestedRate != null) {
    if (input.competitorRate != null) {
      return policyPercentDifference(input.requestedRate, input.competitorRate);
    }
    return input.requestedRate;
  }
  const value = input[field as keyof PricingInput];
  if (value == null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

export function resolveHomeLoanScoreFacts(input: PricingInput): ScoreFacts {
  const facts: ScoreFacts = {};
  for (const { field } of ALLOWED_CUSTOMER_SCORE_FIELDS) {
    facts[field] = { value: rawFieldValue(input, field) };
  }
  if (input.requestedRate != null) {
    const hasCompetitor = input.competitorRate != null;
    // With evidence, score the numeric requested-minus-competitor delta and do
    // not match the generic presence rule. Without evidence, the absolute rate
    // is not a delta, so skip numeric comparisons and match presence only.
    facts.requestedRate.present = !hasCompetitor;
    facts.requestedRate.numericComparison = hasCompetitor;
  }
  return facts;
}

export function evaluateCustomerScoreModel(
  input: PricingInput,
  model: CustomerScoreModelConfig,
): CustomerScoreResult {
  return evaluateScoreModel(
    resolveHomeLoanScoreFacts(input),
    model,
    ALLOWED_CUSTOMER_SCORE_FIELD_SET,
  );
}

export function calculateCustomerScore(
  input: PricingInput,
): CustomerScoreResult {
  return evaluateCustomerScoreModel(input, DEFAULT_CUSTOMER_SCORE_MODEL);
}

function defaultFactor(key: string): CustomerScoreFactorConfig | undefined {
  return DEFAULT_CUSTOMER_SCORE_MODEL.factors.find(
    (factor) => factor.key === key,
  );
}

function applyCurrentScoreModelInvariants(
  factors: CustomerScoreFactorConfig[],
): CustomerScoreFactorConfig[] {
  const obsoleteFields = new Set([
    "existingMember",
    "retentionScenario",
    "newToBankGrowthOpportunity",
    "employmentIncomeStability",
    "serviceabilityStatus",
    "salaryCreditedToLender",
    "salaryCreditedAmount",
    "existingTransactionOrSavingsAccount",
    "multipleLenderProducts",
  ]);
  const next = factors
    .filter((factor) => !obsoleteFields.has(factor.field))
    .map((factor) => {
      if (factor.key === "livesInServiceRegion") {
        return {
          ...factor,
          label: "Lives in Region",
          category: "strategic" as const,
        };
      }
      if (factor.key === "vipCustomer") {
        return { ...factor, category: "relationship" as const };
      }
      return factor;
    });
  for (const key of [
    "vipCustomer",
    "customerStream",
    "brokerInRegion",
    "brokerVolumeBand",
    "brokerDiscretionPct",
    "lenderProductCount",
  ]) {
    if (!next.some((factor) => factor.key === key)) {
      const factor = defaultFactor(key);
      if (factor) next.push(factor);
    }
  }
  return next;
}

export function sanitizeCustomerScoreModelJson(
  value: unknown,
): Pick<CustomerScoreModelConfig, "factors" | "bands" | "rateCurve"> {
  return sanitizeScoreModelJson(
    value,
    DEFAULT_CUSTOMER_SCORE_MODEL,
    ALLOWED_CUSTOMER_SCORE_FIELD_SET,
    applyCurrentScoreModelInvariants,
  );
}

export function customerScoreModelBody(
  model: CustomerScoreModelConfig,
): Pick<CustomerScoreModelConfig, "factors" | "bands" | "rateCurve"> {
  return scoreModelBody(
    model,
    ALLOWED_CUSTOMER_SCORE_FIELD_SET,
    applyCurrentScoreModelInvariants,
  );
}

export function customerScoreModelFromRow(
  row: ScoreModelRow | null,
): CustomerScoreModelConfig {
  return scoreModelFromRow(
    row,
    DEFAULT_CUSTOMER_SCORE_MODEL,
    sanitizeCustomerScoreModelJson,
  );
}
