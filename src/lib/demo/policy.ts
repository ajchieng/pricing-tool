/** Live browser policy adapters. Fictional defaults bootstrap a fresh workspace only. */
import {
  getDemoConfiguration,
  subscribeDemoConfiguration,
  type DemoConfigurationRow,
} from "./configuration";
import * as seeds from "./policy-seeds";
import type {
  PricingConfig,
  ProductConfig,
  ProductRateConfig,
  MarginSettingConfig,
  ApprovalRuleConfig,
  AdjustmentRuleConfig,
} from "@/lib/pricing/types";
import type {
  PersonalProductConfig,
  PersonalPricingInput,
  PersonalMarginSettingConfig,
  PersonalProfitabilityDefaultConfig,
  PersonalApprovalRuleConfig,
} from "@/lib/pricing/personal/types";
import type {
  CommercialPricingInput,
  CommercialProfitabilityDefaultConfig,
  CommercialFacilityType,
} from "@/lib/pricing/commercial/types";
import type { CommercialPricingConfig } from "@/lib/pricing/commercial/calculate";
import {
  personalProductSecurityType,
  PERSONAL_AFFORDABILITY,
} from "@/lib/pricing/personal/config";
import {
  rowsToDefaultsByChannel,
  rowsToPersonalDefaultsByChannelAndSecurity,
  rowsToCommercialDefaultsByChannelAndFacility,
} from "@/lib/quotes/profitability-defaults";
import { selectPersonalMarginSetting } from "@/lib/pricing/cost-of-funds-defaults";
import { PROFITABILITY_TAX_RATE_PCT } from "@/lib/pricing/profitability-policy";
import type { CalcRequestInput } from "@/lib/pricing/schema";
import type { DemoArea } from "./types";
export type { DemoArea } from "./types";
export { DEMO_POLICY_NOTICE, sampleInput } from "./policy-seeds";
export let DEMO_POLICY_VERSION = seeds.DEMO_POLICY_VERSION;
export let DEMO_CAPITAL_RATIO_PCT = seeds.DEMO_CAPITAL_RATIO_PCT;
export let demoQuoteFees = seeds.demoQuoteFees;
export let homeProducts = seeds.homeProducts;
export let homeRates = seeds.homeRates;
export let homeMargins = seeds.homeMargins;
export let homeProfitabilityDefaults = seeds.homeProfitabilityDefaults;
export let personalProducts = seeds.personalProducts;
export let personalMargins = seeds.personalMargins;
export let personalDefaults = seeds.personalDefaults;
export let commercialDefaults = seeds.commercialDefaults;
export let demoExpectedLossPolicies = seeds.demoExpectedLossPolicies;
const facilities: CommercialFacilityType[] = [
  "term_loan",
  "overdraft",
  "equipment_finance",
  "commercial_property",
];
const configured = {
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
function asRows<T>(rows: DemoConfigurationRow[]): T[] {
  return rows as unknown as T[];
}
function inEffect(row: DemoConfigurationRow) {
  const now = Date.now();
  return (
    row.active === true &&
    (!row.effectiveFrom ||
      new Date(row.effectiveFrom as string).getTime() <= now) &&
    (!row.effectiveTo || new Date(row.effectiveTo as string).getTime() > now)
  );
}
function activeExpectedLoss(area: DemoArea) {
  const policy = getDemoConfiguration().expectedLossPolicies[area];
  const now = Date.now();
  return policy.active &&
    policy.effectiveFrom.getTime() <= now &&
    (!policy.effectiveTo || policy.effectiveTo.getTime() > now)
    ? policy
    : null;
}
function refreshBindings() {
  const state = getDemoConfiguration(),
    t = state.tables;
  DEMO_POLICY_VERSION = `illustrative-policy-${1000 + state.version}`;
  DEMO_CAPITAL_RATIO_PCT = t.capital_allocation_setting[0]
    .capitalRatioPct as number;
  demoQuoteFees = Object.fromEntries(
    (["home", "personal", "commercial"] as const).map((area) => {
      const row = t.quote_fee_setting.find((row) => row.vertical === area)!;
      return [
        area,
        {
          standardUpfrontFee: row.standardUpfrontFee as number,
          monthlyFee: row.monthlyFee as number,
          configured: true,
        },
      ];
    }),
  ) as typeof seeds.demoQuoteFees;
  homeProducts = asRows<ProductConfig>(t.product);
  homeRates = asRows<ProductRateConfig>(t.product_rate);
  homeMargins = asRows<MarginSettingConfig>(t.margin_setting);
  homeProfitabilityDefaults = asRows<
    (typeof seeds.homeProfitabilityDefaults)[number]
  >(t.profitability_default);
  personalProducts = t.personal_loan_product.map((row) => {
    const rate = t.personal_loan_product_rate
      .filter((rate) => rate.productId === row.id && inEffect(rate))
      .sort(
        (a, b) =>
          String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)) ||
          b.id - a.id,
      )[0];
    return {
      ...row,
      id: row.id,
      cardedRate: rate?.cardedRate ?? null,
      selectedRateId: rate?.id ?? null,
      pricingRole: rate?.pricingRole ?? null,
      comparisonRate: rate?.comparisonRate ?? null,
      active: row.active === true && Boolean(rate),
      fees: {
        establishmentFee: row.establishmentFee,
        monthlyServiceFee: row.monthlyServiceFee,
        onlineRedrawFee: row.onlineRedrawFee,
        branchRedrawFee: row.branchRedrawFee,
        defaultFee: row.defaultFee,
      },
    } as unknown as PersonalProductConfig;
  });
  personalMargins = asRows<PersonalMarginSettingConfig>(
    t.personal_margin_setting,
  );
  personalDefaults = asRows<PersonalProfitabilityDefaultConfig>(
    t.personal_profitability_default,
  );
  commercialDefaults = asRows<CommercialProfitabilityDefaultConfig>(
    t.commercial_profitability_default,
  );
  demoExpectedLossPolicies = state.expectedLossPolicies;
}
refreshBindings();
subscribeDemoConfiguration(refreshBindings);
export function homeConfigFor(input: CalcRequestInput): PricingConfig {
  refreshBindings();
  const state = getDemoConfiguration();
  const product = input.productId
    ? (homeProducts.find((p) => p.id === input.productId) ?? null)
    : (homeProducts.find(
        (p) =>
          p.active &&
          p.loanPurpose === input.loanPurpose &&
          p.rateType === input.rateType &&
          (p.rateType !== "fixed" ||
            p.fixedPeriodMonths === input.fixedPeriodMonths),
      ) ?? null);
  return {
    product,
    productRates: homeRates.filter((rate) => rate.productId === product?.id),
    adjustmentRules: asRows<AdjustmentRuleConfig>(
      state.tables.pricing_adjustment_rule,
    ),
    marginSettings: homeMargins,
    approvalRules: asRows<ApprovalRuleConfig>(state.tables.approval_rule),
    customerScoreModel: state.scoreModels.home,
    customerScoreModelFallback: false,
    componentFallbacks: {
      ...configured,
      product: !product,
      margin: !homeMargins.some((row) => row.active),
      profitability: !homeProfitabilityDefaults.some((row) => row.active),
    },
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees.home,
    profitabilityDefaultIds: homeProfitabilityDefaults.map((row) => row.id),
    profitabilityDefaultsSnapshot: homeProfitabilityDefaults,
  };
}
export function personalConfigFor(input: PersonalPricingInput) {
  refreshBindings();
  const state = getDemoConfiguration(),
    security = personalProductSecurityType(input.securityType);
  const product = input.productId
    ? personalProducts.find(
        (p) => p.id === input.productId && p.securityType === security,
      )
    : personalProducts.find((p) => p.active && p.securityType === security);
  if (!product?.active || product.cardedRate == null)
    throw new Error(
      "Configure an active Personal product and current rate for this security type before calculating.",
    );
  if (!selectPersonalMarginSetting(personalMargins, product.id, security))
    throw new Error(
      "Configure a Personal margin setting for this product and security type before calculating.",
    );
  if (state.tables.personal_approval_rule.length === 0)
    throw new Error(
      "Configure Personal approval rules before calculating. Rules can be explicitly disabled when no rule should apply.",
    );
  // Match the original domain readiness check, including intentionally blank
  // online commissions. Missing scopes still retain the engine's disclosed fallback.
  const profitabilityReady = ["direct", "broker", "online"].every((channel) =>
    ["secured", "unsecured"].every((scope) =>
      personalDefaults.some(
        (row) =>
          row.active &&
          row.channel === channel &&
          row.securityType === scope &&
          (channel === "online"
            ? row.commissionsPct == null || row.commissionsPct === 0
            : row.commissionsPct != null) &&
          row.otherIncomePct != null &&
          row.expensesPct != null,
      ),
    ),
  );
  return {
    product,
    scoreModel: state.scoreModels.personal,
    marginSettings: personalMargins,
    approvalRules: asRows<PersonalApprovalRuleConfig>(
      state.tables.personal_approval_rule,
    ),
    profitabilityDefaults: personalDefaults,
    componentFallbacks: {
      ...configured,
      margin: !personalMargins.some((row) => row.active),
      profitability: !profitabilityReady,
    },
    quoteFeeSetting: demoQuoteFees.personal,
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    expectedLossPolicy: activeExpectedLoss("personal"),
  };
}
function commercialProduct(facilityType: CommercialFacilityType) {
  return getDemoConfiguration().tables.commercial_loan_product.find(
    (row) => row.active && row.facilityType === facilityType,
  );
}
export function commercialConfigFor(
  input: Pick<CommercialPricingInput, "facilityType">,
): CommercialPricingConfig {
  refreshBindings();
  const state = getDemoConfiguration(),
    t = state.tables,
    product = commercialProduct(input.facilityType);
  const baseRates = Object.fromEntries(
    facilities.map((facilityType) => {
      const product = commercialProduct(facilityType);
      return [
        facilityType,
        Object.fromEntries(
          (["standard", "non_standard"] as const).map((loanType) => {
            const rate = t.commercial_loan_product_rate
              .filter(
                (row) =>
                  row.productId === product?.id &&
                  row.loanType === loanType &&
                  inEffect(row),
              )
              .sort(
                (a, b) =>
                  String(b.effectiveFrom).localeCompare(
                    String(a.effectiveFrom),
                  ) || b.id - a.id,
              )[0];
            return [
              loanType,
              {
                label: (product?.name as string) ?? "Unconfigured facility",
                baseRateName:
                  (product?.baseRateName as string) ?? "Not configured",
                rate: (rate?.baseRate as number) ?? Number.NaN,
                selectedRateId: rate?.id ?? null,
                pricingRole: rate?.pricingRole ?? null,
              },
            ];
          }),
        ),
      ];
    }),
  ) as CommercialPricingConfig["baseRates"];
  const margins = t.commercial_margin_setting
    .filter(
      (row) =>
        row.active &&
        (row.facilityType == null || row.facilityType === input.facilityType) &&
        (row.commercialProductId == null ||
          row.commercialProductId === product?.id),
    )
    .sort(
      (a, b) =>
        Number(b.commercialProductId != null) -
          Number(a.commercialProductId != null) ||
        Number(b.facilityType != null) - Number(a.facilityType != null) ||
        b.id - a.id,
    );
  const margin = margins[0];
  const approval = t.commercial_approval_setting.find((row) => row.active)!;
  return {
    scoreModel: state.scoreModels.commercial,
    productId: product?.id ?? null,
    marginSettingIds: margins.map((row) => row.id),
    approvalSettingIds: [approval.id],
    baseRates,
    marginFloor: (margin?.scoreMarginFloorPct as number) ?? 0,
    marginPolicy: {
      estimatedCostOfFunds: (margin?.estimatedCostOfFunds as number) ?? null,
      targetMargin: (margin?.targetMargin as number) ?? null,
      scoreMarginFloorPct: (margin?.scoreMarginFloorPct as number) ?? null,
      hardMinimumNetInterestMarginPct:
        (margin?.hardMinimumNetInterestMarginPct as number) ?? null,
      hardMinimumMargin: (margin?.hardMinimumMargin as number) ?? 0,
    },
    productLimits: {
      minLoanAmount: (product?.minLoanAmount as number) ?? null,
      maxLoanAmount: (product?.maxLoanAmount as number) ?? null,
      minTermYears: (product?.minTermYears as number) ?? null,
      maxTermYears: (product?.maxTermYears as number) ?? null,
    },
    fees: {
      establishmentFeePct: (product?.establishmentFeePct as number) ?? 0,
      establishmentFeeMin: (product?.establishmentFeeMin as number) ?? 0,
      overdraftLineFeePct: (product?.annualLineFeePct as number) ?? 0,
      equipmentDocumentationFee: (product?.documentationFee as number) ?? 0,
    },
    approval: {
      seniorExposure: approval.seniorExposure as number,
      reviewExposure: approval.reviewExposure as number,
      requestedBelowIndicativeManager:
        approval.requestedBelowIndicativeManager as number,
      requestedBelowIndicativeSenior:
        approval.requestedBelowIndicativeSenior as number,
    },
    dscrBands: {
      strongMin: approval.dscrStrongMin as number,
      acceptableMin: approval.dscrAcceptableMin as number,
    },
    customerConcentrationThresholdPct:
      approval.customerConcentrationThresholdPct as number,
    profitabilityDefaults: commercialDefaults,
    productFallback: !product,
    componentFallbacks: {
      ...configured,
      product: !product,
      margin: !margin,
      profitability: !commercialDefaults.some((row) => row.active),
    },
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees.commercial,
    expectedLossPolicy: activeExpectedLoss("commercial"),
  };
}
export function assertCommercialDemoConfigured(
  input: Pick<CommercialPricingInput, "facilityType" | "loanType">,
  config: CommercialPricingConfig,
) {
  if (
    !config.productId ||
    !Number.isFinite(
      config.baseRates[input.facilityType][input.loanType ?? "standard"].rate,
    )
  )
    throw new Error(
      "Configure an active Commercial product and current rate for this facility before calculating.",
    );
  if (!config.marginSettingIds?.length)
    throw new Error(
      "Configure a Commercial margin setting for this facility before calculating.",
    );
}
export function getDemoFormConfig(
  area: "home",
): ReturnType<typeof homeFormConfig>;
export function getDemoFormConfig(
  area: "personal",
): ReturnType<typeof personalFormConfig>;
export function getDemoFormConfig(
  area: "commercial",
): ReturnType<typeof commercialFormConfig>;
export function getDemoFormConfig(
  area: DemoArea,
):
  | ReturnType<typeof homeFormConfig>
  | ReturnType<typeof personalFormConfig>
  | ReturnType<typeof commercialFormConfig>;
export function getDemoFormConfig(area: DemoArea) {
  refreshBindings();
  return area === "home"
    ? homeFormConfig()
    : area === "personal"
      ? personalFormConfig()
      : commercialFormConfig();
}
function homeFormConfig() {
  return {
    ...seeds.getDemoFormConfig("home"),
    products: asRows<
      (typeof seeds.homeProducts)[number] & {
        establishmentFee: number | null;
        monthlyServiceFee: number | null;
        loanContractVariationFee: number | null;
        defaultFee: number | null;
        titleSearchFee: number | null;
        dischargeFee: number | null;
        progressPaymentFee: number | null;
      }
    >(getDemoConfiguration().tables.product.filter((row) => row.active)),
    profitabilityDefaults: rowsToDefaultsByChannel(homeProfitabilityDefaults),
    costOfFundsDefaults: homeMargins,
    quoteFeeSetting: demoQuoteFees.home,
  };
}
function personalFormConfig() {
  return {
    ...seeds.getDemoFormConfig("personal"),
    products: personalProducts
      .filter((p) => p.active)
      .map((p) => ({
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
  };
}
function commercialFormConfig() {
  return {
    ...seeds.getDemoFormConfig("commercial"),
    profitabilityDefaults:
      rowsToCommercialDefaultsByChannelAndFacility(commercialDefaults),
    costOfFundsDefaults: Object.fromEntries(
      facilities.map((facility) => [
        facility,
        commercialConfigFor({ facilityType: facility }).marginPolicy
          ?.estimatedCostOfFunds ?? null,
      ]),
    ),
    quoteFeeSetting: demoQuoteFees.commercial,
    customerConcentrationThresholdPct: commercialConfigFor({
      facilityType: "term_loan",
    }).customerConcentrationThresholdPct,
  };
}
export function getDemoPolicy(area: DemoArea) {
  refreshBindings();
  const state = getDemoConfiguration(),
    commercial = facilities.map((facilityType) => ({
      facilityType,
      config: commercialConfigFor({ facilityType }),
    }));
  const rateSettings =
    area === "home"
      ? homeRates.map((row) => ({
          id: row.id,
          productName:
            homeProducts.find((p) => p.id === row.productId)?.name ??
            "Removed product",
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
        : commercial.flatMap(({ config, facilityType }) =>
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
    notice: seeds.DEMO_POLICY_NOTICE,
    scoreModel: state.scoreModels[area],
    expectedLossPolicy: demoExpectedLossPolicies[area],
    capitalRatioPct: DEMO_CAPITAL_RATIO_PCT,
    quoteFeeSetting: demoQuoteFees[area],
    products:
      area === "home"
        ? homeProducts
        : area === "personal"
          ? personalProducts
          : state.tables.commercial_loan_product.map((row) => ({
              id: row.id,
              name: row.name as string,
            })),
    rateBands: area === "home" ? homeRates : [],
    rateSettings,
    approvalPolicy:
      area === "home"
        ? asRows<ApprovalRuleConfig>(state.tables.approval_rule)
        : area === "personal"
          ? asRows<PersonalApprovalRuleConfig>(
              state.tables.personal_approval_rule,
            )
          : commercial[0].config.approval,
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
          ? commercial[0].config.dscrBands
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
export function getHomeExpectedLossPolicy() {
  return activeExpectedLoss("home");
}
