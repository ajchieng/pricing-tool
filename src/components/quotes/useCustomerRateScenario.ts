"use client";

import { useEffect, useRef, useState } from "react";
import {
  customerRateScenarioBounds,
  startCustomerRateScenario,
  updateCustomerRateScenario,
  type CustomerRateScenarioState,
} from "@/components/quotes/customer-rate-scenario";

export function useCustomerRateScenario<TResult>({
  result,
  recommendationRate,
  formalRate,
  floorRate,
  topRate,
  contextKey,
}: {
  result: TResult | null;
  recommendationRate: number | null;
  formalRate: number | null;
  floorRate: number | null;
  topRate: number | null;
  contextKey: string;
}) {
  const [scenario, setScenario] =
    useState<CustomerRateScenarioState<TResult> | null>(null);
  const previousContextKey = useRef(contextKey);

  useEffect(() => {
    if (previousContextKey.current === contextKey) return;
    previousContextKey.current = contextKey;
    setScenario(null);
  }, [contextKey]);

  const baselineRate = formalRate ?? recommendationRate;

  const changeRate = (rate: number) => {
    if (!Number.isFinite(rate)) return;
    setScenario((current) => {
      if (current) return updateCustomerRateScenario(current, rate);
      if (!result || recommendationRate == null || baselineRate == null) {
        return null;
      }
      return startCustomerRateScenario({
        rate,
        baselineRate,
        baselineResult: result,
        recommendation: recommendationRate,
        floor: floorRate,
        top: topRate,
      });
    });
  };

  return {
    active: scenario != null,
    rate: scenario?.rate ?? baselineRate,
    baselineRate,
    baselineResult: scenario?.baselineResult ?? null,
    bounds:
      scenario?.bounds ??
      (result && recommendationRate != null && baselineRate != null
        ? customerRateScenarioBounds({
            recommendation: recommendationRate,
            currentRate: baselineRate,
            floor: floorRate,
            top: topRate,
          })
        : null),
    changeRate,
    reset: () => setScenario(null),
  };
}
