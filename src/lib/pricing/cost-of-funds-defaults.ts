import type { CommercialFacilityType } from "@/lib/pricing/commercial/types";
import type {
  PersonalMarginSettingConfig,
  PersonalProductSecurityType,
} from "@/lib/pricing/personal/types";
import type {
  LoanPurpose,
  MarginSettingConfig,
  RateType,
} from "@/lib/pricing/types";

export type HomeCostOfFundsDefaults = Array<
  Pick<
    MarginSettingConfig,
    | "id"
    | "productId"
    | "loanPurpose"
    | "rateType"
    | "estimatedCostOfFunds"
    | "active"
  >
>;

export type PersonalCostOfFundsDefaults = Array<
  Pick<
    PersonalMarginSettingConfig,
    | "id"
    | "securityType"
    | "personalProductId"
    | "estimatedCostOfFunds"
    | "active"
  >
>;

export type CommercialCostOfFundsDefaults = Partial<
  Record<CommercialFacilityType, number>
>;

export function selectHomeMarginSetting<
  T extends HomeCostOfFundsDefaults[number],
>(
  rows: readonly T[],
  productId: number | null,
  loanPurpose: LoanPurpose,
  rateType: RateType,
): T | null {
  const candidates = rows
    .filter((row) => row.active)
    .filter((row) => row.productId == null || row.productId === productId)
    .filter((row) => row.loanPurpose == null || row.loanPurpose === loanPurpose)
    .filter((row) => row.rateType == null || row.rateType === rateType);

  const specificity = (row: T) =>
    (row.productId != null ? 4 : 0) +
    (row.loanPurpose != null ? 2 : 0) +
    (row.rateType != null ? 1 : 0);
  candidates.sort(
    (left, right) =>
      specificity(right) - specificity(left) || left.id - right.id,
  );
  return candidates[0] ?? null;
}

export function homeCostOfFundsDefault(
  rows: HomeCostOfFundsDefaults,
  productId: number | null,
  loanPurpose: LoanPurpose,
  rateType: RateType,
): number | null {
  return (
    selectHomeMarginSetting(rows, productId, loanPurpose, rateType)
      ?.estimatedCostOfFunds ?? null
  );
}

export function selectPersonalMarginSetting<
  T extends PersonalCostOfFundsDefaults[number],
>(
  rows: readonly T[],
  personalProductId: number | null,
  securityType: PersonalProductSecurityType,
): T | null {
  const candidates = rows
    .filter((row) => row.active)
    .filter(
      (row) => row.securityType == null || row.securityType === securityType,
    )
    .filter(
      (row) =>
        row.personalProductId == null ||
        (personalProductId != null &&
          row.personalProductId === personalProductId),
    );

  const specificity = (row: T) =>
    (row.personalProductId != null ? 2 : 0) +
    (row.securityType != null ? 1 : 0);
  candidates.sort(
    (left, right) =>
      specificity(right) - specificity(left) || left.id - right.id,
  );
  return candidates[0] ?? null;
}

export function personalCostOfFundsDefault(
  rows: PersonalCostOfFundsDefaults,
  personalProductId: number | null,
  securityType: PersonalProductSecurityType,
): number | null {
  return (
    selectPersonalMarginSetting(rows, personalProductId, securityType)
      ?.estimatedCostOfFunds ?? null
  );
}

export function costOfFundsDefaultText(
  value: number | null | undefined,
): string {
  return value == null ? "" : String(value);
}
