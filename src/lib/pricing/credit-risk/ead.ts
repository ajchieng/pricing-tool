import { amortisingCashFlow } from "../cash-flow";
import type { ExpectedLossEadSettingConfig } from "./policy-validation";

export type EadCalculation =
  | {
      status: "calculated";
      amount: number;
      exposureScope: string;
      method: ExpectedLossEadSettingConfig["method"];
      undrawnCcfPct: number | null;
      drawnAmount: number | null;
      undrawnAmount: number | null;
    }
  | {
      status: "incomplete_inputs" | "not_configured";
      amount: null;
      exposureScope: string;
      method: ExpectedLossEadSettingConfig["method"] | null;
      undrawnCcfPct: number | null;
      drawnAmount: number | null;
      undrawnAmount: number | null;
      technicalReason: string;
    };

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateExposureAtDefault(input: {
  setting: ExpectedLossEadSettingConfig | null;
  exposureScope: string;
  commitmentAmount: number;
  annualRatePct: number | null;
  termMonths: number | null;
  currentDrawnBalance?: number | null;
}): EadCalculation {
  const { setting } = input;
  if (!setting || !setting.active) {
    return {
      status: "not_configured",
      amount: null,
      exposureScope: input.exposureScope,
      method: null,
      undrawnCcfPct: null,
      drawnAmount: null,
      undrawnAmount: null,
      technicalReason: "No active EAD setting matches the exposure scope.",
    };
  }
  if (setting.method === "drawn_plus_ccf_undrawn") {
    if (input.currentDrawnBalance == null) {
      return {
        status: "incomplete_inputs",
        amount: null,
        exposureScope: input.exposureScope,
        method: setting.method,
        undrawnCcfPct: setting.undrawnCcfPct,
        drawnAmount: null,
        undrawnAmount: null,
        technicalReason: "Current drawn balance is required for overdraft EAD.",
      };
    }
    const drawn = Math.min(
      input.commitmentAmount,
      Math.max(0, input.currentDrawnBalance),
    );
    const undrawn = Math.max(0, input.commitmentAmount - drawn);
    return {
      status: "calculated",
      amount: money(drawn + undrawn * ((setting.undrawnCcfPct ?? 0) / 100)),
      exposureScope: input.exposureScope,
      method: setting.method,
      undrawnCcfPct: setting.undrawnCcfPct,
      drawnAmount: money(drawn),
      undrawnAmount: money(undrawn),
    };
  }
  if (setting.method === "expected_principal") {
    return {
      status: "calculated",
      amount: money(input.commitmentAmount),
      exposureScope: input.exposureScope,
      method: setting.method,
      undrawnCcfPct: null,
      drawnAmount: null,
      undrawnAmount: null,
    };
  }
  if (input.termMonths == null || input.termMonths <= 0) {
    return {
      status: "incomplete_inputs",
      amount: null,
      exposureScope: input.exposureScope,
      method: setting.method,
      undrawnCcfPct: null,
      drawnAmount: null,
      undrawnAmount: null,
      technicalReason: "A positive amortising term is required for EAD.",
    };
  }
  if (
    input.annualRatePct == null ||
    !Number.isFinite(input.annualRatePct) ||
    input.annualRatePct < 0
  ) {
    return {
      status: "incomplete_inputs",
      amount: null,
      exposureScope: input.exposureScope,
      method: setting.method,
      undrawnCcfPct: null,
      drawnAmount: null,
      undrawnAmount: null,
      technicalReason:
        "A non-negative customer rate is required for amortising EAD.",
    };
  }
  return {
    status: "calculated",
    amount: amortisingCashFlow({
      principal: input.commitmentAmount,
      annualCustomerRatePct: input.annualRatePct,
      termMonths: input.termMonths,
    }).closingBalance,
    exposureScope: input.exposureScope,
    method: setting.method,
    undrawnCcfPct: null,
    drawnAmount: null,
    undrawnAmount: null,
  };
}
