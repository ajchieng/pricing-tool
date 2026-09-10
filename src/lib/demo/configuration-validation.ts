import { z } from "zod";
import { ALLOWED_CUSTOMER_SCORE_FIELDS } from "@/lib/pricing/customer-score";
import { COMMERCIAL_SCORE_VALIDATION_FIELDS } from "@/lib/pricing/commercial/score-model";
import { PERSONAL_SCORE_FIELDS } from "@/lib/pricing/personal/score-model";
import { assertValidScoreModelBody } from "@/lib/pricing/score-model-validation";
import {
  assertValidExpectedLossPolicy,
  type ExpectedLossPolicyConfig,
} from "@/lib/pricing/credit-risk/policy-validation";

const finite = z.number().finite();
const positiveId = z.number().int().positive();
const money = finite.min(0).max(1_000_000_000_000);
const percent = finite.min(0).max(100);
const signedPercent = finite.min(-100).max(100);
const boundedText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(2_000);
const nullableMoney = money.nullable();
const nullablePercent = percent.nullable();
const nullableText = boundedText.nullable();
const nullableLongText = longText.nullable();
const channel = z.enum(["direct", "broker", "online"]);
const facilityType = z.enum([
  "term_loan",
  "overdraft",
  "equipment_finance",
  "commercial_property",
]);
const commercialLoanType = z.enum(["standard", "non_standard"]);
const securityType = z.enum(["secured", "unsecured"]);
const loanPurpose = z.enum(["owner_occupied", "investment"]);
const rateType = z.enum(["variable", "fixed"]);
const operator = z.enum(["lte", "lt", "gte", "gt", "eq"]);
const approvalLevel = z.enum([
  "none",
  "manager",
  "senior",
  "review",
  "exception",
]);

function httpsUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const candidate = value.replaceAll("{productId}", "example");
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
}

const nullableHttpsUrl = z
  .string()
  .trim()
  .max(2_048)
  .refine(httpsUrl, "Source URL must be a valid HTTPS URL.")
  .nullable();

function orderedRange(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  minimum: string,
  maximum: string,
): void {
  const min = data[minimum];
  const max = data[maximum];
  if (typeof min === "number" && typeof max === "number" && min > max) {
    ctx.addIssue({
      code: "custom",
      path: [minimum],
      message: `${minimum} must not exceed ${maximum}.`,
    });
  }
}

function commonRelations(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  orderedRange(data, ctx, "minLoanAmount", "maxLoanAmount");
  orderedRange(data, ctx, "minTermMonths", "maxTermMonths");
  orderedRange(data, ctx, "minTermYears", "maxTermYears");
  orderedRange(data, ctx, "lvrMin", "lvrMax");
  orderedRange(data, ctx, "minLvr", "maxLvr");
  orderedRange(data, ctx, "hardMinimumMargin", "targetMargin");
  orderedRange(data, ctx, "hardMinimumNetInterestMarginPct", "targetMargin");

  const start = data.effectiveStart ?? data.effectiveFrom;
  const end = data.effectiveEnd ?? data.effectiveTo;
  for (const [key, value] of [
    ["effectiveStart", start],
    ["effectiveEnd", end],
  ] as const) {
    if (
      value != null &&
      (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))
    ) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} must be a valid date and time.`,
      });
    }
  }
  if (typeof start === "string" && typeof end === "string") {
    const startAt = new Date(start);
    const endAt = new Date(end);
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["effectiveEnd"],
        message: "Effective end date must be after the effective start date.",
      });
    }
  }
}

function dataSchema<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .strict()
    .superRefine((data, ctx) => commonRelations(data, ctx));
}

const productFees = {
  establishmentFee: nullableMoney.optional(),
  monthlyServiceFee: nullableMoney.optional(),
  loanContractVariationFee: nullableMoney.optional(),
  titleSearchFee: nullableMoney.optional(),
  dischargeFee: nullableMoney.optional(),
  progressPaymentFee: nullableMoney.optional(),
  onlineRedrawFee: nullableMoney.optional(),
  branchRedrawFee: nullableMoney.optional(),
  defaultFee: nullableMoney.optional(),
};

const productSchema = dataSchema({
  name: boundedText,
  productCategory: boundedText.optional(),
  loanPurpose,
  rateType,
  fixedPeriodMonths: finite.int().min(1).max(600).nullable(),
  repaymentType: z.literal("principal_and_interest").optional(),
  minLoanAmount: nullableMoney,
  maxLoanAmount: nullableMoney,
  maxLvr: nullablePercent,
  notes: nullableLongText.optional(),
  active: z.boolean(),
  ...productFees,
});

const personalProductSchema = dataSchema({
  name: boundedText,
  productCategory: boundedText,
  securityType,
  rateType: z.literal("fixed"),
  minLoanAmount: nullableMoney,
  maxLoanAmount: nullableMoney,
  minTermMonths: finite.int().min(1).max(600).nullable(),
  maxTermMonths: finite.int().min(1).max(600).nullable(),
  redrawAvailable: z.boolean().optional(),
  sourceUrl: nullableHttpsUrl.optional(),
  notes: nullableLongText.optional(),
  active: z.boolean(),
  ...productFees,
});

const commercialProductSchema = dataSchema({
  name: boundedText,
  facilityType,
  baseRateName: boundedText,
  minLoanAmount: nullableMoney,
  maxLoanAmount: nullableMoney,
  minTermYears: finite.min(0).max(100).nullable(),
  maxTermYears: finite.min(0).max(100).nullable(),
  establishmentFeePct: nullablePercent,
  establishmentFeeMin: nullableMoney,
  annualLineFeePct: nullablePercent,
  documentationFee: nullableMoney,
  sourceUrl: nullableHttpsUrl.optional(),
  notes: nullableLongText.optional(),
  active: z.boolean(),
});

const marginSchema = dataSchema({
  productId: positiveId.nullable().optional(),
  personalProductId: positiveId.nullable().optional(),
  securityType: securityType.nullable().optional(),
  estimatedCostOfFunds: percent,
  targetMargin: signedPercent,
  hardMinimumMargin: signedPercent,
  loanPurpose: loanPurpose.nullable().optional(),
  rateType: rateType.nullable().optional(),
  active: z.boolean(),
});

const profitabilitySchema = dataSchema({
  channel: channel.optional(),
  commissionsPct: nullablePercent,
  otherIncomePct: nullablePercent,
  expensesPct: nullablePercent,
  active: z.boolean(),
}).superRefine((data, ctx) => {
  if (
    data.channel === "online" &&
    data.commissionsPct != null &&
    data.commissionsPct !== 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["commissionsPct"],
      message: "Online-channel commission must be zero or blank.",
    });
  }
});

const homeApprovalConditions = new Set([
  "lvr",
  "total_discount",
  "requested_below_suggested",
  "competitor_match",
  "retention_applied",
  "margin_below_target",
  "margin_below_hard_min",
  "loan_amount",
  "lvr_exceeds_max",
  "requested_below_min",
  "serviceability_borderline",
  "serviceability_review_required",
  "income_review_required",
  "risk_not_assessed",
  "credit_score",
  "dti_ratio",
  "gross_annual_income",
  "requested_below_suggested",
  "lvr",
]);
const personalApprovalConditions = new Set([
  "loan_amount",
  "unsecured_amount",
  "requested_below_suggested",
  "credit_not_scored",
  "score_band_watch",
  "score_band_weak",
  "affordability_tight",
  "affordability_not_assessed",
  "margin_below_target",
  "margin_below_hard_min",
  "employment_review_required",
  "retention_applied",
]);
const numericApprovalConditions = new Set([
  "total_discount",
  "loan_amount",
  "unsecured_amount",
  "credit_score",
  "dti_ratio",
  "gross_annual_income",
  "requested_below_suggested",
  "lvr",
]);

function approvalRuleSchema(allowedConditions: Set<string>) {
  return dataSchema({
    name: boundedText,
    approvalLevel,
    conditionType: boundedText,
    conditionOperator: operator,
    conditionValue: z.string().trim().max(100),
    reasonText: longText,
    active: z.boolean(),
    priority: finite.int().min(0).max(1_000_000),
  }).superRefine((data, ctx) => {
    if (!allowedConditions.has(data.conditionType)) {
      ctx.addIssue({
        code: "custom",
        path: ["conditionType"],
        message: "Condition type is not supported for this rule.",
      });
      return;
    }
    if (
      numericApprovalConditions.has(data.conditionType) &&
      !Number.isFinite(Number(data.conditionValue))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["conditionValue"],
        message: "This condition requires a finite numeric value.",
      });
    }
    if (
      !numericApprovalConditions.has(data.conditionType) &&
      (data.conditionOperator !== "eq" ||
        !["true", "false"].includes(data.conditionValue.toLowerCase()))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["conditionValue"],
        message: "Boolean conditions require eq with a true or false value.",
      });
    }
  });
}

const adjustmentSchema = dataSchema({
  name: boundedText,
  description: nullableText.optional(),
  ruleType: z.enum(["discount", "loading"]),
  adjustmentAmount: percent,
  conditionType: z.enum([
    "lvr",
    "loan_amount",
    "existing_member",
    "retention_scenario",
    "multiple_lender_products",
  ]),
  conditionOperator: operator,
  conditionValue: z.string().trim().min(1).max(100),
  appliesToProductId: positiveId.nullable(),
  appliesToLoanPurpose: loanPurpose.nullable(),
  appliesToRateType: rateType.nullable(),
  requiresApproval: z.boolean(),
  reasonText: nullableText,
  active: z.boolean(),
  priority: finite.int().min(0).max(1_000_000),
}).superRefine((data, ctx) => {
  if (data.ruleType === "loading" && data.active) {
    ctx.addIssue({
      code: "custom",
      path: ["active"],
      message: "Home pricing loadings are legacy-only and cannot be activated.",
    });
  }
  const isNumeric =
    data.conditionType === "lvr" || data.conditionType === "loan_amount";
  if (isNumeric && !Number.isFinite(Number(data.conditionValue))) {
    ctx.addIssue({
      code: "custom",
      path: ["conditionValue"],
      message: "This condition requires a finite numeric value.",
    });
  }
  if (!isNumeric && data.conditionOperator !== "eq") {
    ctx.addIssue({
      code: "custom",
      path: ["conditionOperator"],
      message: "Boolean conditions require the eq operator.",
    });
  }
  if (
    !isNumeric &&
    !["true", "false"].includes(data.conditionValue.toLowerCase())
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["conditionValue"],
      message: "Boolean conditions require a true or false value.",
    });
  }
});

const commercialApprovalSchema = dataSchema({
  name: boundedText,
  seniorExposure: money,
  reviewExposure: money,
  requestedBelowIndicativeManager: percent,
  requestedBelowIndicativeSenior: percent,
  dscrStrongMin: finite.min(0).max(1_000),
  dscrAcceptableMin: finite.min(0).max(1_000),
  customerConcentrationThresholdPct: finite.gt(0).lt(100),
  active: z.boolean(),
}).superRefine((data, ctx) => {
  for (const [lower, upper] of [
    ["seniorExposure", "reviewExposure"],
    ["requestedBelowIndicativeManager", "requestedBelowIndicativeSenior"],
    ["dscrAcceptableMin", "dscrStrongMin"],
  ] as const) {
    if (data[lower] >= data[upper]) {
      ctx.addIssue({
        code: "custom",
        path: [lower],
        message: `${lower} must be below ${upper}.`,
      });
    }
  }
});

const expectedLossPolicySchema = dataSchema({
  vertical: z.enum(["home", "personal", "commercial"]),
  version: finite.int().positive(),
  name: boundedText,
  description: nullableLongText,
  compatibleRiskDefinitionHash: z.string().regex(/^[a-f0-9]{64}$/i),
  sourceScoreModelArea: z.enum(["home", "personal", "commercial"]),
  sourceScoreModelVersion: finite.int().positive(),
  effectiveFrom: z.string().trim().min(1).max(64),
  effectiveTo: z.string().trim().min(1).max(64).nullable(),
  active: z.literal(true),
  skipIfActiveMatches: z.boolean().optional(),
  pdBands: z
    .array(
      z
        .object({
          riskGrade: boundedText,
          minRiskScore: percent,
          annualPdPct: percent,
          active: z.boolean().default(true),
        })
        .strict(),
    )
    .min(1)
    .max(100),
  lgdBands: z
    .array(
      z
        .object({
          lossScope: boundedText,
          lgdPct: percent,
          active: z.boolean().default(true),
        })
        .strict(),
    )
    .min(1)
    .max(100),
  eadSettings: z
    .array(
      z
        .object({
          exposureScope: boundedText,
          method: z.enum([
            "one_year_scheduled_balance",
            "expected_principal",
            "drawn_plus_ccf_undrawn",
          ]),
          undrawnCcfPct: nullablePercent,
          active: z.boolean().default(true),
        })
        .strict(),
    )
    .min(1)
    .max(100),
});

export const configurationSchemas = {
  product: productSchema,
  product_rate: dataSchema({
    productId: positiveId.optional(),
    lvrMin: percent,
    lvrMax: percent,
    cardedRate: percent,
    pricingRole: z
      .enum([
        "carded_pricing_anchor",
        "minimum_customer_rate",
        "representative_starting_rate",
      ])
      .default("carded_pricing_anchor"),
    comparisonRate: nullablePercent.optional(),
    effectiveFrom: z.string().trim().min(1).max(64).optional(),
    effectiveTo: z.string().trim().min(1).max(64).nullable().optional(),
    active: z.boolean(),
  }),
  personal_loan_product: personalProductSchema,
  personal_loan_product_rate: dataSchema({
    productId: positiveId.optional(),
    cardedRate: percent,
    pricingRole: z
      .enum([
        "carded_pricing_anchor",
        "minimum_customer_rate",
        "representative_starting_rate",
      ])
      .default("carded_pricing_anchor"),
    comparisonRate: nullablePercent,
    effectiveFrom: z.string().trim().min(1).max(64).optional(),
    effectiveTo: z.string().trim().min(1).max(64).nullable().optional(),
    active: z.boolean(),
  }),
  personal_margin_setting: marginSchema,
  personal_approval_rule: approvalRuleSchema(personalApprovalConditions),
  personal_profitability_default: profitabilitySchema.safeExtend({
    securityType,
  }),
  commercial_loan_product: commercialProductSchema,
  commercial_loan_product_rate: dataSchema({
    productId: positiveId.optional(),
    loanType: commercialLoanType,
    baseRate: percent,
    pricingRole: z
      .enum([
        "carded_pricing_anchor",
        "minimum_customer_rate",
        "representative_starting_rate",
      ])
      .default("carded_pricing_anchor"),
    effectiveFrom: z.string().trim().min(1).max(64).optional(),
    effectiveTo: z.string().trim().min(1).max(64).nullable().optional(),
    active: z.boolean(),
  }),
  commercial_margin_setting: marginSchema.safeExtend({
    facilityType: facilityType.nullable(),
    commercialProductId: positiveId.nullable().optional(),
    scoreMarginFloorPct: signedPercent,
    hardMinimumNetInterestMarginPct: signedPercent,
  }),
  commercial_approval_setting: commercialApprovalSchema,
  commercial_profitability_default: profitabilitySchema.safeExtend({
    facilityType,
  }),
  pricing_adjustment_rule: adjustmentSchema,
  score_model: dataSchema({
    name: boundedText,
    description: nullableText,
    productArea: z.enum(["home", "personal", "commercial"]),
    modelJson: z.record(z.string(), z.unknown()),
    governanceJson: z.record(z.string(), z.unknown()).nullable().optional(),
    skipIfActiveMatches: z.boolean().optional(),
    policyVersion: z.number().int().positive().optional(),
  }),
  approval_rule: approvalRuleSchema(homeApprovalConditions),
  margin_setting: marginSchema,
  profitability_default: profitabilitySchema,
  capital_allocation_setting: dataSchema({
    capitalRatioPct: finite.gt(0).max(100),
  }),
  quote_fee_setting: dataSchema({
    vertical: z.enum(["home", "personal", "commercial"]),
    standardUpfrontFee: money,
    monthlyFee: money,
  }),
  expected_loss_policy: expectedLossPolicySchema,
  workspace_display_setting: dataSchema({
    showQuoteHandoffStatus: z.boolean(),
    highContrast: z.boolean(),
    comfortableDensity: z.boolean(),
    largeNumericDisplay: z.boolean(),
    simpleMode: z.boolean(),
  }),
  market_product_setting: dataSchema({
    productKey: z.string().regex(/^(home|personal|commercial)-[a-z0-9-]+$/),
    active: z.boolean(),
  }),
  market_source_setting: dataSchema({
    name: boundedText,
    enabledHome: z.boolean(),
    enabledPersonal: z.boolean(),
    enabledCommercial: z.boolean(),
  }),
};

export type DemoConfigurationTarget = keyof typeof configurationSchemas;
export type DemoConfigurationTable = Exclude<
  DemoConfigurationTarget,
  "score_model" | "expected_loss_policy"
>;
export function validateConfigurationData(
  target: DemoConfigurationTarget,
  input: unknown,
): Record<string, unknown> {
  const data = configurationSchemas[target].parse(input) as Record<
    string,
    unknown
  >;
  if (target === "score_model") {
    const area = data.productArea;
    assertValidScoreModelBody(
      data.modelJson,
      area === "personal"
        ? PERSONAL_SCORE_FIELDS
        : area === "commercial"
          ? COMMERCIAL_SCORE_VALIDATION_FIELDS
          : ALLOWED_CUSTOMER_SCORE_FIELDS,
    );
    const curve = (
      data.modelJson as {
        rateCurve: {
          pricingBasis?: string;
          maxDiscount?: number;
          maxDiscountBySecurity?: { secured: number; unsecured: number };
        };
      }
    ).rateCurve;
    if (curve.pricingBasis !== "discount_entitlement_v1")
      throw new Error("Demo score models must retain discount-only pricing.");
    if (
      area === "personal" &&
      (!curve.maxDiscountBySecurity ||
        curve.maxDiscount !== curve.maxDiscountBySecurity.secured)
    )
      throw new Error(
        "Personal pricing requires secured and unsecured discount caps.",
      );
  }
  if (target === "expected_loss_policy") {
    const parsed = expectedLossPolicySchema.parse(data);
    assertValidExpectedLossPolicy({
      ...parsed,
      id: null,
      effectiveFrom: new Date(parsed.effectiveFrom),
      effectiveTo: parsed.effectiveTo ? new Date(parsed.effectiveTo) : null,
      pdBands: parsed.pdBands.map((row) => ({ id: null, ...row })),
      lgdBands: parsed.lgdBands.map((row) => ({ id: null, ...row })),
      eadSettings: parsed.eadSettings.map((row) => ({ id: null, ...row })),
    } satisfies ExpectedLossPolicyConfig);
  }
  return data;
}
