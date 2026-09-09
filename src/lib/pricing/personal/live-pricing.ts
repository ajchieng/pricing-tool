type PersonalLivePricingCandidate = {
  productId?: number | null;
  loanAmount: number;
  loanTermMonths: number;
  customerStream?: string | null;
  currentCustomerRate?: number | null;
  retentionArrearsHardship18Months?: boolean | null;
  retentionArrearsPast12Months?: boolean | null;
};

export function isPersonalLivePricingReady(
  input: PersonalLivePricingCandidate,
): boolean {
  if (!(input.loanAmount > 0 && input.loanTermMonths > 0)) return false;
  if (input.customerStream !== "retention") return true;
  return (
    input.currentCustomerRate != null &&
    input.retentionArrearsHardship18Months != null &&
    (input.retentionArrearsHardship18Months === false ||
      input.retentionArrearsPast12Months != null)
  );
}
