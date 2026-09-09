import { z } from "zod";
import { COMMERCIAL_LOAN_LIMITS } from "./config";

const boolish = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const token = value.trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(token)) return true;
  if (["false", "0", "off", "no"].includes(token)) return false;
  return value;
}, z.boolean());

const nullableBoolish = z.preprocess((value) => {
  if (value == null || value === "") return null;
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "yes" ||
    value === "on"
  ) {
    return true;
  }
  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false" ||
    value === "no" ||
    value === "off"
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

const MAX_ANNUAL_AMOUNT = 500_000_000;
const MAX_SECURITY_VALUE = 50_000_000;
const MAX_COST_OF_FUNDS_PERCENT = 25;
const expectedCreditLossOverrideAmount = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? 0
      : value,
  z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
);

const commercialSecurityTypeSchema = z.enum([
  "commercial_property",
  "residential_property",
  "business_assets",
  "cash_deposits",
  "unsecured",
]);

const commercialSecuritySchema = z.object({
  type: commercialSecurityTypeSchema,
  value: nullableNumber(z.coerce.number().min(0).max(MAX_SECURITY_VALUE)),
  description: z.string().trim().max(160).optional().nullable().default(null),
  isPrimary: boolish.default(false),
});

const annualProfitabilityAmount = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? null
      : value,
  z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT).nullable().default(null),
);

// Commercial input validation shared by browser calculations and quote saves.
export const commercialCalcRequestSchema = z
  .object({
    businessName: z.string().trim().max(160).optional().default(""),
    revisedFromQuoteId: nullableNumber(z.coerce.number().int().positive()),
    abn: z.string().trim().max(20).optional().nullable().default(null),
    facilityType: z.enum([
      "term_loan",
      "overdraft",
      "equipment_finance",
      "commercial_property",
    ]),
    loanType: z.enum(["standard", "non_standard"]).default("standard"),
    loanAmount: nullableNumber(z.coerce.number()),
    purchasePrice: nullableNumber(
      z.coerce.number().min(0).max(MAX_SECURITY_VALUE),
    ),
    customerEquityContribution: nullableNumber(
      z.coerce.number().min(0).max(MAX_SECURITY_VALUE),
    ),
    propertyTransactionType: z
      .enum(["purchase", "refinance"])
      .nullable()
      .default(null),
    // Accepted for legacy equipment API/JSON compatibility. Canonical fields
    // above win whenever they carry a value.
    equipmentPurchasePrice: nullableNumber(
      z.coerce.number().min(0).max(MAX_SECURITY_VALUE),
    ),
    equipmentCustomerContribution: nullableNumber(
      z.coerce.number().min(0).max(MAX_SECURITY_VALUE),
    ),
    loanTermYears: nullableNumber(
      z.coerce
        .number()
        .int()
        .min(COMMERCIAL_LOAN_LIMITS.minTermYears)
        .max(COMMERCIAL_LOAN_LIMITS.maxTermYears),
    ),
    repaymentType: z
      .enum(["principal_and_interest", "interest_only", "revolving"])
      .default("principal_and_interest"),
    loanPurposeNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),

    industryCategory: z.enum([
      "agriculture",
      "manufacturing",
      "construction",
      "retail_hospitality",
      "transport_logistics",
      "professional_services",
      "health_education",
      "property_investment",
      "other",
    ]),
    businessRiskGrade: z.enum([
      "grade_1",
      "grade_2",
      "grade_3",
      "grade_4",
      "grade_5",
    ]),
    yearsTrading: nullableNumber(z.coerce.number().int().min(0).max(200)),
    annualRevenue: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    ebitda: nullableNumber(
      z.coerce.number().min(-MAX_ANNUAL_AMOUNT).max(MAX_ANNUAL_AMOUNT),
    ),
    existingAnnualDebtService: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    financialsQuality: z
      .enum([
        "audited",
        "accountant_prepared",
        "management_accounts",
        "estimated",
      ])
      .nullable()
      .default(null),
    financialsAgeMonths: nullableNumber(
      z.coerce.number().int().min(0).max(120),
    ),
    revenueTrend: z
      .enum(["growing", "stable", "declining", "volatile"])
      .nullable()
      .default(null),
    profitTrend: z
      .enum(["improving", "stable_profitable", "breakeven", "loss_making"])
      .nullable()
      .default(null),
    taxStatus: z
      .enum(["clear", "payment_plan", "arrears", "unknown"])
      .nullable()
      .default(null),
    largestCustomerRevenueAboveThreshold: nullableBoolish.default(null),
    // Accepted for legacy API/JSON compatibility only. New forms submit the
    // governed Yes/No concentration fact above.
    customerConcentrationPct: nullableNumber(z.coerce.number().min(0).max(100)),

    securities: z.array(commercialSecuritySchema).min(1).max(10).optional(),
    securityType: commercialSecurityTypeSchema
      .optional()
      .nullable()
      .default(null),
    securityValue: nullableNumber(
      z.coerce.number().min(0).max(MAX_SECURITY_VALUE),
    ),

    existingRelationship: boolish.default(false),
    operatingInRegion: boolish.nullable().default(null),
    vipCustomer: boolish.default(false),
    yearsWithLender: nullableNumber(z.coerce.number().int().min(0).max(100)),
    otherLenderExposure: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),

    marketRateId: z.string().trim().min(1).max(128).nullable().default(null),
    competitorLender: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .default(null),
    competitorRate: nullableNumber(z.coerce.number().min(0).max(30)),
    competitorNotes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .default(null),
    requestedRate: nullableNumber(z.coerce.number().min(0).max(30)),
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
    expectedUtilisationPct: z.coerce.number().min(0).max(100).default(65),
    costOfFunds: nullableNumber(
      z.coerce.number().min(0).max(MAX_COST_OF_FUNDS_PERCENT),
    ),
    commissions: annualProfitabilityAmount,
    otherIncome: annualProfitabilityAmount,
    upfrontFeeOverride: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    monthlyFeeOverride: nullableNumber(
      z.coerce.number().min(0).max(MAX_ANNUAL_AMOUNT),
    ),
    expenses: annualProfitabilityAmount,
    expectedCreditLossOverrideAmount,
    expectedCreditLossOverrideEnabled: boolish.default(false),
    expectedCreditLossOverrideReason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .default(null),
    currentDrawnBalance: nullableNumber(
      z.coerce.number().min(0).max(COMMERCIAL_LOAN_LIMITS.maxLoanAmount),
    ),
    apsExposureClass: z
      .enum([
        "sme_retail",
        "sme_corporate",
        "general_corporate",
        "commercial_property_dependent",
        "specialised_project_finance",
        "specialised_object_or_commodities_finance",
      ])
      .nullable()
      .default(null),
    capitalClassificationConfirmed: boolish.default(false),
    capitalPropertyStandardStatus: z
      .enum(["confirmed_standard", "non_standard", "unconfirmed"])
      .nullable()
      .default(null),
    capitalPropertyCashFlowDependent: boolish.nullable().default(null),
    riskWeightOverridePct: nullableNumber(z.coerce.number().gt(0).max(250)),
    taxRateOverridePct: nullableNumber(z.coerce.number().min(0).max(100)),
    creditConversionFactorOverridePct: nullableNumber(
      z.coerce.number().min(0).max(100),
    ),
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
    const securities =
      value.securities ??
      (value.securityType
        ? [
            {
              type: value.securityType,
              value:
                value.securityType === "unsecured" ? null : value.securityValue,
              description: null,
              isPrimary: true,
            },
          ]
        : []);
    if (securities.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["securities"],
        message: "Select secured or unsecured facility security.",
      });
    }
    if (securities.filter((security) => security.isPrimary).length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["securities"],
        message: "Exactly one security must be marked as primary.",
      });
    }
    const unsecured = securities.filter(
      (security) => security.type === "unsecured",
    );
    if (
      unsecured.length > 0 &&
      (securities.length !== 1 || unsecured[0]?.value != null)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["securities"],
        message: "Unsecured must be the only security and cannot have a value.",
      });
    }

    const propertyTransactionType =
      value.facilityType === "commercial_property"
        ? (value.propertyTransactionType ??
          (value.purchasePrice != null ? "purchase" : "refinance"))
        : null;
    const isPurchase =
      value.facilityType === "equipment_finance" ||
      (value.facilityType === "commercial_property" &&
        propertyTransactionType === "purchase");
    const purchasePrice = isPurchase
      ? (value.purchasePrice ??
        (value.facilityType === "equipment_finance"
          ? (value.equipmentPurchasePrice ?? value.loanAmount)
          : null))
      : null;
    const customerEquityContribution = isPurchase
      ? (value.customerEquityContribution ??
        (value.facilityType === "equipment_finance"
          ? value.equipmentCustomerContribution
          : null) ??
        0)
      : null;
    const derivedLoanAmount = isPurchase
      ? purchasePrice == null
        ? null
        : purchasePrice - customerEquityContribution!
      : value.loanAmount;

    if (isPurchase && purchasePrice == null) {
      ctx.addIssue({
        code: "custom",
        path: ["purchasePrice"],
        message: "Enter the purchase price.",
      });
    }
    if (
      isPurchase &&
      purchasePrice != null &&
      customerEquityContribution! > purchasePrice
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["customerEquityContribution"],
        message:
          "Customer Equity Contribution cannot exceed the purchase price.",
      });
    }
    if (
      derivedLoanAmount == null ||
      derivedLoanAmount < COMMERCIAL_LOAN_LIMITS.minLoanAmount ||
      derivedLoanAmount > COMMERCIAL_LOAN_LIMITS.maxLoanAmount
    ) {
      ctx.addIssue({
        code: "custom",
        path: [isPurchase ? "customerEquityContribution" : "loanAmount"],
        message: `Amount financed must be between $${COMMERCIAL_LOAN_LIMITS.minLoanAmount.toLocaleString("en-AU")} and $${COMMERCIAL_LOAN_LIMITS.maxLoanAmount.toLocaleString("en-AU")}.`,
      });
    }
    if (
      value.facilityType === "overdraft" &&
      value.currentDrawnBalance != null &&
      derivedLoanAmount != null &&
      value.currentDrawnBalance > derivedLoanAmount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["currentDrawnBalance"],
        message: "Current drawn balance cannot exceed the committed limit.",
      });
    }
    if (
      (value.riskWeightOverridePct != null ||
        value.taxRateOverridePct != null ||
        value.creditConversionFactorOverridePct != null) &&
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
  })
  .transform((d) => {
    const securities = d.securities ?? [
      {
        type: d.securityType!,
        value: d.securityType === "unsecured" ? null : d.securityValue,
        description: null,
        isPrimary: true,
      },
    ];
    const primary =
      securities.find((security) => security.isPrimary) ?? securities[0];
    const secured = securities.filter(
      (security) => security.type !== "unsecured",
    );
    const securityValue =
      primary.type === "unsecured"
        ? 0
        : secured.some((security) => security.value == null)
          ? null
          : secured.reduce(
              (total, security) => total + (security.value ?? 0),
              0,
            );
    const propertyTransactionType =
      d.facilityType === "commercial_property"
        ? (d.propertyTransactionType ??
          (d.purchasePrice != null ? "purchase" : "refinance"))
        : null;
    const isPurchase =
      d.facilityType === "equipment_finance" ||
      (d.facilityType === "commercial_property" &&
        propertyTransactionType === "purchase");
    const purchasePrice = isPurchase
      ? (d.purchasePrice ??
        (d.facilityType === "equipment_finance"
          ? (d.equipmentPurchasePrice ?? d.loanAmount!)
          : null))
      : null;
    const customerEquityContribution = isPurchase
      ? (d.customerEquityContribution ??
        (d.facilityType === "equipment_finance"
          ? d.equipmentCustomerContribution
          : null) ??
        0)
      : null;
    const loanAmount = isPurchase
      ? purchasePrice! - customerEquityContribution!
      : d.loanAmount!;

    return {
      ...d,
      securities,
      securityType: primary.type,
      securityValue,
      purchasePrice,
      customerEquityContribution,
      propertyTransactionType,
      // Dual-write legacy equipment fields during the compatibility window.
      equipmentPurchasePrice:
        d.facilityType === "equipment_finance" ? purchasePrice : null,
      equipmentCustomerContribution:
        d.facilityType === "equipment_finance"
          ? customerEquityContribution
          : null,
      loanAmount,
      // Overdrafts are always revolving with no amortising term; every other
      // facility amortises (or is interest-only) over a term.
      loanTermYears:
        d.facilityType === "overdraft" ? null : (d.loanTermYears ?? 5),
      repaymentType:
        d.facilityType === "overdraft"
          ? ("revolving" as const)
          : d.repaymentType === "revolving"
            ? ("principal_and_interest" as const)
            : d.repaymentType,
      expectedUtilisationPct:
        d.facilityType === "overdraft" ? d.expectedUtilisationPct : 100,
      brokerName: d.channel === "broker" ? d.brokerName : null,
      brokerCompany: d.channel === "broker" ? d.brokerCompany : null,
      commissions: d.channel === "online" ? 0 : d.commissions,
      currentDrawnBalance:
        d.facilityType === "overdraft" ? d.currentDrawnBalance : null,
      apsExposureClass:
        d.apsExposureClass ??
        (d.facilityType === "commercial_property"
          ? ("commercial_property_dependent" as const)
          : d.annualRevenue != null &&
              d.annualRevenue < 75_000_000 &&
              loanAmount + (d.otherLenderExposure ?? 0) < 1_500_000
            ? ("sme_retail" as const)
            : d.annualRevenue != null && d.annualRevenue < 75_000_000
              ? ("sme_corporate" as const)
              : ("general_corporate" as const)),
      capitalPropertyStandardStatus:
        d.facilityType === "commercial_property"
          ? (d.capitalPropertyStandardStatus ?? ("unconfirmed" as const))
          : null,
    };
  });

export type CommercialCalcRequestInput = z.infer<
  typeof commercialCalcRequestSchema
>;
