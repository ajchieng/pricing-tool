const POLICY_PERCENT_SCALE = 1_000_000;

export function policyPercentUnits(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Policy percentage must be finite.");
  }

  return Math.round(value * POLICY_PERCENT_SCALE);
}

export function policyPercentDifference(left: number, right: number): number {
  return (
    (policyPercentUnits(left) - policyPercentUnits(right)) /
    POLICY_PERCENT_SCALE
  );
}

export function isPolicyPercentBelow(
  actual: number,
  threshold: number,
): boolean {
  return policyPercentUnits(actual) < policyPercentUnits(threshold);
}
