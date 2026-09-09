"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RateInput } from "@/components/ui/inputs";
import {
  CUSTOMER_RATE_SCENARIO_STEP,
  customerRateMarkerPosition,
  customerRatesEqual,
  parseCustomerRateScenarioDraft,
  type CustomerRateScenarioBounds,
} from "@/components/quotes/customer-rate-scenario";
import { fmtPct } from "@/lib/format";

type Marker = {
  label: string;
  rate: number;
  tone: string;
};

type CustomerRateScenarioControlProps = {
  rate: number;
  bounds: CustomerRateScenarioBounds;
  active: boolean;
  baselineRate: number | null;
  canChangeRate?: boolean;
  canApply: boolean;
  contextKey: string;
  hasPricingError?: boolean;
  effectiveRate?: number | null;
  onRateChange: (rate: number) => void;
  onApply: () => void;
  onReset: () => void;
};

export function CustomerRateScenarioControl(
  props: CustomerRateScenarioControlProps,
) {
  const resetKey = JSON.stringify([
    props.contextKey,
    Boolean(props.hasPricingError),
  ]);
  return <CustomerRateScenarioControlState key={resetKey} {...props} />;
}

function CustomerRateScenarioControlState({
  rate,
  bounds,
  active,
  baselineRate,
  canChangeRate = true,
  canApply,
  hasPricingError = false,
  effectiveRate,
  onRateChange,
  onApply,
  onReset,
}: CustomerRateScenarioControlProps) {
  const [exactDraft, setExactDraft] = useState(rate.toFixed(2));
  const [exactEditing, setExactEditing] = useState(false);
  const [pendingApplyRate, setPendingApplyRate] = useState<number | null>(null);
  const appliedPendingRateRef = useRef<number | null>(null);

  useEffect(() => {
    if (pendingApplyRate == null || hasPricingError) return;

    const pendingRateIsCurrent =
      active && customerRatesEqual(rate, pendingApplyRate);
    if (
      pendingRateIsCurrent &&
      canApply &&
      !customerRatesEqual(appliedPendingRateRef.current, pendingApplyRate)
    ) {
      appliedPendingRateRef.current = pendingApplyRate;
      onApply();
    }
  }, [active, canApply, hasPricingError, onApply, pendingApplyRate, rate]);

  const cancelPendingApply = () => {
    appliedPendingRateRef.current = null;
    setPendingApplyRate(null);
  };

  const displayedExactDraft = exactEditing ? exactDraft : rate.toFixed(2);
  const draftRate = parseCustomerRateScenarioDraft(displayedExactDraft, bounds);
  const draftMatchesCurrent = customerRatesEqual(draftRate, rate);
  const draftReturnsToBaseline = customerRatesEqual(draftRate, baselineRate);
  const canSubmitDraft =
    exactEditing &&
    draftRate != null &&
    !draftReturnsToBaseline &&
    (draftMatchesCurrent ? active && canApply : canChangeRate);
  const canSubmitCurrent = !exactEditing && active && canApply;
  const applyingAfterPricing = pendingApplyRate != null;
  const scenarioInputDisabled = !canChangeRate || applyingAfterPricing;

  const changeScenarioRate = (nextRate: number) => {
    cancelPendingApply();
    setExactEditing(false);
    setExactDraft(nextRate.toFixed(2));
    onRateChange(nextRate);
  };

  const commitExactDraft = (): number | null => {
    const nextRate = parseCustomerRateScenarioDraft(
      displayedExactDraft,
      bounds,
    );
    if (nextRate == null) {
      cancelPendingApply();
      setExactEditing(false);
      setExactDraft(rate.toFixed(2));
      return null;
    }
    setExactEditing(false);
    setExactDraft(nextRate.toFixed(2));
    if (!customerRatesEqual(nextRate, rate)) {
      cancelPendingApply();
      onRateChange(nextRate);
    }
    return nextRate;
  };

  const applyScenarioRate = () => {
    const nextRate = exactEditing
      ? parseCustomerRateScenarioDraft(exactDraft, bounds)
      : rate;
    if (nextRate == null) {
      commitExactDraft();
      return;
    }

    setExactEditing(false);
    setExactDraft(nextRate.toFixed(2));
    if (customerRatesEqual(nextRate, baselineRate)) {
      cancelPendingApply();
      onRateChange(nextRate);
      return;
    }
    if (customerRatesEqual(nextRate, rate) && active && canApply) {
      onApply();
      return;
    }

    appliedPendingRateRef.current = null;
    setPendingApplyRate(nextRate);
    onRateChange(nextRate);
  };
  const markers: Marker[] = [
    {
      label: "Suggested / indicative",
      rate: bounds.recommendation,
      tone: "bg-brand",
    },
    ...(bounds.floor == null
      ? []
      : [{ label: "Policy floor", rate: bounds.floor, tone: "bg-ok" }]),
    ...(bounds.top == null
      ? []
      : [{ label: "Top rate", rate: bounds.top, tone: "bg-warn" }]),
  ];
  const visibleMarkers = markers
    .map((marker) => ({
      ...marker,
      position: customerRateMarkerPosition(marker.rate, bounds),
    }))
    .filter(
      (
        marker,
      ): marker is Marker & {
        position: number;
      } => marker.position != null,
    );
  const effectiveRateDiffers =
    active &&
    effectiveRate != null &&
    Math.abs(effectiveRate - rate) >= CUSTOMER_RATE_SCENARIO_STEP / 2;

  return (
    <section
      aria-label="Customer rate profitability scenario"
      className="mt-3 border-y border-border bg-panel/45 px-3 py-3.5"
      data-testid="customer-rate-scenario"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Customer-rate scenario
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-muted">
            Test the customer rate against live profitability and approval.
          </p>
        </div>
        <span
          className={`text-xs font-semibold ${
            active ? "text-warn" : "text-muted"
          }`}
          aria-live="polite"
        >
          {applyingAfterPricing
            ? "Pricing scenario…"
            : active
              ? "Preview only · not saved"
              : canChangeRate
                ? "Current quote rate"
                : "Updating current quote…"}
        </span>
      </div>

      <div className="mt-4">
        <label htmlFor="customer-rate-scenario-range" className="sr-only">
          Scenario customer rate
        </label>
        <div className="relative pb-5">
          <input
            id="customer-rate-scenario-range"
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={CUSTOMER_RATE_SCENARIO_STEP}
            value={rate}
            onChange={(event) => {
              changeScenarioRate(Number(event.target.value));
            }}
            disabled={scenarioInputDisabled}
            className="h-11 w-full cursor-pointer accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-valuetext={`${rate.toFixed(2)} percent`}
          />
          {visibleMarkers.map((marker) => (
            <span
              key={`${marker.label}-${marker.rate}`}
              aria-hidden
              className={`absolute bottom-3 h-2 w-0.5 -translate-x-1/2 ${marker.tone}`}
              style={{ left: `${marker.position}%` }}
            />
          ))}
        </div>
        <div className="-mt-2 flex justify-between text-[11px] text-faint">
          <span className="tnum">{fmtPct(bounds.min)}</span>
          <span className="tnum">{fmtPct(bounds.max)}</span>
        </div>
        {visibleMarkers.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            {visibleMarkers.map((marker) => (
              <li
                key={`${marker.label}-legend-${marker.rate}`}
                className="flex items-center gap-1.5"
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${marker.tone}`}
                />
                {marker.label}{" "}
                <span className="tnum text-ink">{fmtPct(marker.rate)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,9rem)_1fr] sm:items-end">
        <div>
          <label
            htmlFor="customer-rate-scenario-exact"
            className="mb-1 block text-xs font-medium text-ink"
          >
            Exact scenario rate
          </label>
          <ExactScenarioRateInput
            id="customer-rate-scenario-exact"
            draft={displayedExactDraft}
            onDraftChange={(value) => {
              cancelPendingApply();
              setExactDraft(value);
              setExactEditing(value !== rate.toFixed(2));
            }}
            onCommit={commitExactDraft}
            disabled={scenarioInputDisabled}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onPointerDown={(event) => {
              if (exactEditing) event.preventDefault();
            }}
            onClick={applyScenarioRate}
            disabled={
              applyingAfterPricing || (!canSubmitDraft && !canSubmitCurrent)
            }
            aria-busy={applyingAfterPricing}
            title={
              exactEditing && draftRate == null
                ? "Enter a valid scenario rate"
                : active && !canApply
                  ? "Wait for the latest scenario pricing result"
                  : undefined
            }
          >
            {applyingAfterPricing
              ? "Pricing scenario…"
              : "Apply to requested rate"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              cancelPendingApply();
              setExactEditing(false);
              setExactDraft((baselineRate ?? rate).toFixed(2));
              onReset();
            }}
            disabled={!active}
          >
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden />
            Reset
          </Button>
        </div>
      </div>

      {effectiveRateDiffers && (
        <p className="mt-2 text-xs leading-5 text-warn" role="status">
          Entered scenario {fmtPct(rate)}; effective policy-constrained customer
          rate {fmtPct(effectiveRate)}.
        </p>
      )}
    </section>
  );
}

function ExactScenarioRateInput({
  id,
  draft,
  disabled,
  onDraftChange,
  onCommit,
}: {
  id: string;
  draft: string;
  disabled: boolean;
  onDraftChange: (draft: string) => void;
  onCommit: () => number | null;
}) {
  return (
    <RateInput
      id={id}
      value={draft}
      onChange={onDraftChange}
      onBlur={() => {
        onCommit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      disabled={disabled}
      aria-label="Exact scenario customer rate"
    />
  );
}
