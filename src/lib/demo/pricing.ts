/** Browser orchestration preserves each domain's pricing, capital, ECL and immutable policy snapshot. */
import { calculatePricing } from "@/lib/pricing/calculate";
import { calculatePersonalLoanPricing } from "@/lib/pricing/personal/calculate";
import { calculateCommercialLoanPricing } from "@/lib/pricing/commercial/calculate";
import { DEFAULT_CUSTOMER_SCORE_MODEL } from "@/lib/pricing/customer-score";
import { assertHomeServiceabilityNsiSupported } from "@/lib/pricing/home-capabilities";
import { assessHomeCreditRisk } from "@/lib/pricing/credit-risk/home";
import { assessPersonalCreditRisk } from "@/lib/pricing/credit-risk/personal";
import { assessCommercialCreditRisk } from "@/lib/pricing/credit-risk/commercial";
import { homeLossScope } from "@/lib/pricing/credit-risk/home-loss-scope";
import { personalLossScope } from "@/lib/pricing/credit-risk/personal-loss-scope";
import { commercialLossScope } from "@/lib/pricing/credit-risk/commercial-loss-scope";
import { calculateExposureAtDefault } from "@/lib/pricing/credit-risk/ead";
import {
  calculateExpectedLoss,
  applyExpectedLossTreatment,
  expectedLossTreatmentWarnings,
  finalizeProfitabilityWithExpectedLoss,
} from "@/lib/pricing/credit-risk/expected-loss";
import { resolveProfitabilityTaxRate } from "@/lib/pricing/profitability-policy";
import {
  buildPricingPolicySnapshot,
  expectedLossPolicyRequiresFallback,
} from "@/lib/pricing/policy-snapshot";
import { findBestCompetitorRate } from "@/lib/competitors/competitor-rates";
import type {
  PolicyComponentFallbacks,
  PricingResult,
} from "@/lib/pricing/types";
import { calcRequestSchema, type CalcRequestInput } from "@/lib/pricing/schema";
import {
  personalCalcRequestSchema,
  type PersonalCalcRequestInput,
} from "@/lib/pricing/personal/schema";
import {
  commercialCalcRequestSchema,
  type CommercialCalcRequestInput,
} from "@/lib/pricing/commercial/schema";
import type { PersonalPricingResult } from "@/lib/pricing/personal/types";
import type { CommercialPricingResult } from "@/lib/pricing/commercial/types";
import {
  homeConfigFor,
  personalConfigFor,
  commercialConfigFor,
  demoExpectedLossPolicies,
  DEMO_CAPITAL_RATIO_PCT,
  demoQuoteFees,
  type DemoArea,
} from "./policy";
export { getDemoFormConfig, getDemoPolicy, sampleInput } from "./policy";

export function calculateHome(req: CalcRequestInput): PricingResult {
  const config = homeConfigFor(req);
  const capitalRatioPct = DEMO_CAPITAL_RATIO_PCT;
  const quoteFeeSetting = demoQuoteFees.home;
  const expectedLossPolicy = demoExpectedLossPolicies.home;
  const competitorRates: import("@/lib/competitors/types").CompetitorRate[] =
    [];
  assertHomeServiceabilityNsiSupported(
    req,
    config.customerScoreModel ?? DEFAULT_CUSTOMER_SCORE_MODEL,
  );
  const result = calculatePricing(req, {
    ...config,
    capitalRatioPct,
    quoteFeeSetting,
  });
  const competitorComparison = findBestCompetitorRate(
    req,
    competitorRates,
    result.suggestedRate,
  );
  const scoreModel = config.customerScoreModel ?? DEFAULT_CUSTOMER_SCORE_MODEL;
  const risk = assessHomeCreditRisk(req, scoreModel);
  const eadScope = "amortising";
  const ead = calculateExposureAtDefault({
    setting:
      expectedLossPolicy?.eadSettings.find(
        (setting) => setting.active && setting.exposureScope === eadScope,
      ) ?? null,
    exposureScope: eadScope,
    commitmentAmount: req.loanAmount,
    annualRatePct: result.finalDisplayRate,
    termMonths: req.loanTermYears * 12,
  });
  const taxRate = resolveProfitabilityTaxRate(req.taxRateOverridePct);
  const modelExpectedLoss = calculateExpectedLoss({
    risk,
    policy: expectedLossPolicy,
    lossScope: homeLossScope(req),
    lossScopeTechnicalReason:
      "Positive loan and property values are required for Home LGD.",
    ead,
    profitability: result.profitability,
    taxRate: taxRate.rate,
  });
  const expectedLoss = applyExpectedLossTreatment({
    expectedLoss: modelExpectedLoss,
    profitability: result.profitability,
    taxRate: taxRate.rate,
    expectedCreditLossOverrideAmount: req.expectedCreditLossOverrideAmount,
    expectedCreditLossOverrideEnabled: req.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: req.expectedCreditLossOverrideReason,
  });
  const expectedLossFallback = expectedLossPolicyRequiresFallback(
    expectedLossPolicy,
    {
      vertical: "home",
      scoreModelVersion: scoreModel.version,
      riskDefinitionHash: risk.riskDefinitionHash,
    },
  );
  const componentFallbacks = {
    ...(config.componentFallbacks ?? {
      product: true,
      scoreModel: true,
      scoreModelGovernance: true,
      margin: true,
      approval: true,
      profitability: true,
      fees: true,
      capital: true,
      expectedLoss: true,
    }),
    fees: !quoteFeeSetting.configured,
    capital: capitalRatioPct == null,
    expectedLoss: expectedLossFallback,
  };
  const policySnapshot = buildPricingPolicySnapshot({
    vertical: "home",
    productId: config.product?.id ?? null,
    selectedRateId: result.selectedRateBandId,
    selectedRateRole: result.selectedRateRole ?? null,
    scoreModelId: scoreModel.id,
    scoreModelVersion: scoreModel.version,
    adjustmentRuleIds: config.adjustmentRules.map((rule) => rule.id),
    marginSettingIds: config.marginSettings.map((setting) => setting.id),
    approvalSettingIds: config.approvalRules.map((rule) => rule.id),
    profitabilityDefaultIds: config.profitabilityDefaultIds ?? [],
    quoteFeeConfigured: quoteFeeSetting.configured,
    capitalSettingId: capitalRatioPct == null ? null : 1,
    expectedLossPolicyId: expectedLossPolicy?.id ?? null,
    expectedLossPolicyVersion: expectedLossPolicy?.version ?? null,
    componentFallbacks,
    componentValues: {
      product: config.product,
      productRates: config.productRates,
      scoreModel,
      adjustmentRules: config.adjustmentRules,
      marginSettings: config.marginSettings,
      approvalRules: config.approvalRules,
      profitabilityDefaults: config.profitabilityDefaultsSnapshot,
      quoteFeeSetting,
      capitalRatioPct,
      expectedLossPolicy,
    },
  });

  return {
    ...result,
    warnings: [
      ...result.warnings,
      ...expectedLossTreatmentWarnings(expectedLoss),
    ],
    competitorComparison,
    policySnapshot,
    profitability: finalizeProfitabilityWithExpectedLoss(
      result.profitability,
      expectedLoss,
      taxRate.ratePct,
    ),
  };
}

export function calculatePersonal(
  input: PersonalCalcRequestInput,
): PersonalPricingResult {
  const config = personalConfigFor(input);
  const result = calculatePersonalLoanPricing(
    input,
    config.scoreModel,
    config.product,
    {
      marginSettings: config.marginSettings,
      approvalRules: config.approvalRules,
      profitabilityDefaults: config.profitabilityDefaults,
      capitalRatioPct: config.capitalRatioPct,
      quoteFeeSetting: config.quoteFeeSetting,
      componentFallbacks: config.componentFallbacks,
    },
  );
  const risk = assessPersonalCreditRisk(
    input,
    config.scoreModel,
    result.baseRate,
  );
  const eadScope = "amortising";
  const ead = calculateExposureAtDefault({
    setting:
      config.expectedLossPolicy?.eadSettings.find(
        (setting) => setting.active && setting.exposureScope === eadScope,
      ) ?? null,
    exposureScope: eadScope,
    commitmentAmount: input.loanAmount,
    annualRatePct: result.finalDisplayRate,
    termMonths: input.loanTermMonths,
  });
  const taxRate = resolveProfitabilityTaxRate(input.taxRateOverridePct);
  const modelExpectedLoss = calculateExpectedLoss({
    risk,
    policy: config.expectedLossPolicy,
    lossScope: personalLossScope(input),
    ead,
    profitability: result.profitability,
    taxRate: taxRate.rate,
  });
  const expectedLoss = applyExpectedLossTreatment({
    expectedLoss: modelExpectedLoss,
    profitability: result.profitability,
    taxRate: taxRate.rate,
    expectedCreditLossOverrideAmount: input.expectedCreditLossOverrideAmount,
    expectedCreditLossOverrideEnabled: input.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: input.expectedCreditLossOverrideReason,
  });
  const expectedLossFallback = expectedLossPolicyRequiresFallback(
    config.expectedLossPolicy,
    {
      vertical: "personal",
      scoreModelVersion: config.scoreModel.version,
      riskDefinitionHash: risk.riskDefinitionHash,
    },
  );
  const componentFallbacks: PolicyComponentFallbacks = {
    ...config.componentFallbacks,
    expectedLoss: expectedLossFallback,
  };
  const policySnapshot = buildPricingPolicySnapshot({
    vertical: "personal",
    productId: config.product?.id ?? null,
    selectedRateId: result.selectedRateId ?? null,
    selectedRateRole: result.selectedRateRole ?? null,
    scoreModelId: config.scoreModel.id,
    scoreModelVersion: config.scoreModel.version,
    adjustmentRuleIds: [],
    marginSettingIds: config.marginSettings.map((setting) => setting.id),
    approvalSettingIds: config.approvalRules.map((rule) => rule.id),
    profitabilityDefaultIds: config.profitabilityDefaults.map(
      (setting) => setting.id,
    ),
    quoteFeeConfigured: config.quoteFeeSetting.configured,
    capitalSettingId: config.capitalRatioPct == null ? null : 1,
    expectedLossPolicyId: config.expectedLossPolicy?.id ?? null,
    expectedLossPolicyVersion: config.expectedLossPolicy?.version ?? null,
    componentFallbacks,
    componentValues: {
      product: config.product,
      scoreModel: config.scoreModel,
      marginSettings: config.marginSettings,
      approvalRules: config.approvalRules,
      profitabilityDefaults: config.profitabilityDefaults,
      quoteFeeSetting: config.quoteFeeSetting,
      capitalRatioPct: config.capitalRatioPct,
      expectedLossPolicy: config.expectedLossPolicy,
    },
  });
  return {
    ...result,
    policySnapshot,
    warnings: [
      ...result.warnings,
      ...expectedLossTreatmentWarnings(expectedLoss),
    ],
    profitability: finalizeProfitabilityWithExpectedLoss(
      result.profitability,
      expectedLoss,
      taxRate.ratePct,
    ),
  };
}

export function calculateCommercial(
  input: CommercialCalcRequestInput,
): CommercialPricingResult {
  const config = commercialConfigFor(input);
  const result = calculateCommercialLoanPricing(input, config);
  const risk = assessCommercialCreditRisk(
    input,
    config.scoreModel,
    result.baseRate,
    config.customerConcentrationThresholdPct,
  );
  const lossScope = commercialLossScope(input);
  const eadScope =
    input.facilityType === "overdraft" || input.repaymentType === "revolving"
      ? "overdraft"
      : input.repaymentType === "interest_only"
        ? "interest_only"
        : "amortising";
  const ead = calculateExposureAtDefault({
    setting:
      config.expectedLossPolicy?.eadSettings.find(
        (setting) => setting.active && setting.exposureScope === eadScope,
      ) ?? null,
    exposureScope: eadScope,
    commitmentAmount: input.loanAmount,
    annualRatePct: result.finalDisplayRate,
    termMonths: input.loanTermYears == null ? null : input.loanTermYears * 12,
    currentDrawnBalance: input.currentDrawnBalance ?? null,
  });
  const taxRate = resolveProfitabilityTaxRate(input.taxRateOverridePct);
  const modelExpectedLoss = calculateExpectedLoss({
    risk,
    policy: config.expectedLossPolicy ?? null,
    lossScope: lossScope.status === "calculated" ? lossScope.lossScope : null,
    lossScopeTechnicalReason:
      lossScope.status === "incomplete_inputs"
        ? lossScope.technicalReason
        : null,
    ead,
    profitability: result.profitability,
    taxRate: taxRate.rate,
  });
  const expectedLoss = applyExpectedLossTreatment({
    expectedLoss: modelExpectedLoss,
    profitability: result.profitability,
    taxRate: taxRate.rate,
    expectedCreditLossOverrideAmount: input.expectedCreditLossOverrideAmount,
    expectedCreditLossOverrideEnabled: input.expectedCreditLossOverrideEnabled,
    expectedCreditLossOverrideReason: input.expectedCreditLossOverrideReason,
  });
  const expectedLossFallback = expectedLossPolicyRequiresFallback(
    config.expectedLossPolicy,
    {
      vertical: "commercial",
      scoreModelVersion: config.scoreModel.version,
      riskDefinitionHash: risk.riskDefinitionHash,
    },
  );
  const componentFallbacks: PolicyComponentFallbacks = {
    ...(config.componentFallbacks ?? {
      product: true,
      scoreModel: true,
      scoreModelGovernance: true,
      margin: true,
      approval: true,
      profitability: true,
      fees: true,
      capital: true,
      expectedLoss: true,
    }),
    expectedLoss: expectedLossFallback,
  };
  const policySnapshot = buildPricingPolicySnapshot({
    vertical: "commercial",
    productId: config.productId ?? null,
    selectedRateId: result.selectedRateId ?? null,
    selectedRateRole: result.selectedRateRole ?? null,
    scoreModelId: config.scoreModel.id,
    scoreModelVersion: config.scoreModel.version,
    adjustmentRuleIds: [],
    marginSettingIds: config.marginSettingIds ?? [],
    approvalSettingIds: config.approvalSettingIds ?? [],
    profitabilityDefaultIds: (config.profitabilityDefaults ?? []).map(
      (setting) => setting.id,
    ),
    quoteFeeConfigured: config.quoteFeeSetting?.configured ?? false,
    capitalSettingId: config.capitalRatioPct == null ? null : 1,
    expectedLossPolicyId: config.expectedLossPolicy?.id ?? null,
    expectedLossPolicyVersion: config.expectedLossPolicy?.version ?? null,
    componentFallbacks,
    componentValues: {
      productId: config.productId,
      selectedBaseRate: result.baseRate,
      selectedRateRole: result.selectedRateRole,
      scoreModel: config.scoreModel,
      baseRates: config.baseRates,
      marginPolicy: config.marginPolicy,
      productLimits: config.productLimits,
      fees: config.fees,
      approval: config.approval,
      dscrBands: config.dscrBands,
      customerConcentrationThresholdPct:
        config.customerConcentrationThresholdPct,
      profitabilityDefaults: config.profitabilityDefaults,
      quoteFeeSetting: config.quoteFeeSetting,
      capitalRatioPct: config.capitalRatioPct,
      expectedLossPolicy: config.expectedLossPolicy,
    },
  });
  return {
    ...result,
    policySnapshot,
    warnings: [
      ...result.warnings,
      ...expectedLossTreatmentWarnings(expectedLoss),
    ],
    profitability: finalizeProfitabilityWithExpectedLoss(
      result.profitability,
      expectedLoss,
      taxRate.ratePct,
    ),
  };
}

function withDemoProvenance<
  R extends PricingResult | PersonalPricingResult | CommercialPricingResult,
>(result: R): R {
  const pnl = result.profitability;
  const loss = pnl.expectedLoss;
  const capital = pnl.capitalAllocation;
  return {
    ...result,
    profitability: {
      ...pnl,
      expectedLoss:
        loss?.basis === "manual_override" &&
        loss.expectedCreditLossOverrideReason?.trim()
          ? {
              ...loss,
              expectedLossOverrideByName: "Demo user",
              expectedLossOverrideByRole: "demo",
            }
          : loss,
      capitalAllocation:
        capital?.classificationBasis === "override" &&
        capital.overrideReason?.trim()
          ? { ...capital, overrideByName: "Demo user", overrideByRole: "demo" }
          : capital,
    },
  };
}

export function calculateDemo(
  area: "home",
  payload: unknown,
): Promise<{ input: CalcRequestInput; result: PricingResult }>;
export function calculateDemo(
  area: "personal",
  payload: unknown,
): Promise<{ input: PersonalCalcRequestInput; result: PersonalPricingResult }>;
export function calculateDemo(
  area: "commercial",
  payload: unknown,
): Promise<{
  input: CommercialCalcRequestInput;
  result: CommercialPricingResult;
}>;
export function calculateDemo(
  area: DemoArea,
  payload: unknown,
): Promise<{
  input:
    CalcRequestInput | PersonalCalcRequestInput | CommercialCalcRequestInput;
  result: PricingResult | PersonalPricingResult | CommercialPricingResult;
}>;
export async function calculateDemo(area: DemoArea, payload: unknown) {
  if (area === "home") {
    const input = calcRequestSchema.parse(payload);
    return { input, result: withDemoProvenance(calculateHome(input)) };
  }
  if (area === "personal") {
    const input = personalCalcRequestSchema.parse(payload);
    return { input, result: withDemoProvenance(calculatePersonal(input)) };
  }
  const input = commercialCalcRequestSchema.parse(payload);
  return { input, result: withDemoProvenance(calculateCommercial(input)) };
}
