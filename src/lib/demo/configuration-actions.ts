"use client";

import {
  mutateDemoConfiguration,
  resetDemoDomainConfiguration,
  type DemoConfigurationTarget,
} from "@/lib/demo/configuration";
import { expectedConfigurationVersion } from "@/lib/demo/configuration-form-version";
export { expectedConfigurationVersion } from "@/lib/demo/configuration-form-version";
import { scheduleDemoConfigurationChange } from "@/lib/demo/configuration-governance";
import { reportConfigurationResult } from "@/lib/demo/configuration-react";

// Keep the original domain form boundaries: blank optional values are null,
// checkboxes are boolean, and all calculations consume numeric financial values.
function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function optStr(fd: FormData, key: string): string | null {
  return str(fd, key) || null;
}
function num(fd: FormData, key: string): number {
  const raw = str(fd, key);
  const value = Number(raw);
  if (!raw || !Number.isFinite(value))
    throw new Error(key.replace(/([A-Z])/g, " $1") + " must be a number.");
  return value;
}
function optNum(fd: FormData, key: string): number | null {
  return str(fd, key) === "" ? null : num(fd, key);
}
function bool(fd: FormData, key: string): boolean {
  return ["on", "true", "1"].includes(str(fd, key));
}
function jsonPayload<T>(value: T): T {
  return value;
}

const PRODUCT_FEE_KEYS = [
  "establishmentFee",
  "monthlyServiceFee",
  "loanContractVariationFee",
  "defaultFee",
  "titleSearchFee",
  "dischargeFee",
  "progressPaymentFee",
] as const;

function productFees(
  fd: FormData,
): Record<(typeof PRODUCT_FEE_KEYS)[number], number | null> {
  return Object.fromEntries(
    PRODUCT_FEE_KEYS.map((key) => [key, optNum(fd, key)]),
  ) as Record<(typeof PRODUCT_FEE_KEYS)[number], number | null>;
}

const PROFITABILITY_DEFAULT_CHANNELS = new Set(["broker", "online", "direct"]);

function profitabilityDefaultPct(fd: FormData, key: string): number | null {
  const v = optNum(fd, key);
  if (v == null) return null;
  if (Number.isNaN(v) || v < 0 || v > 100) {
    throw new Error(`${key} must be between 0 and 100 (% of loan amount).`);
  }
  return v;
}

function profitabilityDefaultData(fd: FormData, channel: string) {
  if (!PROFITABILITY_DEFAULT_CHANNELS.has(channel)) {
    throw new Error("Channel must be broker, online or direct.");
  }
  return {
    commissionsPct:
      channel === "online"
        ? null
        : profitabilityDefaultPct(fd, "commissionsPct"),
    otherIncomePct: profitabilityDefaultPct(fd, "otherIncomePct"),
    expensesPct: profitabilityDefaultPct(fd, "expensesPct"),
  };
}

const PERSONAL_POLICY_SECURITY_TYPES = new Set(["secured", "unsecured"]);

function personalPolicySecurityType(fd: FormData): string | null {
  const securityType = optStr(fd, "securityType");
  if (securityType == null) return null;
  if (!PERSONAL_POLICY_SECURITY_TYPES.has(securityType)) {
    throw new Error("Security type must be secured or unsecured.");
  }
  return securityType;
}

function personalProfitabilityDefaultData(
  fd: FormData,
  channel: string,
  securityType: string,
) {
  if (!PROFITABILITY_DEFAULT_CHANNELS.has(channel)) {
    throw new Error("Channel must be broker, online or direct.");
  }
  if (!PERSONAL_POLICY_SECURITY_TYPES.has(securityType)) {
    throw new Error("Security type must be secured or unsecured.");
  }
  return {
    channel,
    securityType,
    commissionsPct:
      channel === "online"
        ? null
        : profitabilityDefaultPct(fd, "commissionsPct"),
    otherIncomePct: profitabilityDefaultPct(fd, "otherIncomePct"),
    expensesPct: profitabilityDefaultPct(fd, "expensesPct"),
  };
}

function personalProfitabilitySelection(fd: FormData): {
  channel: string;
  securityType: string;
} {
  const explicitChannel = optStr(fd, "channel");
  const explicitSecurityType = optStr(fd, "securityType");
  if (explicitChannel && explicitSecurityType) {
    return { channel: explicitChannel, securityType: explicitSecurityType };
  }

  const combination = str(fd, "combination");
  const [channel, securityType] = combination.split(":");
  return { channel: channel ?? "", securityType: securityType ?? "" };
}

const COMMERCIAL_FACILITY_TYPES = new Set([
  "term_loan",
  "overdraft",
  "equipment_finance",
  "commercial_property",
]);

function commercialFacilityType(fd: FormData): string {
  const value = str(fd, "facilityType");
  if (!COMMERCIAL_FACILITY_TYPES.has(value)) {
    throw new Error(
      "Facility type must be term_loan, overdraft, equipment_finance or commercial_property.",
    );
  }
  return value;
}

const COMMERCIAL_LOAN_TYPES = new Set(["standard", "non_standard"]);

function commercialLoanType(fd: FormData): string {
  const value = str(fd, "loanType");
  if (!COMMERCIAL_LOAN_TYPES.has(value)) {
    throw new Error("Loan type must be standard or non_standard.");
  }
  return value;
}

function commercialFacilityScope(fd: FormData): string | null {
  const value = str(fd, "facilityType");
  if (value === "") return null;
  if (!COMMERCIAL_FACILITY_TYPES.has(value)) {
    throw new Error("Facility type scope is not recognised.");
  }
  return value;
}

function commercialApprovalData(fd: FormData) {
  const customerConcentrationThresholdPct = num(
    fd,
    "customerConcentrationThresholdPct",
  );
  if (
    customerConcentrationThresholdPct <= 0 ||
    customerConcentrationThresholdPct >= 100
  ) {
    throw new Error(
      "Largest-customer concentration threshold must be greater than 0 and less than 100.",
    );
  }
  return {
    name: str(fd, "name") || "Commercial policy thresholds",
    seniorExposure: num(fd, "seniorExposure"),
    reviewExposure: num(fd, "reviewExposure"),
    requestedBelowIndicativeManager: num(fd, "requestedBelowIndicativeManager"),
    requestedBelowIndicativeSenior: num(fd, "requestedBelowIndicativeSenior"),
    dscrStrongMin: num(fd, "dscrStrongMin"),
    dscrAcceptableMin: num(fd, "dscrAcceptableMin"),
    customerConcentrationThresholdPct,
  };
}

function commercialProfitabilityDefaultData(
  fd: FormData,
  channel: string,
  facilityType: string,
) {
  if (!PROFITABILITY_DEFAULT_CHANNELS.has(channel)) {
    throw new Error("Channel must be broker, online or direct.");
  }
  if (!COMMERCIAL_FACILITY_TYPES.has(facilityType)) {
    throw new Error(
      "Facility type must be term_loan, overdraft, equipment_finance or commercial_property.",
    );
  }
  return {
    channel,
    facilityType,
    commissionsPct:
      channel === "online"
        ? null
        : profitabilityDefaultPct(fd, "commissionsPct"),
    otherIncomePct: profitabilityDefaultPct(fd, "otherIncomePct"),
    expensesPct: profitabilityDefaultPct(fd, "expensesPct"),
  };
}

function commercialProfitabilitySelection(fd: FormData): {
  channel: string;
  facilityType: string;
} {
  const explicitChannel = optStr(fd, "channel");
  const explicitFacilityType = optStr(fd, "facilityType");
  if (explicitChannel && explicitFacilityType) {
    return { channel: explicitChannel, facilityType: explicitFacilityType };
  }

  const combination = str(fd, "combination");
  const [channel, facilityType] = combination.split(":");
  return { channel: channel ?? "", facilityType: facilityType ?? "" };
}

export function createConfigurationActions(expectedVersion: number) {
  async function proposeConfigChange(
    fd: FormData,
    change: {
      area: string;
      action: "create" | "update" | "delete";
      targetType: DemoConfigurationTarget;
      targetId?: number;
      summary: string;
      payload: { data: Record<string, unknown> };
      redirectTo?: string;
    },
  ) {
    const formVersion = expectedConfigurationVersion(fd, expectedVersion);
    const effectiveAt = str(fd, "effectiveAt");
    if (effectiveAt && !Number.isFinite(new Date(effectiveAt).getTime())) {
      throw new Error("Choose a valid effective date.");
    }
    const mutation = {
      targetType: change.targetType,
      action: change.action,
      targetId: change.targetId,
      data: change.payload.data,
      reason: optStr(fd, "changeReason") ?? change.summary,
    };
    if (effectiveAt && new Date(effectiveAt).getTime() > Date.now()) {
      await scheduleDemoConfigurationChange({
        expectedVersion: formVersion,
        mutation,
        summary: change.summary,
        effectiveAt,
      });
      reportConfigurationResult(
        change.summary +
          ". Scheduled in this browser; publish it from Governance when due.",
        "success",
      );
    } else {
      await mutateDemoConfiguration({
        expectedVersion: formVersion,
        ...mutation,
      });
      reportConfigurationResult(
        change.summary + ". Saved in this browser.",
        "success",
      );
    }
  }
  async function createProduct(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      productCategory: str(fd, "productCategory"),
      loanPurpose: str(fd, "loanPurpose"),
      rateType: str(fd, "rateType"),
      fixedPeriodMonths: optNum(fd, "fixedPeriodMonths"),
      repaymentType: "principal_and_interest",
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      maxLvr: optNum(fd, "maxLvr"),
      ...productFees(fd),
      active: true,
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "products",
      action: "create",
      targetType: "product",
      summary: `Create product ${data.name}`,
      payload: { data },
    });
  }

  async function updateProduct(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      loanPurpose: str(fd, "loanPurpose"),
      rateType: str(fd, "rateType"),
      fixedPeriodMonths: optNum(fd, "fixedPeriodMonths"),
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      maxLvr: optNum(fd, "maxLvr"),
      ...productFees(fd),
      active: bool(fd, "active"),
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "products",
      action: "update",
      targetType: "product",
      targetId: id,
      summary: `Update product #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function applyDemoHomeProductsAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "home",
      "products",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo home products restored in this browser.",
      "success",
    );
  }

  async function applyHomePolicyAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "home",
      "policy",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo home policy restored in this browser.",
      "success",
    );
  }

  async function createRate(fd: FormData) {
    const data = {
      productId: num(fd, "productId"),
      lvrMin: num(fd, "lvrMin"),
      lvrMax: num(fd, "lvrMax"),
      cardedRate: num(fd, "cardedRate"),
      pricingRole: str(fd, "pricingRole"),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "rates",
      action: "create",
      targetType: "product_rate",
      summary: `Create rate band for product #${data.productId}`,
      payload: { data },
    });
  }

  async function updateRate(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      lvrMin: num(fd, "lvrMin"),
      lvrMax: num(fd, "lvrMax"),
      cardedRate: num(fd, "cardedRate"),
      pricingRole: str(fd, "pricingRole"),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "rates",
      action: "update",
      targetType: "product_rate",
      targetId: id,
      summary: `Update rate band #${id}`,
      payload: { data },
    });
  }

  async function deleteRate(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "rates",
      action: "delete",
      targetType: "product_rate",
      targetId: id,
      summary: `Delete rate band #${id}`,
      payload: { data: {} },
    });
  }

  async function createAdjustmentRule(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      description: optStr(fd, "description"),
      ruleType: "discount",
      adjustmentAmount: num(fd, "adjustmentAmount"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      appliesToProductId: optNum(fd, "appliesToProductId"),
      appliesToLoanPurpose: optStr(fd, "appliesToLoanPurpose"),
      appliesToRateType: optStr(fd, "appliesToRateType"),
      requiresApproval: bool(fd, "requiresApproval"),
      reasonText: optStr(fd, "reasonText"),
      active: true,
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "pricing_rules",
      action: "create",
      targetType: "pricing_adjustment_rule",
      summary: `Create pricing rule ${data.name}`,
      payload: { data },
    });
  }

  async function updateAdjustmentRule(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      ruleType: str(fd, "ruleType"),
      adjustmentAmount: num(fd, "adjustmentAmount"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      appliesToProductId: optNum(fd, "appliesToProductId"),
      appliesToLoanPurpose: optStr(fd, "appliesToLoanPurpose"),
      appliesToRateType: optStr(fd, "appliesToRateType"),
      requiresApproval: bool(fd, "requiresApproval"),
      reasonText: optStr(fd, "reasonText"),
      active: bool(fd, "active"),
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "pricing_rules",
      action: "update",
      targetType: "pricing_adjustment_rule",
      targetId: id,
      summary: `Update pricing rule #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function deleteAdjustmentRule(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "pricing_rules",
      action: "delete",
      targetType: "pricing_adjustment_rule",
      targetId: id,
      summary: `Delete pricing rule #${id}`,
      payload: { data: {} },
    });
  }

  async function createApprovalRule(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      approvalLevel: str(fd, "approvalLevel"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      reasonText: str(fd, "reasonText"),
      active: true,
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "approval_rules",
      action: "create",
      targetType: "approval_rule",
      summary: `Create approval rule ${data.name}`,
      payload: { data },
    });
  }

  async function updateApprovalRule(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      approvalLevel: str(fd, "approvalLevel"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      reasonText: str(fd, "reasonText"),
      active: bool(fd, "active"),
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "approval_rules",
      action: "update",
      targetType: "approval_rule",
      targetId: id,
      summary: `Update approval rule #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function deleteApprovalRule(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "approval_rules",
      action: "delete",
      targetType: "approval_rule",
      targetId: id,
      summary: `Delete approval rule #${id}`,
      payload: { data: {} },
    });
  }

  async function createMarginSetting(fd: FormData) {
    const data = {
      productId: optNum(fd, "productId"),
      loanPurpose: optStr(fd, "loanPurpose"),
      rateType: optStr(fd, "rateType"),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: num(fd, "hardMinimumMargin"),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "margins",
      action: "create",
      targetType: "margin_setting",
      summary: "Create margin setting",
      payload: { data },
    });
  }

  async function updateMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      loanPurpose: optStr(fd, "loanPurpose"),
      rateType: optStr(fd, "rateType"),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: num(fd, "hardMinimumMargin"),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "margins",
      action: "update",
      targetType: "margin_setting",
      targetId: id,
      summary: `Update margin setting #${id}`,
      payload: { data },
    });
  }

  async function deleteMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "margins",
      action: "delete",
      targetType: "margin_setting",
      targetId: id,
      summary: `Delete margin setting #${id}`,
      payload: { data: {} },
    });
  }

  async function createProfitabilityDefault(fd: FormData) {
    const channel = str(fd, "channel");
    const data = {
      channel,
      ...profitabilityDefaultData(fd, channel),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "profitability_defaults",
      action: "create",
      targetType: "profitability_default",
      summary: `Create ${channel} profitability defaults`,
      payload: { data },
    });
  }

  async function updateProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    const channel = str(fd, "channel");
    const data = {
      ...profitabilityDefaultData(fd, channel),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "profitability_defaults",
      action: "update",
      targetType: "profitability_default",
      targetId: id,
      summary: `Update ${channel} profitability defaults #${id}`,
      payload: { data },
    });
  }

  async function deleteProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "profitability_defaults",
      action: "delete",
      targetType: "profitability_default",
      targetId: id,
      summary: `Delete profitability defaults #${id}`,
      payload: { data: {} },
    });
  }

  async function createPersonalLoanProduct(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      productCategory: str(fd, "productCategory"),
      securityType: str(fd, "securityType"),
      rateType: "fixed",
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      minTermMonths: optNum(fd, "minTermMonths"),
      maxTermMonths: optNum(fd, "maxTermMonths"),
      establishmentFee: optNum(fd, "establishmentFee"),
      monthlyServiceFee: optNum(fd, "monthlyServiceFee"),
      onlineRedrawFee: optNum(fd, "onlineRedrawFee"),
      branchRedrawFee: optNum(fd, "branchRedrawFee"),
      defaultFee: optNum(fd, "defaultFee"),
      redrawAvailable: bool(fd, "redrawAvailable"),
      sourceUrl: optStr(fd, "sourceUrl"),
      active: true,
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "personal_products",
      action: "create",
      targetType: "personal_loan_product",
      summary: `Create personal loan product ${data.name}`,
      payload: { data },
    });
  }

  async function updatePersonalLoanProduct(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      productCategory: str(fd, "productCategory"),
      securityType: str(fd, "securityType"),
      rateType: "fixed",
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      minTermMonths: optNum(fd, "minTermMonths"),
      maxTermMonths: optNum(fd, "maxTermMonths"),
      establishmentFee: optNum(fd, "establishmentFee"),
      monthlyServiceFee: optNum(fd, "monthlyServiceFee"),
      onlineRedrawFee: optNum(fd, "onlineRedrawFee"),
      branchRedrawFee: optNum(fd, "branchRedrawFee"),
      defaultFee: optNum(fd, "defaultFee"),
      redrawAvailable: bool(fd, "redrawAvailable"),
      sourceUrl: optStr(fd, "sourceUrl"),
      active: bool(fd, "active"),
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "personal_products",
      action: "update",
      targetType: "personal_loan_product",
      targetId: id,
      summary: `Update personal loan product #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function applyDemoPersonalProductsAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "personal",
      "products",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo personal products restored in this browser.",
      "success",
    );
  }

  async function applyPersonalPolicyAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "personal",
      "policy",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo personal policy restored in this browser.",
      "success",
    );
  }

  async function createPersonalLoanRate(fd: FormData) {
    const data = {
      productId: num(fd, "productId"),
      cardedRate: num(fd, "cardedRate"),
      pricingRole: str(fd, "pricingRole"),
      comparisonRate: optNum(fd, "comparisonRate"),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "personal_rates",
      action: "create",
      targetType: "personal_loan_product_rate",
      summary: `Create personal loan rate for product #${data.productId}`,
      payload: { data },
    });
  }

  async function updatePersonalLoanRate(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      cardedRate: num(fd, "cardedRate"),
      pricingRole: str(fd, "pricingRole"),
      comparisonRate: optNum(fd, "comparisonRate"),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "personal_rates",
      action: "update",
      targetType: "personal_loan_product_rate",
      targetId: id,
      summary: `Update personal loan rate #${id}`,
      payload: { data },
    });
  }

  async function deletePersonalLoanRate(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "personal_rates",
      action: "delete",
      targetType: "personal_loan_product_rate",
      targetId: id,
      summary: `Delete personal loan rate #${id}`,
      payload: { data: {} },
    });
  }

  async function createPersonalMarginSetting(fd: FormData) {
    const data = {
      securityType: personalPolicySecurityType(fd),
      personalProductId: optNum(fd, "personalProductId"),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: num(fd, "hardMinimumMargin"),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "personal_margins",
      action: "create",
      targetType: "personal_margin_setting",
      summary: "Create personal loan margin setting",
      payload: { data },
    });
  }

  async function updatePersonalMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      securityType: personalPolicySecurityType(fd),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: num(fd, "hardMinimumMargin"),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "personal_margins",
      action: "update",
      targetType: "personal_margin_setting",
      targetId: id,
      summary: `Update personal loan margin setting #${id}`,
      payload: { data },
    });
  }

  async function deletePersonalMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "personal_margins",
      action: "delete",
      targetType: "personal_margin_setting",
      targetId: id,
      summary: `Delete personal loan margin setting #${id}`,
      payload: { data: {} },
    });
  }

  async function createPersonalApprovalRule(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      approvalLevel: str(fd, "approvalLevel"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      reasonText: str(fd, "reasonText"),
      active: true,
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "personal_approval_rules",
      action: "create",
      targetType: "personal_approval_rule",
      summary: `Create personal loan approval rule ${data.name}`,
      payload: { data },
    });
  }

  async function updatePersonalApprovalRule(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      approvalLevel: str(fd, "approvalLevel"),
      conditionType: str(fd, "conditionType"),
      conditionOperator: str(fd, "conditionOperator"),
      conditionValue: str(fd, "conditionValue"),
      reasonText: str(fd, "reasonText"),
      active: bool(fd, "active"),
      priority: optNum(fd, "priority") ?? 100,
    };
    await proposeConfigChange(fd, {
      area: "personal_approval_rules",
      action: "update",
      targetType: "personal_approval_rule",
      targetId: id,
      summary: `Update personal loan approval rule #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function deletePersonalApprovalRule(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "personal_approval_rules",
      action: "delete",
      targetType: "personal_approval_rule",
      targetId: id,
      summary: `Delete personal loan approval rule #${id}`,
      payload: { data: {} },
    });
  }

  async function createPersonalProfitabilityDefault(fd: FormData) {
    const { channel, securityType } = personalProfitabilitySelection(fd);
    const data = {
      ...personalProfitabilityDefaultData(fd, channel, securityType),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "personal_profitability_defaults",
      action: "create",
      targetType: "personal_profitability_default",
      summary: `Create ${securityType} ${channel} personal loan profitability defaults`,
      payload: { data },
    });
  }

  async function updatePersonalProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    const channel = str(fd, "channel");
    const securityType = str(fd, "securityType");
    const data = {
      ...personalProfitabilityDefaultData(fd, channel, securityType),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "personal_profitability_defaults",
      action: "update",
      targetType: "personal_profitability_default",
      targetId: id,
      summary: `Update ${securityType} ${channel} personal loan profitability defaults #${id}`,
      payload: { data },
    });
  }

  async function deletePersonalProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "personal_profitability_defaults",
      action: "delete",
      targetType: "personal_profitability_default",
      targetId: id,
      summary: `Delete personal loan profitability defaults #${id}`,
      payload: { data: {} },
    });
  }

  async function createCommercialLoanProduct(fd: FormData) {
    const data = {
      name: str(fd, "name"),
      facilityType: commercialFacilityType(fd),
      baseRateName: str(fd, "baseRateName"),
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      minTermYears: optNum(fd, "minTermYears"),
      maxTermYears: optNum(fd, "maxTermYears"),
      establishmentFeePct: optNum(fd, "establishmentFeePct"),
      establishmentFeeMin: optNum(fd, "establishmentFeeMin"),
      annualLineFeePct: optNum(fd, "annualLineFeePct"),
      documentationFee: optNum(fd, "documentationFee"),
      sourceUrl: optStr(fd, "sourceUrl"),
      active: true,
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "commercial_products",
      action: "create",
      targetType: "commercial_loan_product",
      summary: `Create commercial loan product ${data.name}`,
      payload: { data },
    });
  }

  async function updateCommercialLoanProduct(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      name: str(fd, "name"),
      facilityType: commercialFacilityType(fd),
      baseRateName: str(fd, "baseRateName"),
      minLoanAmount: optNum(fd, "minLoanAmount"),
      maxLoanAmount: optNum(fd, "maxLoanAmount"),
      minTermYears: optNum(fd, "minTermYears"),
      maxTermYears: optNum(fd, "maxTermYears"),
      establishmentFeePct: optNum(fd, "establishmentFeePct"),
      establishmentFeeMin: optNum(fd, "establishmentFeeMin"),
      annualLineFeePct: optNum(fd, "annualLineFeePct"),
      documentationFee: optNum(fd, "documentationFee"),
      sourceUrl: optStr(fd, "sourceUrl"),
      active: bool(fd, "active"),
      notes: optStr(fd, "notes"),
    };
    await proposeConfigChange(fd, {
      area: "commercial_products",
      action: "update",
      targetType: "commercial_loan_product",
      targetId: id,
      summary: `Update commercial loan product #${id}: ${data.name}`,
      payload: { data },
    });
  }

  async function applyDemoCommercialProductsAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "commercial",
      "products",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo commercial products restored in this browser.",
      "success",
    );
  }

  async function applyCommercialPolicyAction(fd: FormData) {
    await resetDemoDomainConfiguration(
      "commercial",
      "policy",
      expectedConfigurationVersion(fd, expectedVersion),
    );
    reportConfigurationResult(
      "Demo commercial policy restored in this browser.",
      "success",
    );
  }

  async function createCommercialLoanRate(fd: FormData) {
    const data = {
      productId: num(fd, "productId"),
      loanType: commercialLoanType(fd),
      baseRate: num(fd, "baseRate"),
      pricingRole: str(fd, "pricingRole"),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "commercial_rates",
      action: "create",
      targetType: "commercial_loan_product_rate",
      summary: `Create ${data.loanType} commercial base rate for product #${data.productId}`,
      payload: { data },
    });
  }

  async function updateCommercialLoanRate(fd: FormData) {
    const id = num(fd, "id");
    const data = {
      loanType: commercialLoanType(fd),
      baseRate: num(fd, "baseRate"),
      pricingRole: str(fd, "pricingRole"),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "commercial_rates",
      action: "update",
      targetType: "commercial_loan_product_rate",
      targetId: id,
      summary: `Update commercial base rate #${id}`,
      payload: { data },
    });
  }

  async function deleteCommercialLoanRate(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "commercial_rates",
      action: "delete",
      targetType: "commercial_loan_product_rate",
      targetId: id,
      summary: `Delete commercial base rate #${id}`,
      payload: { data: {} },
    });
  }

  async function createCommercialMarginSetting(fd: FormData) {
    const scoreMarginFloorPct = num(fd, "scoreMarginFloorPct");
    const data = {
      facilityType: commercialFacilityScope(fd),
      commercialProductId: optNum(fd, "commercialProductId"),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: scoreMarginFloorPct,
      scoreMarginFloorPct,
      hardMinimumNetInterestMarginPct: num(
        fd,
        "hardMinimumNetInterestMarginPct",
      ),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "commercial_margins",
      action: "create",
      targetType: "commercial_margin_setting",
      summary: "Create commercial loan margin setting",
      payload: { data },
    });
  }

  async function updateCommercialMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    const scoreMarginFloorPct = num(fd, "scoreMarginFloorPct");
    const data = {
      facilityType: commercialFacilityScope(fd),
      estimatedCostOfFunds: num(fd, "estimatedCostOfFunds"),
      targetMargin: num(fd, "targetMargin"),
      hardMinimumMargin: scoreMarginFloorPct,
      scoreMarginFloorPct,
      hardMinimumNetInterestMarginPct: num(
        fd,
        "hardMinimumNetInterestMarginPct",
      ),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "commercial_margins",
      action: "update",
      targetType: "commercial_margin_setting",
      targetId: id,
      summary: `Update commercial loan margin setting #${id}`,
      payload: { data },
    });
  }

  async function deleteCommercialMarginSetting(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "commercial_margins",
      action: "delete",
      targetType: "commercial_margin_setting",
      targetId: id,
      summary: `Delete commercial loan margin setting #${id}`,
      payload: { data: {} },
    });
  }

  async function createCommercialApprovalSetting(fd: FormData) {
    const data = { ...commercialApprovalData(fd), active: true };
    await proposeConfigChange(fd, {
      area: "commercial_approval_settings",
      action: "create",
      targetType: "commercial_approval_setting",
      summary: "Create commercial policy thresholds",
      payload: { data },
    });
  }

  async function updateCommercialApprovalSetting(fd: FormData) {
    const id = num(fd, "id");
    const data = { ...commercialApprovalData(fd), active: bool(fd, "active") };
    await proposeConfigChange(fd, {
      area: "commercial_approval_settings",
      action: "update",
      targetType: "commercial_approval_setting",
      targetId: id,
      summary: `Update commercial policy thresholds #${id}`,
      payload: { data },
    });
  }

  async function createCommercialProfitabilityDefault(fd: FormData) {
    const { channel, facilityType } = commercialProfitabilitySelection(fd);
    const data = {
      ...commercialProfitabilityDefaultData(fd, channel, facilityType),
      active: true,
    };
    await proposeConfigChange(fd, {
      area: "commercial_profitability_defaults",
      action: "create",
      targetType: "commercial_profitability_default",
      summary: `Create ${facilityType} ${channel} commercial loan profitability defaults`,
      payload: { data },
    });
  }

  async function updateCommercialProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    const channel = str(fd, "channel");
    const facilityType = str(fd, "facilityType");
    const data = {
      ...commercialProfitabilityDefaultData(fd, channel, facilityType),
      active: bool(fd, "active"),
    };
    await proposeConfigChange(fd, {
      area: "commercial_profitability_defaults",
      action: "update",
      targetType: "commercial_profitability_default",
      targetId: id,
      summary: `Update ${facilityType} ${channel} commercial loan profitability defaults #${id}`,
      payload: { data },
    });
  }

  async function deleteCommercialProfitabilityDefault(fd: FormData) {
    const id = num(fd, "id");
    await proposeConfigChange(fd, {
      area: "commercial_profitability_defaults",
      action: "delete",
      targetType: "commercial_profitability_default",
      targetId: id,
      summary: `Delete commercial loan profitability defaults #${id}`,
      payload: { data: {} },
    });
  }

  async function updateQuoteFeeSetting(fd: FormData) {
    const id = num(fd, "id");
    const vertical = str(fd, "vertical");
    if (!["home", "personal", "commercial"].includes(vertical)) {
      throw new Error("Quote fee setting must belong to a valid lending area.");
    }
    const standardUpfrontFee = num(fd, "standardUpfrontFee");
    const monthlyFee = num(fd, "monthlyFee");
    if (
      !Number.isFinite(standardUpfrontFee) ||
      standardUpfrontFee < 0 ||
      !Number.isFinite(monthlyFee) ||
      monthlyFee < 0
    ) {
      throw new Error("Upfront and monthly fees must be non-negative amounts.");
    }
    const payload = jsonPayload({
      data: { vertical, standardUpfrontFee, monthlyFee },
    });
    await proposeConfigChange(fd, {
      area: "quote_fees",
      action: "update",
      targetType: "quote_fee_setting",
      targetId: id,
      summary: `Set ${vertical} quote fees to $${standardUpfrontFee.toFixed(2)} upfront and $${monthlyFee.toFixed(2)} monthly`,
      payload,
    });
  }
  async function updateCapitalAllocationSetting(fd: FormData) {
    const capitalRatioPct = num(fd, "capitalRatioPct");
    if (capitalRatioPct <= 0 || capitalRatioPct > 100) {
      throw new Error(
        "Capital ratio must be greater than 0 and no more than 100.",
      );
    }
    await proposeConfigChange(fd, {
      area: "capital_allocation",
      action: "update",
      targetType: "capital_allocation_setting",
      targetId: 1,
      summary: `Set quote capital allocation ratio to ${capitalRatioPct}%`,
      payload: { data: { capitalRatioPct } },
    });
  }

  async function updateQuoteDetailDisplaySettings(fd: FormData) {
    const data = {
      showQuoteHandoffStatus: bool(fd, "showQuoteHandoffStatus"),
      highContrast: bool(fd, "highContrast"),
      comfortableDensity: bool(fd, "comfortableDensity"),
      largeNumericDisplay: bool(fd, "largeNumericDisplay"),
      simpleMode: bool(fd, "simpleMode"),
    };
    await proposeConfigChange(fd, {
      area: "display",
      action: "update",
      targetType: "workspace_display_setting",
      targetId: 1,
      summary: "Update workspace display settings",
      payload: { data },
    });
  }

  return {
    updateCapitalAllocationSetting,
    updateQuoteDetailDisplaySettings,
    createProduct,
    updateProduct,
    applyDemoHomeProductsAction,
    applyHomePolicyAction,
    createRate,
    updateRate,
    deleteRate,
    createAdjustmentRule,
    updateAdjustmentRule,
    deleteAdjustmentRule,
    createApprovalRule,
    updateApprovalRule,
    deleteApprovalRule,
    createMarginSetting,
    updateMarginSetting,
    deleteMarginSetting,
    createProfitabilityDefault,
    updateProfitabilityDefault,
    deleteProfitabilityDefault,
    createPersonalLoanProduct,
    updatePersonalLoanProduct,
    applyDemoPersonalProductsAction,
    applyPersonalPolicyAction,
    createPersonalLoanRate,
    updatePersonalLoanRate,
    deletePersonalLoanRate,
    createPersonalMarginSetting,
    updatePersonalMarginSetting,
    deletePersonalMarginSetting,
    createPersonalApprovalRule,
    updatePersonalApprovalRule,
    deletePersonalApprovalRule,
    createPersonalProfitabilityDefault,
    updatePersonalProfitabilityDefault,
    deletePersonalProfitabilityDefault,
    createCommercialLoanProduct,
    updateCommercialLoanProduct,
    applyDemoCommercialProductsAction,
    applyCommercialPolicyAction,
    createCommercialLoanRate,
    updateCommercialLoanRate,
    deleteCommercialLoanRate,
    createCommercialMarginSetting,
    updateCommercialMarginSetting,
    deleteCommercialMarginSetting,
    createCommercialApprovalSetting,
    updateCommercialApprovalSetting,
    createCommercialProfitabilityDefault,
    updateCommercialProfitabilityDefault,
    deleteCommercialProfitabilityDefault,
    updateQuoteFeeSetting,
  };
}
