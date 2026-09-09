export type NumericValue = number;

export interface ComparableFee {
  feeType: string;
  name: string;
  amount: NumericValue | null;
  frequency: string | null;
}

export interface FeeSummary {
  upfront: number;
  annualPeriodic: number;
  unannualisedPeriodicCount: number;
  otherFeeCount: number;
}

export function monthlyPrincipalAndInterestRepayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0 || annualRatePercent < 0) return 0;
  const payments = termYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return principal / payments;
  const growth = (1 + monthlyRate) ** payments;
  return principal * ((monthlyRate * growth) / (growth - 1));
}

function annualMultiplier(frequency: string | null): number | null {
  if (!frequency) return null;
  const multipliers: Record<string, number> = {
    P1D: 365,
    P1W: 52,
    P1M: 12,
    P3M: 4,
    P6M: 2,
    P1Y: 1,
  };
  return multipliers[frequency.toUpperCase()] ?? null;
}

export function summariseFees(fees: ComparableFee[]): FeeSummary {
  let upfront = 0;
  let annualPeriodic = 0;
  let unannualisedPeriodicCount = 0;
  let otherFeeCount = 0;
  for (const fee of fees) {
    const amount = fee.amount ?? null;
    const upfrontLike =
      fee.feeType === "UPFRONT" ||
      /(?:application|establishment) fee/i.test(fee.name);
    if (upfrontLike) {
      if (amount !== null) upfront += amount;
      continue;
    }
    if (fee.feeType === "PERIODIC") {
      const multiplier = annualMultiplier(fee.frequency);
      if (amount !== null && multiplier !== null) {
        annualPeriodic += amount * multiplier;
      } else {
        unannualisedPeriodicCount += 1;
      }
      continue;
    }
    otherFeeCount += 1;
  }
  return { upfront, annualPeriodic, unannualisedPeriodicCount, otherFeeCount };
}

export function hasStructuredFeature(
  features: Array<{ featureType: string }>,
  type: string,
): boolean {
  return features.some((feature) => feature.featureType === type);
}
