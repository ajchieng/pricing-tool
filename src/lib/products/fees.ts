// Structured product fee schedule. Display-only — these values never enter any
// pricing, score or margin calculation.

export interface ProductFees {
  establishmentFee: number | null;
  monthlyServiceFee: number | null;
  loanContractVariationFee: number | null;
  defaultFee: number | null;
  titleSearchFee: number | null;
  dischargeFee: number | null;
  progressPaymentFee: number | null;
}

export interface PersonalProductFees {
  establishmentFee?: number | null;
  monthlyServiceFee?: number | null;
  onlineRedrawFee?: number | null;
  branchRedrawFee?: number | null;
  defaultFee?: number | null;
}

export type ReferenceFeeItem = {
  label: string;
  value: string;
};

const FEE_LABELS: {
  key: keyof ProductFees;
  label: string;
  suffix?: string;
}[] = [
  { key: "establishmentFee", label: "Establishment" },
  { key: "monthlyServiceFee", label: "Monthly service", suffix: "/mo" },
  { key: "loanContractVariationFee", label: "Loan variation" },
  { key: "defaultFee", label: "Default" },
  { key: "titleSearchFee", label: "Title search" },
  { key: "dischargeFee", label: "Discharge" },
  { key: "progressPaymentFee", label: "Progress payment", suffix: "/drawdown" },
];

/** Non-null fees as `{ label, value }` rows, formatted as AUD. */
export function productFeeItems(fees: ProductFees): ReferenceFeeItem[] {
  return FEE_LABELS.filter(({ key }) => fees[key] != null).map(
    ({ key, label, suffix }) => {
      const amount = fees[key] as number;
      const formatted = amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return { label, value: `$${formatted}${suffix ?? ""}` };
    },
  );
}

const PERSONAL_FEE_LABELS: Array<{
  key: keyof PersonalProductFees;
  label: string;
  suffix?: string;
}> = [
  { key: "establishmentFee", label: "Establishment" },
  { key: "monthlyServiceFee", label: "Monthly service", suffix: "/mo" },
  { key: "onlineRedrawFee", label: "Online redraw" },
  { key: "branchRedrawFee", label: "Branch redraw" },
  { key: "defaultFee", label: "Default" },
];

export function personalProductFeeItems(
  fees: PersonalProductFees,
): ReferenceFeeItem[] {
  return PERSONAL_FEE_LABELS.filter(({ key }) => fees[key] != null).map(
    ({ key, label, suffix }) => {
      const amount = fees[key] as number;
      const formatted = amount.toLocaleString("en-AU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return { label, value: `$${formatted}${suffix ?? ""}` };
    },
  );
}
