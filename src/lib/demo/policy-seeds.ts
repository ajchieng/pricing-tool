/** Independently authored, fictional policy for the browser demonstration. */
import type {
  CustomerScoreModelConfig,
  PricingConfig,
  PolicyComponentFallbacks,
  ProductConfig,
  ProductRateConfig,
  MarginSettingConfig,
  ProfitabilityChannel,
  ApprovalRuleConfig,
} from "@/lib/pricing/types";
import { DEFAULT_CUSTOMER_SCORE_MODEL } from "@/lib/pricing/customer-score";
import { DEFAULT_PERSONAL_SCORE_MODEL } from "@/lib/pricing/personal/score-model";
import { DEFAULT_COMMERCIAL_SCORE_MODEL } from "@/lib/pricing/commercial/score-model";
import type {
  PersonalProductConfig,
  PersonalPricingInput,
  PersonalMarginSettingConfig,
  PersonalProfitabilityDefaultConfig,
} from "@/lib/pricing/personal/types";
import type {
  CommercialPricingInput,
  CommercialProfitabilityDefaultConfig,
  CommercialFacilityType,
} from "@/lib/pricing/commercial/types";
import type { CommercialPricingConfig } from "@/lib/pricing/commercial/calculate";
import {
  COMMERCIAL_BASE_RATES,
  COMMERCIAL_FEES,
  COMMERCIAL_APPROVAL,
  DSCR_BANDS,
  COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
} from "@/lib/pricing/commercial/config";
import { fallbackPersonalApprovalRules } from "@/lib/pricing/personal/approval-policy";
import {
  PERSONAL_AFFORDABILITY,
  personalProductSecurityType,
} from "@/lib/pricing/personal/config";
import type { ExpectedLossPolicyConfig } from "@/lib/pricing/credit-risk/policy-validation";
import { riskDefinitionHash } from "@/lib/pricing/credit-risk/risk-definition-hash";
import { homeRiskContract } from "@/lib/pricing/credit-risk/home";
import {
  PERSONAL_CREDIT_RISK_FIELDS,
  PERSONAL_RISK_FACT_DERIVATION_CONFIG,
  PERSONAL_RISK_FACT_DERIVATION_VERSION,
} from "@/lib/pricing/credit-risk/personal";
import {
  COMMERCIAL_CREDIT_RISK_FIELDS,
  COMMERCIAL_RISK_FACT_DERIVATION_VERSION,
} from "@/lib/pricing/credit-risk/commercial";
import {
  rowsToDefaultsByChannel,
  rowsToPersonalDefaultsByChannelAndSecurity,
  rowsToCommercialDefaultsByChannelAndFacility,
} from "@/lib/quotes/profitability-defaults";
import { PROFITABILITY_TAX_RATE_PCT } from "@/lib/pricing/profitability-policy";
import type { CalcRequestInput } from "@/lib/pricing/schema";
import { calcRequestSchema } from "@/lib/pricing/schema";
import { personalCalcRequestSchema } from "@/lib/pricing/personal/schema";
import { commercialCalcRequestSchema } from "@/lib/pricing/commercial/schema";

export type DemoArea = "home" | "personal" | "commercial";
export const DEMO_POLICY_VERSION = "illustrative-policy-1001";
export const DEMO_POLICY_NOTICE =
  "Fictional demonstration assumptions. Indicative examples only; not an offer or credit decision.";
export const DEMO_CAPITAL_RATIO_PCT = 11.5;
const allConfigured: PolicyComponentFallbacks = {
  product: false,
  scoreModel: false,
  scoreModelGovernance: false,
  margin: false,
  approval: false,
  profitability: false,
  fees: false,
  capital: false,
  expectedLoss: false,
};
const channels: ProfitabilityChannel[] = ["direct", "broker", "online"];
const facilities: CommercialFacilityType[] = [
  "term_loan",
  "overdraft",
  "equipment_finance",
  "commercial_property",
];
export const demoQuoteFees = {
  home: { standardUpfrontFee: 280, monthlyFee: 4, configured: true },
  personal: { standardUpfrontFee: 120, monthlyFee: 2, configured: true },
  commercial: { standardUpfrontFee: 650, monthlyFee: 8, configured: true },
};
export const homeProducts: ProductConfig[] = (
  ["owner_occupied", "investment"] as const
).flatMap((loanPurpose, index) =>
  (["variable", "fixed"] as const).map((rateType, j) => ({
    id: 101 + index * 2 + j,
    name: `${loanPurpose === "owner_occupied" ? "Everyday Home" : "Investor Home"} ${rateType === "fixed" ? "Fixed" : "Variable"}`,
    loanPurpose,
    rateType,
    fixedPeriodMonths: rateType === "fixed" ? 24 : null,
    repaymentType: "principal_and_interest" as const,
    minLoanAmount: 30000,
    maxLoanAmount: 2500000,
    maxLvr: 92,
    active: true,
    notes: DEMO_POLICY_NOTICE,
  })),
);
export const homeRates: ProductRateConfig[] = homeProducts.flatMap(
  (product, index) => [
    {
      id: 1101 + index * 3,
      productId: product.id,
      lvrMin: 0,
      lvrMax: 70,
      cardedRate: Number((6.15 + index * 0.2).toFixed(6)),
      active: true,
      pricingRole: "carded_pricing_anchor" as const,
      comparisonRate: 6.38 + index * 0.2,
    },
    {
      id: 1102 + index * 3,
      productId: product.id,
      lvrMin: 70,
      lvrMax: 85,
      cardedRate: Number((6.4 + index * 0.2).toFixed(6)),
      active: true,
      pricingRole: "carded_pricing_anchor" as const,
      comparisonRate: 6.63 + index * 0.2,
    },
    {
      id: 1103 + index * 3,
      productId: product.id,
      lvrMin: 85,
      lvrMax: 92,
      cardedRate: Number((6.75 + index * 0.2).toFixed(6)),
      active: true,
      pricingRole: "carded_pricing_anchor" as const,
      comparisonRate: 6.98 + index * 0.2,
    },
  ],
);
export const homeMargins: MarginSettingConfig[] = [
  {
    id: 1201,
    productId: null,
    loanPurpose: null,
    rateType: null,
    estimatedCostOfFunds: 3.65,
    targetMargin: 1.65,
    hardMinimumMargin: 0.95,
    active: true,
  },
];
export const homeProfitabilityDefaults = channels.map((channel, index) => ({
  id: 1301 + index,
  channel,
  active: true,
  commissionsPct: channel === "broker" ? 0.65 : 0,
  otherIncomePct: 0.07,
  expensesPct: 0.36,
}));
const homeApprovalRules: ApprovalRuleConfig[] = [
  {
    id: 1401,
    name: "Illustrative larger-exposure review",
    approvalLevel: "manager",
    conditionType: "loan_amount",
    conditionOperator: "gt",
    conditionValue: "1100000",
    reasonText: "Fictional demo exposure threshold exceeded.",
    active: true,
    priority: 10,
  },
  {
    id: 1402,
    name: "Illustrative high-LVR review",
    approvalLevel: "manager",
    conditionType: "lvr",
    conditionOperator: "gt",
    conditionValue: "87",
    reasonText: "Fictional demo loan-to-value threshold exceeded.",
    active: true,
    priority: 20,
  },
];
export const personalProducts: PersonalProductConfig[] = (
  ["secured", "unsecured"] as const
).map((securityType, index) => ({
  id: 201 + index,
  name:
    securityType === "secured"
      ? "Everyday Secured Personal"
      : "Everyday Personal Flex",
  productCategory:
    securityType === "secured" ? "Secured personal" : "Unsecured personal",
  securityType,
  rateType: "fixed",
  minLoanAmount: 3000,
  maxLoanAmount: securityType === "secured" ? 120000 : 60000,
  minTermMonths: 12,
  maxTermMonths: 96,
  cardedRate: securityType === "secured" ? 8.35 : 12.65,
  selectedRateId: 2101 + index,
  pricingRole: "carded_pricing_anchor",
  comparisonRate: securityType === "secured" ? 8.7 : 13.05,
  active: true,
  notes: DEMO_POLICY_NOTICE,
  sourceUrl: null,
  fees: {
    establishmentFee: 120,
    monthlyServiceFee: 2,
    onlineRedrawFee: 0,
    branchRedrawFee: 12,
    defaultFee: 18,
  },
  redrawAvailable: true,
}));
export const personalMargins: PersonalMarginSettingConfig[] =
  personalProducts.map((product, index) => ({
    id: 2201 + index,
    securityType: product.securityType,
    personalProductId: product.id,
    estimatedCostOfFunds: index === 0 ? 4.1 : 4.8,
    targetMargin: index === 0 ? 2.4 : 4.2,
    hardMinimumMargin: index === 0 ? 1.2 : 2.8,
    active: true,
  }));
export const personalDefaults: PersonalProfitabilityDefaultConfig[] =
  channels.flatMap((channel, index) =>
    (["secured", "unsecured"] as const).map((securityType, j) => ({
      id: 2301 + index * 2 + j,
      channel,
      securityType,
      active: true,
      commissionsPct: channel === "broker" ? 0.8 : 0,
      otherIncomePct: 0.08,
      expensesPct: securityType === "secured" ? 0.7 : 1.25,
    })),
  );
export const commercialDefaults: CommercialProfitabilityDefaultConfig[] =
  channels.flatMap((channel, index) =>
    facilities.map((facilityType, j) => ({
      id: 3301 + index * 4 + j,
      channel,
      facilityType,
      active: true,
      commissionsPct: channel === "broker" ? 0.7 : 0,
      otherIncomePct: 0.11,
      expensesPct: 0.48 + j * 0.04,
    })),
  );

function expectedLossPolicy(
  area: DemoArea,
  model: CustomerScoreModelConfig,
): ExpectedLossPolicyConfig {
  const contract =
    area === "home"
      ? homeRiskContract(model)
      : area === "personal"
        ? {
            eligibleFields: PERSONAL_CREDIT_RISK_FIELDS,
            factDerivationVersion: PERSONAL_RISK_FACT_DERIVATION_VERSION,
            factDerivationConfig: PERSONAL_RISK_FACT_DERIVATION_CONFIG,
          }
        : {
            eligibleFields: COMMERCIAL_CREDIT_RISK_FIELDS,
            factDerivationVersion: COMMERCIAL_RISK_FACT_DERIVATION_VERSION,
            factDerivationConfig: {},
          };
  const scopes =
    area === "home"
      ? ["owner_occupied", "investment"].flatMap((p) =>
          ["lvr_le_60", "lvr_le_80", "lvr_le_90", "lvr_over_90"].flatMap((b) =>
            ["standard", "lmi"].map((m) => `${p}_${b}_${m}`),
          ),
        )
      : area === "personal"
        ? ["secured", "unsecured"]
        : [
            "cash_secured",
            "coverage_ge_1_5",
            "coverage_ge_1",
            "coverage_ge_0_5",
            "coverage_lt_0_5",
            "unsecured",
          ];
  return {
    id: area === "home" ? 1501 : area === "personal" ? 2501 : 3501,
    vertical: area,
    version: 1001,
    name: `Illustrative ${area} expected loss`,
    description: DEMO_POLICY_NOTICE,
    compatibleRiskDefinitionHash: riskDefinitionHash({
      model,
      productArea: area,
      ...contract,
    }),
    sourceScoreModelArea: area,
    sourceScoreModelVersion: model.version,
    effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    effectiveTo: null,
    active: true,
    pdBands: [
      {
        id: 1,
        riskGrade: "A",
        minRiskScore: 84,
        annualPdPct: 0.18,
        active: true,
      },
      {
        id: 2,
        riskGrade: "B",
        minRiskScore: 65,
        annualPdPct: 0.72,
        active: true,
      },
      {
        id: 3,
        riskGrade: "C",
        minRiskScore: 40,
        annualPdPct: 2.2,
        active: true,
      },
      {
        id: 4,
        riskGrade: "D",
        minRiskScore: 0,
        annualPdPct: 5.1,
        active: true,
      },
    ],
    lgdBands: scopes.map((lossScope, index) => ({
      id: index + 1,
      lossScope,
      lgdPct:
        area === "home"
          ? 12 + Math.floor(index / 2) * 3
          : area === "personal"
            ? index === 0
              ? 24
              : 58
            : 8 + index * 10,
      active: true,
    })),
    eadSettings: [
      {
        id: 1,
        exposureScope: "amortising",
        method: "one_year_scheduled_balance",
        undrawnCcfPct: null,
        active: true,
      },
      ...(area === "commercial"
        ? [
            {
              id: 2,
              exposureScope: "interest_only",
              method: "expected_principal" as const,
              undrawnCcfPct: null,
              active: true,
            },
            {
              id: 3,
              exposureScope: "overdraft",
              method: "drawn_plus_ccf_undrawn" as const,
              undrawnCcfPct: 55,
              active: true,
            },
          ]
        : []),
    ],
  };
}
export const demoExpectedLossPolicies = {
  home: expectedLossPolicy("home", DEFAULT_CUSTOMER_SCORE_MODEL),
  personal: expectedLossPolicy("personal", DEFAULT_PERSONAL_SCORE_MODEL),
  commercial: expectedLossPolicy("commercial", DEFAULT_COMMERCIAL_SCORE_MODEL),
};
export function homeConfigFor(input: CalcRequestInput): PricingConfig {
  const product =
    homeProducts.find((p) => p.id === input.productId) ??
    homeProducts.find(
      (p) =>
        p.loanPurpose === input.loanPurpose && p.rateType === input.rateType,
    ) ??
    null;
  return {
    product,
    productRates: homeRates.filter((r) => r.productId === product?.id),
    adjustmentRules: [],
    marginSettings: homeMargins,
    approvalRules: homeApprovalRules,
    customerScoreModel: DEFAULT_CUSTOMER_SCORE_MODEL,
    customerScoreModelFallback: false,
    componentFallbacks: { ...allConfigured },
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees.home,
    profitabilityDefaultIds: homeProfitabilityDefaults.map((row) => row.id),
    profitabilityDefaultsSnapshot: homeProfitabilityDefaults,
  };
}
export function personalConfigFor(input: PersonalPricingInput) {
  const security = personalProductSecurityType(input.securityType);
  return {
    product:
      personalProducts.find(
        (p) => p.id === input.productId && p.securityType === security,
      ) ?? personalProducts.find((p) => p.securityType === security)!,
    scoreModel: DEFAULT_PERSONAL_SCORE_MODEL,
    marginSettings: personalMargins,
    approvalRules: fallbackPersonalApprovalRules().map((r, index) => ({
      ...r,
      id: 2401 + index,
    })),
    profitabilityDefaults: personalDefaults,
    componentFallbacks: { ...allConfigured },
    quoteFeeSetting: demoQuoteFees.personal,
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    expectedLossPolicy: demoExpectedLossPolicies.personal,
  };
}
export function commercialConfigFor(
  input: Pick<CommercialPricingInput, "facilityType">,
): CommercialPricingConfig {
  const index = facilities.indexOf(input.facilityType);
  const baseRates = Object.fromEntries(
    facilities.map((facility, j) => [
      facility,
      Object.fromEntries(
        (["standard", "non_standard"] as const).map((loanType, k) => [
          loanType,
          {
            ...COMMERCIAL_BASE_RATES[facility][loanType],
            rate: COMMERCIAL_BASE_RATES[facility][loanType].rate + j * 0.15,
            selectedRateId: 3101 + j * 2 + k,
            pricingRole: "carded_pricing_anchor",
          },
        ]),
      ),
    ]),
  ) as CommercialPricingConfig["baseRates"];
  return {
    scoreModel: DEFAULT_COMMERCIAL_SCORE_MODEL,
    productId: 301 + index,
    marginSettingIds: [3201 + index],
    approvalSettingIds: [3401],
    baseRates,
    marginFloor: 0.9,
    marginPolicy: {
      estimatedCostOfFunds: 4.3 + index * 0.1,
      targetMargin: 2.2,
      scoreMarginFloorPct: 0.9,
      hardMinimumNetInterestMarginPct: 1.15,
      hardMinimumMargin: 1.15,
    },
    productLimits: {
      minLoanAmount: 40000,
      maxLoanAmount: 6000000,
      minTermYears: 1,
      maxTermYears: 24,
    },
    fees: { ...COMMERCIAL_FEES },
    approval: { ...COMMERCIAL_APPROVAL },
    dscrBands: { ...DSCR_BANDS },
    customerConcentrationThresholdPct:
      COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
    profitabilityDefaults: commercialDefaults,
    productFallback: false,
    componentFallbacks: { ...allConfigured },
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees.commercial,
    expectedLossPolicy: demoExpectedLossPolicies.commercial,
  };
}
const homeFormConfig = {
  products: homeProducts.map((p) => ({
    ...p,
    establishmentFee: 280,
    monthlyServiceFee: 4,
    loanContractVariationFee: 90,
    defaultFee: 18,
    titleSearchFee: 25,
    dischargeFee: 175,
    progressPaymentFee: 65,
  })),
  profitabilityDefaults: rowsToDefaultsByChannel(homeProfitabilityDefaults),
  costOfFundsDefaults: homeMargins,
  quoteFeeSetting: demoQuoteFees.home,
  serviceabilityNsiEnabled: true,
  canOverrideCapital: true,
  canOverrideExpectedLoss: true,
  showJsonTools: false,
};
const personalFormConfig = {
  products: personalProducts.map((p) => ({
    id: p.id!,
    name: p.name,
    productCategory: p.productCategory,
    securityType: p.securityType,
    maxTermMonths: p.maxTermMonths,
    cardedRate: p.cardedRate,
    comparisonRate: p.comparisonRate,
    ...p.fees,
  })),
  profitabilityDefaults:
    rowsToPersonalDefaultsByChannelAndSecurity(personalDefaults),
  costOfFundsDefaults: personalMargins,
  quoteFeeSetting: demoQuoteFees.personal,
  canOverrideCapital: true,
  canOverrideExpectedLoss: true,
  showJsonTools: false,
};
const commercialFormConfig = {
  profitabilityDefaults:
    rowsToCommercialDefaultsByChannelAndFacility(commercialDefaults),
  costOfFundsDefaults: Object.fromEntries(
    facilities.map((facility, index) => [facility, 4.3 + index * 0.1]),
  ),
  quoteFeeSetting: demoQuoteFees.commercial,
  customerConcentrationThresholdPct:
    COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  canOverrideCapital: true,
  canOverrideExpectedLoss: true,
  showJsonTools: false,
};
export function getDemoFormConfig(area: "home"): typeof homeFormConfig;
export function getDemoFormConfig(area: "personal"): typeof personalFormConfig;
export function getDemoFormConfig(
  area: "commercial",
): typeof commercialFormConfig;
export function getDemoFormConfig(
  area: DemoArea,
):
  | typeof homeFormConfig
  | typeof personalFormConfig
  | typeof commercialFormConfig;
export function getDemoFormConfig(area: DemoArea) {
  return area === "home"
    ? homeFormConfig
    : area === "personal"
      ? personalFormConfig
      : commercialFormConfig;
}
export function getDemoPolicy(area: DemoArea) {
  const commercial = facilities.map((facilityType) => ({
    facilityType,
    config: commercialConfigFor({ facilityType }),
  }));
  const rateSettings =
    area === "home"
      ? homeRates.map((row) => ({
          id: row.id,
          productName: homeProducts.find((p) => p.id === row.productId)!.name,
          rate: row.cardedRate,
          pricingRole: row.pricingRole!,
          details: `${row.lvrMin}–${row.lvrMax}% loan to value`,
        }))
      : area === "personal"
        ? personalProducts.map((product) => ({
            id: product.selectedRateId!,
            productName: product.name,
            rate: product.cardedRate,
            pricingRole: product.pricingRole!,
            details: product.securityType,
          }))
        : commercial.flatMap(({ facilityType, config }) =>
            (["standard", "non_standard"] as const).map((loanType) => {
              const row = config.baseRates[facilityType][loanType];
              return {
                id: row.selectedRateId!,
                productName: row.label,
                rate: row.rate,
                pricingRole: row.pricingRole!,
                details: loanType === "standard" ? "Standard" : "Non-standard",
              };
            }),
          );
  return {
    area,
    version: DEMO_POLICY_VERSION,
    notice: DEMO_POLICY_NOTICE,
    scoreModel:
      area === "home"
        ? DEFAULT_CUSTOMER_SCORE_MODEL
        : area === "personal"
          ? DEFAULT_PERSONAL_SCORE_MODEL
          : DEFAULT_COMMERCIAL_SCORE_MODEL,
    expectedLossPolicy: demoExpectedLossPolicies[area],
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees[area],
    products:
      area === "home"
        ? homeProducts
        : area === "personal"
          ? personalProducts
          : facilities.map((facility, index) => ({
              id: 301 + index,
              name: COMMERCIAL_BASE_RATES[facility].standard.label,
            })),
    rateBands: area === "home" ? homeRates : [],
    rateSettings,
    approvalPolicy:
      area === "home"
        ? homeApprovalRules
        : area === "personal"
          ? fallbackPersonalApprovalRules()
          : COMMERCIAL_APPROVAL,
    marginPolicy:
      area === "home"
        ? homeMargins
        : area === "personal"
          ? personalMargins
          : commercial.map(({ facilityType, config }) => ({
              facilityType,
              ...config.marginPolicy,
            })),
    affordabilityPolicy:
      area === "personal"
        ? PERSONAL_AFFORDABILITY
        : area === "commercial"
          ? DSCR_BANDS
          : null,
    profitabilityDefaults:
      area === "home"
        ? homeProfitabilityDefaults
        : area === "personal"
          ? personalDefaults
          : commercialDefaults,
    taxRatePct: PROFITABILITY_TAX_RATE_PCT,
    retentionDiscountSharePct: 60,
    formConfig: getDemoFormConfig(area),
  };
}

export function sampleInput(area: DemoArea) {
  const common = {
    customerReference: "Example 001",
    channel: "direct",
    costOfFunds: area === "home" ? 3.65 : area === "personal" ? 4.1 : 4.3,
    commissions: 0,
    otherIncome: area === "home" ? 294 : area === "personal" ? 28 : 550,
    expenses: area === "home" ? 1512 : area === "personal" ? 245 : 2400,
  };
  if (area === "home")
    return calcRequestSchema.parse({
      ...common,
      productId: 101,
      loanPurpose: "owner_occupied",
      rateType: "variable",
      loanAmount: 420000,
      propertyValue: 620000,
      loanTermYears: 25,
      creditScores: [780],
      dtiRatio: 3.2,
      grossAnnualIncome: 145000,
      employmentIncomeStability: "stable_payg",
      serviceabilityStatus: "appears_acceptable",
      capitalStandardStatus: "confirmed_standard",
      eligibleLmi: false,
      homeGuaranteeSchemeEligible: false,
      customerStream: "existing_member",
      yearsAsMember: 5,
      existingLenderLoan: "yes",
      lenderProducts: ["transaction_account"],
      livesInServiceRegion: "yes",
    });
  if (area === "personal")
    return personalCalcRequestSchema.parse({
      ...common,
      productId: 201,
      loanPurpose: "car_purchase",
      securityType: "secured_vehicle",
      loanAmount: 35000,
      loanTermMonths: 48,
      creditScores: [780],
      employmentIncomeStability: "stable_payg",
      netMonthlyIncome: 6200,
      monthlyLivingExpenses: 2200,
      existingMonthlyDebtRepayments: 350,
      customerStream: "existing_member",
      yearsAsMember: 5,
    });
  return commercialCalcRequestSchema.parse({
    ...common,
    businessName: "Example Workshop",
    facilityType: "term_loan",
    loanType: "standard",
    loanAmount: 500000,
    loanTermYears: 7,
    repaymentType: "principal_and_interest",
    industryCategory: "manufacturing",
    businessRiskGrade: "grade_2",
    yearsTrading: 9,
    annualRevenue: 2800000,
    ebitda: 360000,
    existingAnnualDebtService: 30000,
    financialsQuality: "accountant_prepared",
    financialsAgeMonths: 4,
    revenueTrend: "growing",
    profitTrend: "stable_profitable",
    taxStatus: "clear",
    largestCustomerRevenueAboveThreshold: false,
    securityType: "commercial_property",
    securityValue: 800000,
    existingRelationship: true,
    yearsWithLender: 5,
    otherLenderExposure: 100000,
    apsExposureClass: "sme_corporate",
    capitalClassificationConfirmed: true,
  });
}
