export const CUSTOMER_RATE_SCENARIO_STEP = 0.01;
const CUSTOMER_RATE_SCENARIO_SPAN = 4;

export type CustomerRateScenarioBounds = {
  min: number;
  max: number;
  recommendation: number;
  floor: number | null;
  top: number | null;
};

export type CustomerRateScenarioState<TResult> = {
  rate: number;
  baselineRate: number;
  baselineResult: TResult;
  bounds: CustomerRateScenarioBounds;
};

function roundCustomerRate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function customerRateScenarioRequestKey(
  contextKey: string,
  scenarioRate: number | null,
): string {
  return JSON.stringify([
    contextKey,
    scenarioRate == null ? null : roundCustomerRate(scenarioRate),
  ]);
}

export function parseCustomerRateScenarioDraft(
  draft: string,
  bounds: Pick<CustomerRateScenarioBounds, "min" | "max">,
): number | null {
  if (!draft.trim()) return null;
  const parsed = Number(draft);
  if (!Number.isFinite(parsed)) return null;
  return roundCustomerRate(Math.min(bounds.max, Math.max(bounds.min, parsed)));
}

export function customerRatesEqual(
  left: number | null | undefined,
  right: number | null | undefined,
): boolean {
  return left != null &&
    right != null &&
    Number.isFinite(left) &&
    Number.isFinite(right)
    ? Math.abs(roundCustomerRate(left) - roundCustomerRate(right)) < 0.001
    : left == null && right == null;
}

export function customerRateScenarioBounds({
  recommendation,
  currentRate,
  floor,
  top,
}: {
  recommendation: number;
  currentRate: number;
  floor?: number | null;
  top?: number | null;
}): CustomerRateScenarioBounds {
  const roundedRecommendation = roundCustomerRate(recommendation);
  const roundedCurrent = roundCustomerRate(currentRate);
  return {
    min: roundCustomerRate(
      Math.max(
        0,
        Math.min(
          roundedRecommendation - CUSTOMER_RATE_SCENARIO_SPAN,
          roundedCurrent,
        ),
      ),
    ),
    max: roundCustomerRate(
      Math.max(
        roundedRecommendation + CUSTOMER_RATE_SCENARIO_SPAN,
        roundedCurrent,
      ),
    ),
    recommendation: roundedRecommendation,
    floor: floor == null ? null : roundCustomerRate(floor),
    top: top == null ? null : roundCustomerRate(top),
  };
}

export function startCustomerRateScenario<TResult>({
  rate,
  baselineRate,
  baselineResult,
  recommendation,
  floor,
  top,
}: {
  rate: number;
  baselineRate: number;
  baselineResult: TResult;
  recommendation: number;
  floor?: number | null;
  top?: number | null;
}): CustomerRateScenarioState<TResult> | null {
  const roundedRate = roundCustomerRate(rate);
  const roundedBaseline = roundCustomerRate(baselineRate);
  if (customerRatesEqual(roundedRate, roundedBaseline)) return null;

  const bounds = customerRateScenarioBounds({
    recommendation,
    currentRate: roundedBaseline,
    floor,
    top,
  });

  return {
    rate: Math.min(bounds.max, Math.max(bounds.min, roundedRate)),
    baselineRate: roundedBaseline,
    baselineResult,
    bounds,
  };
}

export function updateCustomerRateScenario<TResult>(
  scenario: CustomerRateScenarioState<TResult>,
  rate: number,
): CustomerRateScenarioState<TResult> | null {
  const roundedRate = roundCustomerRate(rate);
  if (customerRatesEqual(roundedRate, scenario.baselineRate)) return null;
  return {
    ...scenario,
    rate: Math.min(
      scenario.bounds.max,
      Math.max(scenario.bounds.min, roundedRate),
    ),
  };
}

export function customerRateMarkerPosition(
  rate: number,
  bounds: Pick<CustomerRateScenarioBounds, "min" | "max">,
): number | null {
  if (rate < bounds.min || rate > bounds.max || bounds.max <= bounds.min) {
    return null;
  }
  return ((rate - bounds.min) / (bounds.max - bounds.min)) * 100;
}
