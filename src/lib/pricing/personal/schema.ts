import { z } from "zod";
import { PERSONAL_LOAN_LIMITS } from "./config";
import {
  averageCreditScores,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
  MAX_CREDIT_SCORES,
} from "@/lib/pricing/credit-scores";

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

const MAX_MONTHLY_AMOUNT = 500_000;
const MAX_ANNUAL_AMOUNT = 10_000_000;
const MAX_COST_OF_FUNDS_PERCENT = 25;
const expectedCreditLossOverrideAmount = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? 0
      : value,
  z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
);
const individualCreditScore = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.coerce.number().int().min(CREDIT_SCORE_MIN).max(CREDIT_SCORE_MAX),
);

// Personal input validation shared by browser calculations and quote saves.
export const personalCalcRequestSchema = z
  .object({
    customerReference: z.string().trim().max(120).optional().default(""),
    revisedFromQuoteId: nullableNumber(z.coerce.number().int().positive()),
    productId: nullableNumber(z.coerce.number().int().positive()),
    loanPurpose: z.enum([
      "car_purchase",
      "debt_consolidation",
      "home_improvement",
      "travel_lifestyle",
      "medical",
      "other",
    ]),
    securityType: z.enum(["secured_vehicle", "secured_savings", "unsecured"]),
    loanAmount: z.coerce
      .number()
      .min(PERSONAL_LOAN_LIMITS.minLoanAmount)
      .max(PERSONAL_LOAN_LIMITS.maxLoanAmount),
    loanTermMonths: z.coerce
      .number()
      .int()
      .min(PERSONAL_LOAN_LIMITS.minTermMonths)
      .max(PERSONAL_LOAN_LIMITS.maxTermMonths),

    // creditScore remains accepted for legacy clients. New flows submit the
    // individual scores and the transform derives the authoritative mean.
    creditScore: nullableNumber(
      z.coerce.number().min(CREDIT_SCORE_MIN).max(CREDIT_SCORE_MAX),
    ),
    creditScores: z
      .array(individualCreditScore)
      .max(MAX_CREDIT_SCORES)
      .default([]),
    employmentIncomeStability: z
      .enum([
        "not_assessed",
        "stable_payg",
        "self_employed",
        "contractor_casual",
        "government_benefits",
        "review_required",
      ])
      .default("not_assessed"),
    existingMember: boolish.default(false),
    customerStream: z
      .enum(["new_to_bank", "existing_member", "retention"])
      .optional(),
    yearsAsMember: nullableNumber(z.coerce.number().int().min(0).max(100)),
    currentCustomerRate: nullableNumber(
      z.coerce.number().min(0).max(MAX_COST_OF_FUNDS_PERCENT),
    ),
    retentionArrearsHardship18Months: nullableBoolish.default(null),
    retentionArrearsPast12Months: nullableBoolish.default(null),
    riskNotes: z.string().trim().max(2000).optional().nullable().default(null),

    netMonthlyIncome: nullableNumber(
      z.coerce.number().min(0).max(MAX_MONTHLY_AMOUNT),
    ),
    monthlyLivingExpenses: nullableNumber(
      z.coerce.number().min(0).max(MAX_MONTHLY_AMOUNT),
    ),
    existingMonthlyDebtRepayments: nullableNumber(
      z.coerce.number().min(0).max(MAX_MONTHLY_AMOUNT),
    ),

    marketRateId: z.string().trim().min(1).max(128).nullable().default(null),
    competitorLender: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .default(null),
    competitorRate: nullableNumber(z.coerce.number().min(0).max(48)),
    competitorNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),
    requestedRate: nullableNumber(z.coerce.number().min(0).max(48)),
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
    const customerStream =
      value.customerStream ??
      (value.existingMember ? "existing_member" : "new_to_bank");
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
    if (customerStream === "retention") {
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
    const customerStream =
      value.customerStream ??
      (value.existingMember ? "existing_member" : "new_to_bank");
    const retention = customerStream === "retention";
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
      customerStream,
      existingMember: customerStream !== "new_to_bank",
      yearsAsMember:
        customerStream === "new_to_bank" ? null : value.yearsAsMember,
      creditScores,
      creditScore: averageCreditScores(creditScores),
      employmentIncomeStability: retention
        ? ("not_assessed" as const)
        : value.employmentIncomeStability,
      currentCustomerRate: retention ? value.currentCustomerRate : null,
      retentionArrearsHardship18Months: retention
        ? value.retentionArrearsHardship18Months
        : null,
      retentionArrearsPast12Months:
        retention && value.retentionArrearsHardship18Months
          ? value.retentionArrearsPast12Months
          : null,
      riskNotes: retention ? value.riskNotes : null,
      brokerName: broker ? value.brokerName : null,
      brokerCompany: broker ? value.brokerCompany : null,
      brokerInRegion: broker ? value.brokerInRegion : null,
      brokerVolumeBand: broker ? value.brokerVolumeBand : null,
      brokerDiscretionPct: broker ? value.brokerDiscretionPct : null,
      commissions: value.channel === "online" ? 0 : value.commissions,
    };
  });

export type PersonalCalcRequestInput = z.infer<
  typeof personalCalcRequestSchema
>;
