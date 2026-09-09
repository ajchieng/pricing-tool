import { z } from "zod";
import { lenderProductsSchema } from "./lender-products-schema";
import {
  averageCreditScores,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MAX_CREDIT_SCORES,
} from "./credit-scores";

const boolish = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const token = value.trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(token)) return true;
  if (["false", "0", "off", "no"].includes(token)) return false;
  return value;
}, z.boolean());

const nullableBoolish = z.preprocess((value) => {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === "on" ||
    value === "yes"
  ) {
    return true;
  }
  if (
    value === false ||
    value === "false" ||
    value === "0" ||
    value === "off" ||
    value === "no"
  ) {
    return false;
  }
  return value;
}, z.boolean().nullable());

const nullableNumber = (schema: z.ZodType<number, unknown>) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    schema.nullable().default(null),
  );

const MAX_COST_OF_FUNDS_PERCENT = 25;
const MAX_HOME_RATE_PERCENT = 25;
const MAX_LOAN_AMOUNT = 20_000_000;
const MAX_PROPERTY_VALUE = 50_000_000;
const MAX_ANNUAL_AMOUNT = 10_000_000;
const expectedCreditLossOverrideAmount = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? 0
      : value,
  z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
);

// Home input validation shared by browser calculations and immutable quote saves.

export const calcRequestSchema = z
  .object({
    customerReference: z.string().trim().max(120).optional().default(""),
    revisedFromQuoteId: nullableNumber(z.coerce.number().int().positive()),
    productId: nullableNumber(z.coerce.number().int().positive()),
    loanPurpose: z.enum(["owner_occupied", "investment"]),
    rateType: z.enum(["variable", "fixed"]),
    fixedPeriodMonths: nullableNumber(z.coerce.number().int().positive()),
    repaymentType: z
      .literal("principal_and_interest")
      .default("principal_and_interest"),
    loanAmount: z.coerce.number().positive().max(MAX_LOAN_AMOUNT),
    propertyValue: z.coerce.number().positive().max(MAX_PROPERTY_VALUE),
    loanTermYears: z.coerce.number().int().min(1).max(40).default(30),
    existingMember: boolish.default(false),
    retentionScenario: boolish.default(false),
    customerStream: z
      .enum(["new_to_bank", "existing_member", "retention"])
      .default("new_to_bank"),
    currentCustomerRate: nullableNumber(
      z.coerce.number().min(0).max(MAX_COST_OF_FUNDS_PERCENT),
    ),
    retentionArrearsHardship18Months: nullableBoolish.default(null),
    retentionArrearsPast12Months: nullableBoolish.default(null),
    vipCustomer: boolish.default(false),
    marketRateId: z.string().trim().min(1).max(128).nullable().default(null),
    competitorLender: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .default(null),
    competitorRate: nullableNumber(
      z.coerce.number().min(0).max(MAX_HOME_RATE_PERCENT),
    ),
    competitorNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),
    requestedRate: nullableNumber(
      z.coerce.number().min(0).max(MAX_HOME_RATE_PERCENT),
    ),
    requestedReason: z
      .string()
      .trim()
      .max(60)
      .optional()
      .nullable()
      .default(null),
    requestedReasonNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),

    // Customer risk context — granular figures
    // creditScore remains accepted for legacy imports and API clients. New home
    // quote flows send creditScores; the transform below derives the mean.
    creditScore: nullableNumber(
      z.coerce.number().min(CREDIT_SCORE_MIN).max(CREDIT_SCORE_MAX),
    ),
    creditScores: z
      .array(
        z.coerce.number().int().min(CREDIT_SCORE_MIN).max(CREDIT_SCORE_MAX),
      )
      .max(MAX_CREDIT_SCORES)
      .default([]),
    dtiRatio: nullableNumber(z.coerce.number().min(0).max(50)),
    grossAnnualIncome: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    serviceabilityIncomeMeasure: z
      .enum(["gross_annual_income", "serviceability_nsi"])
      .default("gross_annual_income"),
    serviceabilityNsi: nullableNumber(
      z.coerce.number().min(-MAX_ANNUAL_AMOUNT).max(MAX_ANNUAL_AMOUNT),
    ),
    // Categorical manual flags
    employmentIncomeStability: z
      .enum([
        "not_assessed",
        "stable_payg",
        "self_employed",
        "contractor_casual",
        "review_required",
      ])
      .default("not_assessed"),
    serviceabilityStatus: z
      .enum([
        "not_assessed",
        "appears_acceptable",
        "borderline",
        "review_required",
      ])
      .default("not_assessed"),
    riskNotes: z.string().trim().max(2000).optional().nullable().default(null),

    // Strategic and relationship context
    yearsAsMember: nullableNumber(z.coerce.number().int().min(0).max(100)),
    livesInServiceRegion: z.enum(["yes", "no", "unknown"]).default("unknown"),
    existingLenderLoan: z.enum(["yes", "no", "unknown"]).default("unknown"),
    lenderProducts: lenderProductsSchema.default([]),
    newToBankGrowthOpportunity: boolish.default(false),
    relationshipNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),

    // Profitability inputs feeding the P&L waterfall.
    // Cost of funds is a percentage rate; the remaining line items are $ amounts.
    // averageAssets is retained for old imports but the calculator uses loanAmount.
    // Tax is derived from PBT using the governed rate or an authorised override.
    channel: z.enum(["broker", "online", "direct"]).default("direct"),
    brokerName: z.string().trim().max(120).optional().nullable().default(null),
    brokerCompany: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .default(null),
    brokerInRegion: z.enum(["yes", "no"]).nullable().default(null),
    brokerVolumeBand: z
      .enum(["1_3", "4_6", "7_9", "10_plus"])
      .nullable()
      .default(null),
    brokerDiscretionPct: nullableNumber(z.coerce.number().min(0).max(100)),
    costOfFunds: nullableNumber(
      z.coerce.number().min(0).max(MAX_COST_OF_FUNDS_PERCENT),
    ),
    commissions: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    otherIncome: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    upfrontFeeOverride: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    monthlyFeeOverride: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    expenses: nullableNumber(z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT)),
    expectedCreditLossOverrideAmount,
    expectedCreditLossOverrideEnabled: boolish.default(false),
    expectedCreditLossOverrideReason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .default(null),
    averageAssets: nullableNumber(
      z.coerce.number().min(0).max(MAX_PROPERTY_VALUE),
    ),

    capitalStandardStatus: z
      .enum(["confirmed_standard", "non_standard", "unconfirmed"])
      .default("unconfirmed"),
    eligibleLmi: boolish.default(false),
    homeGuaranteeSchemeEligible: boolish.default(false),
    riskWeightOverridePct: nullableNumber(z.coerce.number().gt(0).max(250)),
    taxRateOverridePct: nullableNumber(z.coerce.number().min(0).max(100)),
    capitalOverrideReason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .default(null),

    notes: z.string().trim().max(2000).optional().nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (
      value.creditScores.length === 0 &&
      value.creditScore != null &&
      !Number.isInteger(value.creditScore)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["creditScore"],
        message: "An individual credit score must be a whole number.",
      });
    }
    if (
      value.customerStream !== "retention" &&
      value.serviceabilityIncomeMeasure === "gross_annual_income" &&
      value.serviceabilityNsi != null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceabilityNsi"],
        message: "Choose Serviceability NSI before entering monthly NSI.",
      });
    }
    if (
      value.customerStream !== "retention" &&
      value.serviceabilityIncomeMeasure === "serviceability_nsi" &&
      value.grossAnnualIncome != null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["grossAnnualIncome"],
        message: "Choose Gross annual income before entering annual income.",
      });
    }
    if (
      (value.riskWeightOverridePct != null ||
        value.taxRateOverridePct != null) &&
      !value.capitalOverrideReason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["capitalOverrideReason"],
        message: "An override reason is required.",
      });
    }
    if (
      value.expectedCreditLossOverrideEnabled &&
      !value.expectedCreditLossOverrideReason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedCreditLossOverrideReason"],
        message: "An expected-loss override reason is required.",
      });
    }
    if (value.customerStream === "retention") {
      if (value.currentCustomerRate == null) {
        ctx.addIssue({
          code: "custom",
          path: ["currentCustomerRate"],
          message: "Current customer rate is required for Retention.",
        });
      }
      if (value.retentionArrearsHardship18Months == null) {
        ctx.addIssue({
          code: "custom",
          path: ["retentionArrearsHardship18Months"],
          message:
            "The 18-month arrears or hardship answer is required for Retention.",
        });
      }
      if (
        value.retentionArrearsHardship18Months === true &&
        value.retentionArrearsPast12Months == null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["retentionArrearsPast12Months"],
          message:
            "The 12-month arrears answer is required when the 18-month answer is Yes.",
        });
      }
    }
  })
  .transform((value) => {
    const retention = value.customerStream === "retention";
    const existingMember = value.customerStream !== "new_to_bank";
    const newToBank = value.customerStream === "new_to_bank";
    const broker = value.channel === "broker";
    const creditScores = retention
      ? []
      : value.creditScores.length > 0
        ? value.creditScores
        : value.creditScore == null
          ? []
          : [value.creditScore];

    return {
      ...value,
      existingMember,
      retentionScenario: retention,
      newToBankGrowthOpportunity: newToBank,
      currentCustomerRate: retention ? value.currentCustomerRate : null,
      retentionArrearsHardship18Months: retention
        ? value.retentionArrearsHardship18Months
        : null,
      retentionArrearsPast12Months:
        retention && value.retentionArrearsHardship18Months
          ? value.retentionArrearsPast12Months
          : null,
      creditScores,
      creditScore: averageCreditScores(creditScores),
      dtiRatio: retention ? null : value.dtiRatio,
      serviceabilityIncomeMeasure: retention
        ? ("gross_annual_income" as const)
        : value.serviceabilityIncomeMeasure,
      grossAnnualIncome:
        retention || value.serviceabilityIncomeMeasure !== "gross_annual_income"
          ? null
          : value.grossAnnualIncome,
      serviceabilityNsi:
        retention || value.serviceabilityIncomeMeasure !== "serviceability_nsi"
          ? null
          : value.serviceabilityNsi,
      employmentIncomeStability: "not_assessed" as const,
      serviceabilityStatus: "not_assessed" as const,
      yearsAsMember: newToBank ? null : value.yearsAsMember,
      existingLenderLoan: newToBank
        ? ("unknown" as const)
        : value.existingLenderLoan,
      lenderProducts: newToBank ? [] : value.lenderProducts,
      relationshipNotes: newToBank ? null : value.relationshipNotes,
      brokerName: broker ? value.brokerName : null,
      brokerCompany: broker ? value.brokerCompany : null,
      brokerInRegion: broker ? value.brokerInRegion : null,
      brokerVolumeBand: broker ? value.brokerVolumeBand : null,
      brokerDiscretionPct: broker ? value.brokerDiscretionPct : null,
      commissions: value.channel === "online" ? 0 : value.commissions,
    };
  });

export type CalcRequestInput = z.infer<typeof calcRequestSchema>;
