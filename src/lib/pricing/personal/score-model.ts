// Fictional score model, generic fact derivation and weighted-score evaluation.
// The selected rate minus its score entitlement produces the indicative rate.

import {
  evaluateScoreModel,
  factorConfig,
  map,
  round,
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
import { monthlyRepaymentFor } from "./calculate";
import { PERSONAL_BASE_RATES, personalProductSecurityType } from "./config";
import { policyPercentDifference } from "../policy-percent";
import type { PersonalPricingInput } from "./types";
import { personalEmploymentPricingValue } from "./employment-stability";
import {
  personalDiscountOnlyRateCurve,
  personalRateCurveForSecurity,
} from "./discount-policy";

export const PERSONAL_SCORE_FIELDS: Array<{
  field: string;
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
    field: "creditScore",
    label: "Credit score",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "repaymentToSurplusAtBasePct",
    label: "Repayment share of surplus (at base rate)",
    fieldType: "number",
    category: "risk",
  },
  {
    field: "employmentIncomeStability",
    label: "Employment / income stability",
    fieldType: "enum",
    category: "risk",
  },
  {
    field: "monthlySurplus",
    label: "Monthly surplus",
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
    field: "securityType",
    label: "Security type",
    fieldType: "enum",
    category: "loan",
  },
  {
    field: "loanPurpose",
    label: "Loan purpose",
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
    field: "loanTermMonths",
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
    field: "existingMember",
    label: "Existing member (legacy)",
    fieldType: "boolean",
    category: "relationship",
  },
  {
    field: "yearsAsMember",
    label: "Years as member",
    fieldType: "number",
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
];

const PERSONAL_SCORE_FIELD_SET: ReadonlySet<string> = new Set(
  PERSONAL_SCORE_FIELDS.map((item) => item.field),
);

const DEMO_BANDS: import("@/lib/pricing/types").CustomerScoreBandConfig[] = [
  { key: "excellent", label: "Excellent", minScore: 86 },
  { key: "strong", label: "Strong", minScore: 69 },
  { key: "standard", label: "Standard", minScore: 54 },
  { key: "watch", label: "Watch", minScore: 36 },
  { key: "weak", label: "Weak", minScore: 0 },
];
// All figures below are fictional teaching assumptions, independently authored for this demo.
export const DEFAULT_PERSONAL_SCORE_MODEL: CustomerScoreModelConfig = {
  id: 1002,
  productArea: "personal",
  version: 1001,
  name: "Illustrative personal score model",
  description:
    "Fictional demonstration; not a lender policy or credit decision.",
  bands: DEMO_BANDS,
  rateCurve: personalDiscountOnlyRateCurve(46, 1.2, 0.9),
  factors: [
    factorConfig(
      "creditScore",
      "Credit score",
      "risk",
      "creditScore",
      30,
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
      "repaymentToSurplusAtBasePct",
      "Repayment share of surplus",
      "risk",
      "repaymentToSurplusAtBasePct",
      23,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          91,
          38,
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
      "monthlySurplus",
      "Monthly surplus",
      "risk",
      "monthlySurplus",
      18,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "gte",
          91,
          1600,
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
      "loanTermMonths",
      "Loan term",
      "loan",
      "loanTermMonths",
      9,
      44,
      [
        rule(
          "preferred",
          "Preferred demo band",
          "lte",
          91,
          54,
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
      10,
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
    factorConfig(
      "employmentIncomeStability",
      "Income stability",
      "risk",
      "employmentIncomeStability",
      17,
      44,
      [
        map(
          "stable_payg",
          92,
          "Stable employment",
          "Fictional demonstration scoring band.",
        ),
        map(
          "self_employed",
          78,
          "Self employed",
          "Fictional demonstration scoring band.",
        ),
        map(
          "contractor_casual",
          62,
          "Contract or casual",
          "Fictional demonstration scoring band.",
        ),
        map(
          "review_required",
          31,
          "Review required",
          "Fictional demonstration scoring band.",
        ),
        map(
          "not_assessed",
          44,
          "Not assessed",
          "Fictional demonstration scoring band.",
        ),
      ],
      "enum",
    ),
  ],
};

// Affordability facts are derived at the security-type base rate (not the
// final rate) so the score never depends on its own output.
export function resolvePersonalScoreFacts(
  input: PersonalPricingInput,
  baseRate: number | null = PERSONAL_BASE_RATES[input.securityType].rate,
): ScoreFacts {
  const customerStream =
    input.customerStream ??
    (input.existingMember ? "existing_member" : "new_to_bank");
  const retention = customerStream === "retention";
  const broker = input.channel === "broker";
  const income = input.netMonthlyIncome ?? null;
  const expenses = input.monthlyLivingExpenses ?? null;
  const existingDebt = input.existingMonthlyDebtRepayments ?? null;
  const surplus =
    income != null && expenses != null
      ? round(income - expenses - (existingDebt ?? 0), 2)
      : null;

  let repaymentToSurplusAtBasePct: number | null = null;
  if (surplus != null && baseRate != null) {
    if (surplus > 0) {
      const baseRepayment = monthlyRepaymentFor(
        input.loanAmount,
        baseRate,
        input.loanTermMonths,
      );
      repaymentToSurplusAtBasePct = (baseRepayment / surplus) * 100;
    } else {
      // Assessed with no surplus: pin to the worst affordability rule band.
      repaymentToSurplusAtBasePct = 999;
    }
  }

  return {
    channel: { value: input.channel ?? "direct" },
    creditScore: { value: retention ? null : (input.creditScore ?? null) },
    repaymentToSurplusAtBasePct: { value: repaymentToSurplusAtBasePct },
    employmentIncomeStability: {
      value: retention
        ? "not_assessed"
        : personalEmploymentPricingValue(input.employmentIncomeStability),
    },
    retentionArrearsHardship18Months: {
      value: retention
        ? (input.retentionArrearsHardship18Months ?? null)
        : null,
    },
    retentionArrearsPast12Months: {
      value: retention ? (input.retentionArrearsPast12Months ?? null) : null,
    },
    monthlySurplus: { value: surplus },
    securityType: { value: input.securityType },
    loanPurpose: { value: input.loanPurpose },
    loanAmount: { value: input.loanAmount },
    loanTermMonths: { value: input.loanTermMonths },
    customerStream: {
      value: customerStream,
    },
    existingMember: { value: customerStream !== "new_to_bank" },
    yearsAsMember: {
      value:
        customerStream === "new_to_bank" ? null : (input.yearsAsMember ?? null),
    },
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
    brokerInRegion: {
      value: broker ? (input.brokerInRegion ?? null) : null,
    },
    brokerVolumeBand: {
      value: broker ? (input.brokerVolumeBand ?? null) : null,
    },
    brokerDiscretionPct: {
      value: broker ? (input.brokerDiscretionPct ?? null) : null,
    },
  };
}

function defaultFactor(key: string): CustomerScoreFactorConfig | undefined {
  return DEFAULT_PERSONAL_SCORE_MODEL.factors.find(
    (factor) => factor.key === key,
  );
}

function applyPersonalScoreModelInvariants(
  factors: CustomerScoreFactorConfig[],
): CustomerScoreFactorConfig[] {
  const next = [...factors];
  for (const key of ["yearsAsMember"]) {
    if (!next.some((factor) => factor.key === key)) {
      const factor = defaultFactor(key);
      if (factor) next.push(factor);
    }
  }
  return next;
}

export function evaluatePersonalScoreModel(
  input: PersonalPricingInput,
  model: CustomerScoreModelConfig = DEFAULT_PERSONAL_SCORE_MODEL,
  options: { baseRate?: number | null } = {},
): CustomerScoreResult {
  const rateCurve = personalRateCurveForSecurity(
    model.rateCurve,
    personalProductSecurityType(input.securityType),
  );
  return evaluateScoreModel(
    resolvePersonalScoreFacts(input, options.baseRate),
    { ...model, rateCurve },
    PERSONAL_SCORE_FIELD_SET,
  );
}

export function sanitizePersonalScoreModelJson(value: unknown): ScoreModelBody {
  return sanitizeScoreModelJson(
    value,
    DEFAULT_PERSONAL_SCORE_MODEL,
    PERSONAL_SCORE_FIELD_SET,
    applyPersonalScoreModelInvariants,
  );
}

export function personalScoreModelBody(
  model: CustomerScoreModelConfig,
): ScoreModelBody {
  return scoreModelBody(
    model,
    PERSONAL_SCORE_FIELD_SET,
    applyPersonalScoreModelInvariants,
  );
}

export function personalScoreModelFromRow(
  row: ScoreModelRow | null,
): CustomerScoreModelConfig {
  return scoreModelFromRow(
    row,
    DEFAULT_PERSONAL_SCORE_MODEL,
    sanitizePersonalScoreModelJson,
  );
}
