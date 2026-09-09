// Fictional demonstration policy values; not lender calibration.
import type { LoanCustomerStream } from "./types";

export type RetentionPricingOutcome =
  | "not_applicable"
  | "standard"
  | "partial_additional_discount"
  | "no_further_discount";

export interface RetentionPricingInput {
  customerStream?: LoanCustomerStream;
  currentCustomerRate?: number | null;
  retentionArrearsHardship18Months?: boolean | null;
  retentionArrearsPast12Months?: boolean | null;
  requestedRate?: number | null;
}

export interface RetentionPricingConstraint {
  suggestedRate: number;
  finalDisplayRate: number;
  availableAdditionalDiscount: number;
  outcome: RetentionPricingOutcome;
  requestedRateConstrained: boolean;
}

function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function applyRetentionPricingConstraint(
  input: RetentionPricingInput,
  ordinarySuggestedRate: number,
): RetentionPricingConstraint {
  const requestedRate = input.requestedRate ?? null;
  if (
    input.customerStream !== "retention" ||
    input.currentCustomerRate == null
  ) {
    return {
      suggestedRate: ordinarySuggestedRate,
      finalDisplayRate: requestedRate ?? ordinarySuggestedRate,
      availableAdditionalDiscount: 0,
      outcome: "not_applicable",
      requestedRateConstrained: false,
    };
  }

  const currentRate = input.currentCustomerRate;
  const availableAdditionalDiscount = roundRate(
    Math.max(0, currentRate - ordinarySuggestedRate),
  );
  let suggestedRate = roundRate(Math.min(currentRate, ordinarySuggestedRate));
  let outcome: RetentionPricingOutcome = "standard";

  if (input.retentionArrearsPast12Months === true) {
    suggestedRate = roundRate(currentRate);
    outcome = "no_further_discount";
  } else if (input.retentionArrearsHardship18Months === true) {
    suggestedRate = roundRate(currentRate - availableAdditionalDiscount * 0.6);
    outcome = "partial_additional_discount";
  }

  const requestedRateConstrained =
    requestedRate != null && requestedRate < suggestedRate;

  return {
    suggestedRate,
    finalDisplayRate:
      requestedRate != null && !requestedRateConstrained
        ? requestedRate
        : suggestedRate,
    availableAdditionalDiscount,
    outcome,
    requestedRateConstrained,
  };
}
