import type { CommercialPricingResult } from "./commercial/types";
import type { PersonalPricingResult } from "./personal/types";
import type { PricingResult, WarningItem } from "./types";

export type QuotePriceabilityIssue = {
  code:
    | "authoritative_product_missing"
    | "authoritative_rate_missing"
    | "authoritative_rate_invalid"
    | "structural_policy_breach";
  message: string;
};

const HOME_STRUCTURAL_WARNING_CODES = new Set([
  "loan_amount_invalid",
  "property_value_invalid",
  "loan_exceeds_property",
  "product_missing",
  "product_inactive",
  "product_scenario_mismatch",
  "below_min_loan",
  "above_max_loan",
  "lvr_exceeds_max",
  "missing_rate",
]);

const PERSONAL_STRUCTURAL_WARNING_CODES = new Set([
  "personal_limit_breach",
  "personal_product_fallback",
]);

const COMMERCIAL_STRUCTURAL_WARNING_CODES = new Set([
  "commercial_limit_breach",
  "commercial_product_fallback",
]);

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function structuralWarningIssues(
  warnings: WarningItem[],
  structuralCodes: ReadonlySet<string>,
): QuotePriceabilityIssue[] {
  return warnings
    .filter((warning) => structuralCodes.has(warning.code))
    .map((warning) => ({
      code: "structural_policy_breach" as const,
      message: warning.message,
    }));
}

export class UnpriceableQuoteError extends Error {
  readonly code = "QUOTE_UNPRICEABLE";

  constructor(readonly issues: QuotePriceabilityIssue[]) {
    super("The quote does not have a complete authoritative price.");
    this.name = "UnpriceableQuoteError";
  }
}

function assertNoIssues(issues: QuotePriceabilityIssue[]): void {
  if (issues.length > 0) {
    throw new UnpriceableQuoteError(issues);
  }
}

export function assertPriceableHomeResult(result: PricingResult): void {
  const issues = structuralWarningIssues(
    result.warnings,
    HOME_STRUCTURAL_WARNING_CODES,
  );

  if (!finite(result.selectedRateBandId) || result.selectedRateBandId <= 0) {
    issues.push({
      code: "authoritative_rate_missing",
      message: "No authoritative Home product rate band was selected.",
    });
  }
  if (
    !finite(result.lvr) ||
    !finite(result.cardedRate) ||
    !finite(result.suggestedRate) ||
    !finite(result.finalDisplayRate)
  ) {
    issues.push({
      code: "authoritative_rate_invalid",
      message:
        "The authoritative Home pricing result is incomplete or invalid.",
    });
  }

  assertNoIssues(issues);
}

export function assertPriceablePersonalResult(
  result: PersonalPricingResult,
): void {
  const issues = structuralWarningIssues(
    result.warnings,
    PERSONAL_STRUCTURAL_WARNING_CODES,
  );

  if (!finite(result.productId) || result.productId <= 0) {
    issues.push({
      code: "authoritative_product_missing",
      message: "No authoritative Personal loan product and rate were selected.",
    });
  }
  if (
    !finite(result.baseRate) ||
    !finite(result.suggestedRate) ||
    !finite(result.finalDisplayRate) ||
    !finite(result.monthlyRepayment)
  ) {
    issues.push({
      code: "authoritative_rate_invalid",
      message:
        "The authoritative Personal loan pricing result is incomplete or invalid.",
    });
  }

  assertNoIssues(issues);
}

export function assertPriceableCommercialResult(
  result: CommercialPricingResult,
  governedProductId: number | null,
): void {
  const issues = structuralWarningIssues(
    result.warnings,
    COMMERCIAL_STRUCTURAL_WARNING_CODES,
  );

  if (!finite(governedProductId) || governedProductId <= 0) {
    issues.push({
      code: "authoritative_product_missing",
      message:
        "No authoritative Commercial loan product and rate were selected.",
    });
  }
  if (
    !finite(result.baseRate) ||
    !finite(result.indicativeRate) ||
    !finite(result.finalDisplayRate)
  ) {
    issues.push({
      code: "authoritative_rate_invalid",
      message:
        "The authoritative Commercial loan pricing result is incomplete or invalid.",
    });
  }

  assertNoIssues(issues);
}
