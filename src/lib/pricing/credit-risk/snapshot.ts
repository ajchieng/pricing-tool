import type { ExpectedLossBasis, ExpectedLossResult } from "./expected-loss";
import type { CreditRiskStatus } from "./types";

type ExpectedLossSnapshot = {
  calculationSnapshot?: unknown;
  creditRiskStatus?: string | null;
  creditRiskGrade?: string | null;
  creditRiskScorePct?: number | null;
  creditRiskDefinitionHash?: string | null;
  creditRiskModelArea?: string | null;
  creditRiskModelVersion?: number | null;
  expectedLossPolicyId?: number | null;
  expectedLossPolicyVersion?: number | null;
  probabilityOfDefaultPct?: number | null;
  lossGivenDefaultPct?: number | null;
  exposureAtDefaultAmount?: number | null;
  expectedCreditLossAmount?: number | null;
  expectedLossBasis?: string | null;
  effectiveExpectedCreditLossAmount?: number | null;
  expectedCreditLossOverrideAmount?: number | null;
  expectedCreditLossOverrideReason?: string | null;
  expectedLossOverrideByName?: string | null;
  expectedLossOverrideByRole?: string | null;
  operatingProfitBeforeCreditLossAmount?: number | null;
  riskAdjustedProfitBeforeTaxAmount?: number | null;
  riskAdjustedTaxAmount?: number | null;
  riskAdjustedProfitAfterTaxAmount?: number | null;
  riskAdjustedReturnOnAssetsPct?: number | null;
  riskAdjustedReturnOnEquityPct?: number | null;
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isStatus(value: unknown): value is CreditRiskStatus {
  return (
    value === "calculated" ||
    value === "incomplete_inputs" ||
    value === "not_configured" ||
    value === "incompatible_policy"
  );
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function basis(value: unknown, status: CreditRiskStatus): ExpectedLossBasis {
  if (
    value === "calculated" ||
    value === "provisional" ||
    value === "manual_override"
  ) {
    return value;
  }
  return status === "calculated" ? "calculated" : "provisional";
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function expectedLossFromJson(value: unknown): ExpectedLossResult | null {
  const saved = objectValue(value);
  if (!saved || !isStatus(saved.status)) return null;
  const resolvedBasis = basis(saved.basis, saved.status);

  return {
    status: saved.status,
    basis: resolvedBasis,
    riskGrade: text(saved.riskGrade),
    riskOnlyScore: finiteNumber(saved.riskOnlyScore),
    riskDefinitionHash: text(saved.riskDefinitionHash) ?? "",
    sourceModelArea: text(saved.sourceModelArea) ?? "",
    sourceModelVersion: finiteNumber(saved.sourceModelVersion) ?? 0,
    policyId: finiteNumber(saved.policyId),
    policyVersion: finiteNumber(saved.policyVersion),
    probabilityOfDefaultPct: finiteNumber(saved.probabilityOfDefaultPct),
    lossGivenDefaultPct: finiteNumber(saved.lossGivenDefaultPct),
    exposureAtDefaultAmount: finiteNumber(saved.exposureAtDefaultAmount),
    expectedCreditLossAmount: finiteNumber(saved.expectedCreditLossAmount),
    effectiveExpectedCreditLossAmount:
      finiteNumber(saved.effectiveExpectedCreditLossAmount) ??
      (resolvedBasis === "calculated" && saved.status === "calculated"
        ? finiteNumber(saved.expectedCreditLossAmount)
        : null),
    expectedCreditLossOverrideAmount: finiteNumber(
      saved.expectedCreditLossOverrideAmount,
    ),
    expectedCreditLossOverrideReason: text(
      saved.expectedCreditLossOverrideReason,
    ),
    expectedLossOverrideByName: text(saved.expectedLossOverrideByName),
    expectedLossOverrideByRole: text(saved.expectedLossOverrideByRole),
    operatingProfitBeforeCreditLossAmount: finiteNumber(
      saved.operatingProfitBeforeCreditLossAmount,
    ),
    riskAdjustedProfitBeforeTaxAmount: finiteNumber(
      saved.riskAdjustedProfitBeforeTaxAmount,
    ),
    riskAdjustedTaxAmount: finiteNumber(saved.riskAdjustedTaxAmount),
    riskAdjustedProfitAfterTaxAmount: finiteNumber(
      saved.riskAdjustedProfitAfterTaxAmount,
    ),
    riskAdjustedReturnOnAssetsPct: finiteNumber(
      saved.riskAdjustedReturnOnAssetsPct,
    ),
    riskAdjustedReturnOnEquityPct: finiteNumber(
      saved.riskAdjustedReturnOnEquityPct,
    ),
    selectedPdBand: null,
    selectedLgdBand: null,
    ead: null,
    technicalReason: text(saved.technicalReason),
  };
}

export function expectedLossFromSnapshot(
  row: ExpectedLossSnapshot | null | undefined,
): ExpectedLossResult | null {
  if (!row) return null;
  const calculation = objectValue(row.calculationSnapshot);
  const saved = objectValue(calculation?.expectedLoss);
  if (!isStatus(row.creditRiskStatus)) {
    return expectedLossFromJson(saved);
  }
  const resolvedBasis = basis(row.expectedLossBasis, row.creditRiskStatus);

  return {
    status: row.creditRiskStatus,
    basis: resolvedBasis,
    riskGrade: row.creditRiskGrade ?? null,
    riskOnlyScore: finiteNumber(row.creditRiskScorePct),
    riskDefinitionHash: row.creditRiskDefinitionHash ?? "",
    sourceModelArea: row.creditRiskModelArea ?? "",
    sourceModelVersion: finiteNumber(row.creditRiskModelVersion) ?? 0,
    policyId: finiteNumber(row.expectedLossPolicyId),
    policyVersion: finiteNumber(row.expectedLossPolicyVersion),
    probabilityOfDefaultPct: finiteNumber(row.probabilityOfDefaultPct),
    lossGivenDefaultPct: finiteNumber(row.lossGivenDefaultPct),
    exposureAtDefaultAmount: finiteNumber(row.exposureAtDefaultAmount),
    expectedCreditLossAmount: finiteNumber(row.expectedCreditLossAmount),
    effectiveExpectedCreditLossAmount:
      finiteNumber(row.effectiveExpectedCreditLossAmount) ??
      (resolvedBasis === "calculated" && row.creditRiskStatus === "calculated"
        ? finiteNumber(row.expectedCreditLossAmount)
        : null),
    expectedCreditLossOverrideAmount: finiteNumber(
      row.expectedCreditLossOverrideAmount,
    ),
    expectedCreditLossOverrideReason:
      row.expectedCreditLossOverrideReason ?? null,
    expectedLossOverrideByName: row.expectedLossOverrideByName ?? null,
    expectedLossOverrideByRole: row.expectedLossOverrideByRole ?? null,
    operatingProfitBeforeCreditLossAmount: finiteNumber(
      row.operatingProfitBeforeCreditLossAmount,
    ),
    riskAdjustedProfitBeforeTaxAmount: finiteNumber(
      row.riskAdjustedProfitBeforeTaxAmount,
    ),
    riskAdjustedTaxAmount: finiteNumber(row.riskAdjustedTaxAmount),
    riskAdjustedProfitAfterTaxAmount: finiteNumber(
      row.riskAdjustedProfitAfterTaxAmount,
    ),
    riskAdjustedReturnOnAssetsPct: finiteNumber(
      row.riskAdjustedReturnOnAssetsPct,
    ),
    riskAdjustedReturnOnEquityPct: finiteNumber(
      row.riskAdjustedReturnOnEquityPct,
    ),
    selectedPdBand: null,
    selectedLgdBand: null,
    ead: null,
    technicalReason: text(saved?.technicalReason),
  };
}

export function expectedLossForHistoricalQuote(
  row: ExpectedLossSnapshot | null | undefined,
  calculationExpectedLoss: unknown,
): ExpectedLossResult | null {
  return (
    expectedLossFromSnapshot(row) ??
    expectedLossFromJson(calculationExpectedLoss)
  );
}
