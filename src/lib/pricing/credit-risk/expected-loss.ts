import type { Profitability, WarningItem } from "../types";
import type { EadCalculation } from "./ead";
import type {
  ExpectedLossLgdBandConfig,
  ExpectedLossPdBandConfig,
  ExpectedLossPolicyConfig,
} from "./policy-validation";
import type { CreditRiskStatus, RiskOnlyAssessment } from "./types";

export interface ExpectedLossResult {
  status: CreditRiskStatus;
  basis: ExpectedLossBasis;
  riskGrade: string | null;
  riskOnlyScore: number | null;
  riskDefinitionHash: string;
  sourceModelArea: string;
  sourceModelVersion: number;
  policyId: number | null;
  policyVersion: number | null;
  probabilityOfDefaultPct: number | null;
  lossGivenDefaultPct: number | null;
  exposureAtDefaultAmount: number | null;
  expectedCreditLossAmount: number | null;
  effectiveExpectedCreditLossAmount: number | null;
  expectedCreditLossOverrideAmount: number | null;
  expectedCreditLossOverrideReason: string | null;
  expectedLossOverrideByName: string | null;
  expectedLossOverrideByRole: string | null;
  operatingProfitBeforeCreditLossAmount: number | null;
  riskAdjustedProfitBeforeTaxAmount: number | null;
  riskAdjustedTaxAmount: number | null;
  riskAdjustedProfitAfterTaxAmount: number | null;
  riskAdjustedReturnOnAssetsPct: number | null;
  riskAdjustedReturnOnEquityPct: number | null;
  selectedPdBand: ExpectedLossPdBandConfig | null;
  selectedLgdBand: ExpectedLossLgdBandConfig | null;
  ead: EadCalculation | null;
  technicalReason: string | null;
}

export type ExpectedLossBasis =
  "calculated" | "provisional" | "manual_override";

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function rate(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function emptyResult(
  risk: RiskOnlyAssessment,
  status: CreditRiskStatus,
  policy: ExpectedLossPolicyConfig | null,
  technicalReason: string,
  operatingProfitBeforeCreditLossAmount: number | null,
): ExpectedLossResult {
  return {
    status,
    basis: "provisional",
    riskGrade: null,
    riskOnlyScore: risk.riskScore,
    riskDefinitionHash: risk.riskDefinitionHash,
    sourceModelArea: risk.sourceModelArea,
    sourceModelVersion: risk.sourceModelVersion,
    policyId: policy?.id ?? null,
    policyVersion: policy?.version ?? null,
    probabilityOfDefaultPct: null,
    lossGivenDefaultPct: null,
    exposureAtDefaultAmount: null,
    expectedCreditLossAmount: null,
    effectiveExpectedCreditLossAmount: null,
    expectedCreditLossOverrideAmount: null,
    expectedCreditLossOverrideReason: null,
    expectedLossOverrideByName: null,
    expectedLossOverrideByRole: null,
    operatingProfitBeforeCreditLossAmount,
    riskAdjustedProfitBeforeTaxAmount: null,
    riskAdjustedTaxAmount: null,
    riskAdjustedProfitAfterTaxAmount: null,
    riskAdjustedReturnOnAssetsPct: null,
    riskAdjustedReturnOnEquityPct: null,
    selectedPdBand: null,
    selectedLgdBand: null,
    ead: null,
    technicalReason,
  };
}

function selectPdBand(
  policy: ExpectedLossPolicyConfig,
  riskScore: number,
): ExpectedLossPdBandConfig | null {
  return (
    policy.pdBands
      .filter((band) => band.active && riskScore >= band.minRiskScore)
      .sort(
        (left, right) =>
          right.minRiskScore - left.minRiskScore ||
          (left.id ?? Number.MAX_SAFE_INTEGER) -
            (right.id ?? Number.MAX_SAFE_INTEGER),
      )[0] ?? null
  );
}

export interface ExpectedLossCalculationInput {
  risk: RiskOnlyAssessment;
  policy: ExpectedLossPolicyConfig | null;
  lossScope: string | null;
  lossScopeTechnicalReason?: string | null;
  ead: EadCalculation | null;
  profitability: Profitability;
  taxRate: number;
}

export function calculateExpectedLoss(
  input: ExpectedLossCalculationInput,
): ExpectedLossResult {
  const operatingProfitBeforeCreditLoss =
    input.profitability.estimatedAnnualNetInterestIncome == null
      ? null
      : money(
          input.profitability.estimatedAnnualNetInterestIncome -
            (input.profitability.commissions ?? 0) +
            (input.profitability.otherIncome ?? 0) +
            input.profitability.feeIncome.firstYearFeeIncome -
            (input.profitability.expenses ?? 0),
        );

  if (input.risk.status === "incomplete_inputs") {
    return emptyResult(
      input.risk,
      "incomplete_inputs",
      input.policy,
      input.risk.technicalReason ?? "Required customer risk facts are missing.",
      operatingProfitBeforeCreditLoss,
    );
  }
  if (input.risk.status === "not_configured" || !input.policy) {
    return emptyResult(
      input.risk,
      "not_configured",
      input.policy,
      input.risk.status === "not_configured"
        ? (input.risk.technicalReason ?? "Risk-only scoring is not configured.")
        : "No active expected-loss policy is configured.",
      operatingProfitBeforeCreditLoss,
    );
  }
  if (
    input.policy.compatibleRiskDefinitionHash !== input.risk.riskDefinitionHash
  ) {
    return emptyResult(
      input.risk,
      "incompatible_policy",
      input.policy,
      "The active expected-loss policy is incompatible with the active Risk definition.",
      operatingProfitBeforeCreditLoss,
    );
  }
  if (input.risk.riskScore == null) {
    return emptyResult(
      input.risk,
      "incomplete_inputs",
      input.policy,
      "Risk-only score could not be calculated.",
      operatingProfitBeforeCreditLoss,
    );
  }
  if (input.lossScope == null) {
    return emptyResult(
      input.risk,
      "incomplete_inputs",
      input.policy,
      input.lossScopeTechnicalReason ??
        "Required loss-severity inputs are incomplete.",
      operatingProfitBeforeCreditLoss,
    );
  }
  const pdBand = selectPdBand(input.policy, input.risk.riskScore);
  const lgdBand =
    input.policy.lgdBands.find(
      (band) => band.active && band.lossScope === input.lossScope,
    ) ?? null;
  if (!pdBand || !lgdBand) {
    return emptyResult(
      input.risk,
      "not_configured",
      input.policy,
      !pdBand
        ? "No PD band covers the calculated Risk-only score."
        : "No active LGD band matches the loss scope.",
      operatingProfitBeforeCreditLoss,
    );
  }
  if (!input.ead || input.ead.status !== "calculated") {
    return emptyResult(
      input.risk,
      input.ead?.status ?? "not_configured",
      input.policy,
      input.ead && "technicalReason" in input.ead
        ? input.ead.technicalReason
        : "EAD could not be calculated.",
      operatingProfitBeforeCreditLoss,
    );
  }

  if (operatingProfitBeforeCreditLoss == null) {
    return emptyResult(
      input.risk,
      "incomplete_inputs",
      input.policy,
      "Profitability inputs are incomplete.",
      null,
    );
  }

  const expectedCreditLoss = money(
    input.ead.amount * (pdBand.annualPdPct / 100) * (lgdBand.lgdPct / 100),
  );
  const riskAdjustedProfitBeforeTax = money(
    operatingProfitBeforeCreditLoss - expectedCreditLoss,
  );
  const riskAdjustedTax = money(
    Math.max(0, riskAdjustedProfitBeforeTax) * input.taxRate,
  );
  const riskAdjustedProfitAfterTax = money(
    riskAdjustedProfitBeforeTax - riskAdjustedTax,
  );
  const assetBase = input.profitability.averageAssets;
  const allocatedCapital =
    input.profitability.capitalAllocation?.allocatedCapital ?? null;

  return {
    status: "calculated",
    basis: "calculated",
    riskGrade: pdBand.riskGrade,
    riskOnlyScore: input.risk.riskScore,
    riskDefinitionHash: input.risk.riskDefinitionHash,
    sourceModelArea: input.risk.sourceModelArea,
    sourceModelVersion: input.risk.sourceModelVersion,
    policyId: input.policy.id,
    policyVersion: input.policy.version,
    probabilityOfDefaultPct: pdBand.annualPdPct,
    lossGivenDefaultPct: lgdBand.lgdPct,
    exposureAtDefaultAmount: input.ead.amount,
    expectedCreditLossAmount: expectedCreditLoss,
    effectiveExpectedCreditLossAmount: expectedCreditLoss,
    expectedCreditLossOverrideAmount: null,
    expectedCreditLossOverrideReason: null,
    expectedLossOverrideByName: null,
    expectedLossOverrideByRole: null,
    operatingProfitBeforeCreditLossAmount: operatingProfitBeforeCreditLoss,
    riskAdjustedProfitBeforeTaxAmount: riskAdjustedProfitBeforeTax,
    riskAdjustedTaxAmount: riskAdjustedTax,
    riskAdjustedProfitAfterTaxAmount: riskAdjustedProfitAfterTax,
    riskAdjustedReturnOnAssetsPct:
      assetBase != null && assetBase > 0
        ? rate((riskAdjustedProfitAfterTax / assetBase) * 100)
        : null,
    riskAdjustedReturnOnEquityPct:
      allocatedCapital != null && allocatedCapital > 0
        ? rate((riskAdjustedProfitAfterTax / allocatedCapital) * 100)
        : null,
    selectedPdBand: pdBand,
    selectedLgdBand: lgdBand,
    ead: input.ead,
    technicalReason: null,
  };
}

export interface ExpectedLossTreatmentInput {
  expectedLoss: ExpectedLossResult;
  profitability: Profitability;
  taxRate: number;
  expectedCreditLossOverrideAmount?: number | null;
  expectedCreditLossOverrideEnabled?: boolean;
  expectedCreditLossOverrideReason?: string | null;
}

/**
 * Selects the amount that feeds the quote P&L without changing the governed
 * risk assessment. A manual override wins when explicitly authorised, then a
 * calculated model result, then the quote's provisional assumption.
 */
export function applyExpectedLossTreatment(
  input: ExpectedLossTreatmentInput,
): ExpectedLossResult {
  const modelAmount = input.expectedLoss.expectedCreditLossAmount;
  const overrideAmount = money(
    Math.max(0, input.expectedCreditLossOverrideAmount ?? 0),
  );
  const overrideEnabled = input.expectedCreditLossOverrideEnabled === true;
  const calculated =
    input.expectedLoss.status === "calculated" && modelAmount != null;
  const basis: ExpectedLossBasis = overrideEnabled
    ? "manual_override"
    : calculated
      ? "calculated"
      : "provisional";
  const effectiveExpectedCreditLossAmount =
    basis === "calculated" ? modelAmount : overrideAmount;
  const operatingProfitBeforeCreditLoss =
    input.expectedLoss.operatingProfitBeforeCreditLossAmount;

  if (
    operatingProfitBeforeCreditLoss == null ||
    effectiveExpectedCreditLossAmount == null
  ) {
    return {
      ...input.expectedLoss,
      basis,
      effectiveExpectedCreditLossAmount,
      expectedCreditLossOverrideAmount:
        basis === "calculated" ? null : overrideAmount,
      expectedCreditLossOverrideReason:
        basis === "manual_override"
          ? input.expectedCreditLossOverrideReason?.trim() || null
          : null,
      riskAdjustedProfitBeforeTaxAmount: null,
      riskAdjustedTaxAmount: null,
      riskAdjustedProfitAfterTaxAmount: null,
      riskAdjustedReturnOnAssetsPct: null,
      riskAdjustedReturnOnEquityPct: null,
    };
  }

  const profitBeforeTax = money(
    operatingProfitBeforeCreditLoss - effectiveExpectedCreditLossAmount,
  );
  const tax = money(Math.max(0, profitBeforeTax) * input.taxRate);
  const profitAfterTax = money(profitBeforeTax - tax);
  const assetBase = input.profitability.averageAssets;
  const allocatedCapital =
    input.profitability.capitalAllocation?.allocatedCapital ?? null;

  return {
    ...input.expectedLoss,
    basis,
    effectiveExpectedCreditLossAmount,
    expectedCreditLossOverrideAmount:
      basis === "calculated" ? null : overrideAmount,
    expectedCreditLossOverrideReason:
      basis === "manual_override"
        ? input.expectedCreditLossOverrideReason?.trim() || null
        : null,
    riskAdjustedProfitBeforeTaxAmount: profitBeforeTax,
    riskAdjustedTaxAmount: tax,
    riskAdjustedProfitAfterTaxAmount: profitAfterTax,
    riskAdjustedReturnOnAssetsPct:
      assetBase != null && assetBase > 0
        ? rate((profitAfterTax / assetBase) * 100)
        : null,
    riskAdjustedReturnOnEquityPct:
      allocatedCapital != null && allocatedCapital > 0
        ? rate((profitAfterTax / allocatedCapital) * 100)
        : null,
  };
}

export function expectedLossTreatmentWarnings(
  expectedLoss: ExpectedLossResult,
): WarningItem[] {
  if (expectedLoss.basis === "provisional") {
    return [
      {
        code: "expected_loss_provisional",
        message:
          "Final profitability uses a provisional expected-credit-loss assumption because governed ECL is unavailable.",
        severity: "warning",
      },
    ];
  }
  if (expectedLoss.basis === "manual_override") {
    return [
      {
        code: "expected_loss_overridden",
        message:
          "Final profitability uses an authorised expected-credit-loss override.",
        severity: "warning",
      },
    ];
  }
  return [];
}

/**
 * Expected loss is the only credit-loss deduction in the canonical lender P&L.
 * Pure vertical calculators build the operating lines and capital exposure;
 * the service layer calls this finaliser after governed ECL and any quote-level
 * treatment have been resolved.
 */
export function finalizeProfitabilityWithExpectedLoss<T extends Profitability>(
  profitability: T,
  expectedLoss: ExpectedLossResult,
  taxRatePct: number | null = null,
): T {
  return {
    ...profitability,
    expectedLoss,
    taxRatePct,
    profitBeforeTax: expectedLoss.riskAdjustedProfitBeforeTaxAmount,
    tax: expectedLoss.riskAdjustedTaxAmount,
    profitAfterTax: expectedLoss.riskAdjustedProfitAfterTaxAmount,
    returnOnAssets: expectedLoss.riskAdjustedReturnOnAssetsPct,
    capitalAllocation: profitability.capitalAllocation
      ? {
          ...profitability.capitalAllocation,
          returnOnEquity: expectedLoss.riskAdjustedReturnOnEquityPct,
        }
      : null,
  };
}
