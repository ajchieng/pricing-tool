import type { DemoArea } from "./types";

type Row = Record<string, unknown>;
const object = (value: unknown): value is Row =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || finite(value);
const text = (value: unknown) => typeof value === "string";
function assert(condition: unknown): asserts condition {
  if (!condition)
    throw new Error("The saved pricing result is incomplete or unreadable.");
}
function numericFields(value: Row, keys: string[], nullable = true) {
  for (const key of keys)
    assert(nullable ? nullableNumber(value[key]) : finite(value[key]));
}
function textFields(value: Row, keys: string[]) {
  for (const key of keys) assert(text(value[key]));
}
function objectArray(value: unknown): Row[] {
  assert(Array.isArray(value) && value.every(object));
  return value;
}

/** Validate the saved-render contract without recalculating historical pricing. */
export function assertDemoResultShape(area: DemoArea, value: unknown): void {
  assert(object(value));
  textFields(value, ["approvalLevel", "pricingBasis", "explanationText"]);
  assert(typeof value.approvalRequired === "boolean");
  numericFields(value, [
    "finalDisplayRate",
    "suggestedRate",
    "monthlyRepayment",
    "requestedRate",
    "floorRate",
    "topRate",
  ]);
  numericFields(
    value,
    ["scoreDiscountPct", "discountBlockedByFloorPct"],
    false,
  );
  for (const warning of objectArray(value.warnings)) {
    textFields(warning, ["code", "message", "severity"]);
  }
  for (const reason of objectArray(value.approvalReasons)) {
    textFields(reason, ["level", "message"]);
  }
  if (value.customerScore !== null) {
    assert(object(value.customerScore));
    const score = value.customerScore;
    textFields(score, ["band", "pricingBasis"]);
    numericFields(
      score,
      [
        "score",
        "discountThresholdScore",
        "maxDiscountPct",
        "scoreDiscountPct",
        "pricingAdjustment",
      ],
      false,
    );
    numericFields(score, ["discountEntitlementPct"]);
    for (const factor of objectArray(score.factors)) {
      textFields(factor, ["key", "label", "category", "reason"]);
      numericFields(factor, ["weight", "score", "weightedPoints"], false);
    }
  }
  assert(object(value.policySnapshot));
  assert(value.policySnapshot.vertical === area);
  textFields(value.policySnapshot, [
    "bundleToken",
    "componentValueHash",
    "capturedAt",
  ]);
  assert(object(value.profitability));
  const pnl = value.profitability;
  numericFields(pnl, [
    "customerRate",
    "costOfFunds",
    "commissions",
    "otherIncome",
    "expenses",
    "profitBeforeTax",
    "tax",
    "profitAfterTax",
    "returnOnAssets",
  ]);
  assert(object(pnl.feeIncome));
  numericFields(
    pnl.feeIncome,
    [
      "standardUpfrontFee",
      "chargedUpfrontFee",
      "monthlyFee",
      "firstYearFeeIncome",
    ],
    false,
  );
  if (pnl.capitalAllocation !== null) {
    assert(object(pnl.capitalAllocation));
    const capital = pnl.capitalAllocation;
    numericFields(
      capital,
      [
        "drawnExposure",
        "undrawnExposure",
        "creditConversionFactorPct",
        "riskWeightPct",
        "derivedRiskWeightPct",
        "capitalRatioPct",
        "regulatoryExposure",
        "riskWeightedAssets",
        "allocatedCapital",
      ],
      false,
    );
    numericFields(capital, ["returnOnEquity"]);
    textFields(capital, [
      "classificationCode",
      "classificationLabel",
      "classificationBasis",
    ]);
    assert(
      typeof capital.classificationConfirmed === "boolean" &&
        Array.isArray(capital.warnings),
    );
  }
  assert(object(pnl.expectedLoss));
  textFields(pnl.expectedLoss, ["status", "basis"]);
  numericFields(pnl.expectedLoss, [
    "riskOnlyScore",
    "expectedCreditLossAmount",
    "effectiveExpectedCreditLossAmount",
    "exposureAtDefaultAmount",
  ]);
  if (area === "home") {
    numericFields(value, [
      "lvr",
      "cardedRate",
      "cardedComparisonRate",
      "fortnightlyRepayment",
    ]);
    assert(object(value.margin));
    numericFields(value.margin, [
      "customerRate",
      "estimatedCostOfFunds",
      "estimatedMargin",
      "targetMargin",
      "hardMinimumMargin",
    ]);
    textFields(value.margin, ["status"]);
    for (const adjustment of objectArray(value.appliedAdjustments)) {
      textFields(adjustment, ["name", "ruleType", "reason"]);
      numericFields(adjustment, ["amount"], false);
    }
  } else {
    numericFields(value, ["baseRate"], false);
    for (const component of objectArray(value.components)) {
      textFields(component, ["key", "label", "reason"]);
      numericFields(component, ["amount"], false);
    }
    if (area === "personal") {
      assert(object(value.affordability));
      textFields(value.affordability, ["status"]);
      numericFields(value.affordability, [
        "monthlyRepayment",
        "monthlySurplus",
        "repaymentToSurplusPct",
      ]);
    } else {
      assert(
        object(value.cashFlow) &&
          object(value.security) &&
          object(value.margin),
      );
      textFields(value.cashFlow, ["band"]);
      numericFields(value.cashFlow, [
        "debtServiceCoverRatio",
        "totalAnnualDebtService",
      ]);
      numericFields(value.security, ["securityCoverageRatio", "securityValue"]);
      objectArray(value.security.securities);
      numericFields(value.margin, [
        "estimatedMargin",
        "costOfFunds",
        "targetMargin",
        "hardMinimumMargin",
      ]);
      textFields(value.margin, ["status"]);
    }
  }
}

/** Completeness for acceptance, separate from credit-risk and classification review gates. */
export function canAcceptDemoFinancials(value: unknown): boolean {
  if (
    !object(value) ||
    !finite(value.finalDisplayRate) ||
    value.finalDisplayRate < 0 ||
    !object(value.profitability)
  )
    return false;
  const pnl = value.profitability;
  if (
    ![
      "profitBeforeTax",
      "tax",
      "profitAfterTax",
      "costOfFunds",
      "commissions",
      "otherIncome",
      "expenses",
    ].every((key) => finite(pnl[key]))
  )
    return false;
  const capital = pnl.capitalAllocation;
  return (
    object(capital) &&
    finite(capital.allocatedCapital) &&
    capital.allocatedCapital >= 0 &&
    (capital.allocatedCapital === 0 || finite(capital.returnOnEquity))
  );
}
