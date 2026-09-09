import { Line, RailSegment } from "@/components/result/shared";
import { fmtPct, fmtSignedPct } from "@/lib/format";

// Carded → adjustments → Suggested Rate → customer rate, with the rate path
// visualised so the discount is legible at a glance.

export function PricingBreakdownCard({
  cardedRate,
  cardedComparisonRate,
  suggestedRate,
  floorRate,
  topRate,
  requestedRate,
  finalDisplayRate,
  totalAdjustment,
  pricingBasis,
  scoreDiscountPct,
  discountBlockedByFloorPct,
  requestedBelowSuggested,
  requestedRateLabel = "Requested rate",
  bare = false,
}: {
  cardedRate: number | null;
  cardedComparisonRate: number | null;
  suggestedRate: number | null;
  floorRate: number | null;
  topRate: number | null;
  requestedRate: number | null;
  finalDisplayRate: number | null;
  totalAdjustment: number;
  pricingBasis: "legacy_signed_adjustment" | "discount_entitlement_v1";
  scoreDiscountPct: number;
  discountBlockedByFloorPct: number;
  requestedBelowSuggested: boolean;
  requestedRateLabel?: string;
  bare?: boolean;
}) {
  const usingRequested = requestedRate != null;
  const hasBand = floorRate != null && topRate != null;
  const discountOnly = pricingBasis === "discount_entitlement_v1";
  return (
    <RailSegment title={bare ? undefined : "Pricing Breakdown"} bare={bare}>
      <RatePath
        cardedRate={cardedRate}
        suggestedRate={suggestedRate}
        requestedRate={requestedRate}
        finalDisplayRate={finalDisplayRate}
        floorRate={floorRate}
        topRate={topRate}
        requestedRateLabel={requestedRateLabel}
        discountOnly={discountOnly}
      />
      <Line
        label="Starting carded rate"
        value={fmtPct(cardedRate)}
        hint="Carded rate for the matched LVR band."
      />
      {cardedComparisonRate != null && (
        <Line
          label="Carded comparison rate"
          value={fmtPct(cardedComparisonRate)}
          hint="Incl. fees — for context only; not used in pricing."
        />
      )}
      {hasBand && (
        <Line
          label="Score-100 rate"
          value={<span className="text-ok">{fmtPct(floorRate)}</span>}
          hint="Theoretical rate at a customer score of 100; active model inputs may not reach that score."
        />
      )}
      <Line
        label="Suggested rate"
        value={fmtPct(suggestedRate)}
        hint={
          hasBand
            ? discountOnly
              ? "Starting rate less the earned discounts."
              : "Recommended rate within the legacy floor–top band."
            : undefined
        }
      />
      {hasBand && !discountOnly && (
        <Line
          label="Top rate"
          value={<span className="text-warn">{fmtPct(topRate)}</span>}
          hint="Highest rate the customer score can reach (max loading)."
        />
      )}
      {usingRequested && (
        <Line
          label={requestedRateLabel}
          value={fmtPct(requestedRate)}
          tone={requestedBelowSuggested ? "text-warn" : "text-ink"}
        />
      )}
      <Line
        label={discountOnly ? "Customer score discount" : "Legacy adjustment"}
        value={
          discountOnly
            ? `${scoreDiscountPct.toFixed(2)}%`
            : fmtSignedPct(totalAdjustment)
        }
        tone={discountOnly && scoreDiscountPct > 0 ? "text-ok" : "text-ink"}
      />
      {discountOnly && discountBlockedByFloorPct > 0 && (
        <Line
          label="Discount blocked by floor"
          value={`${discountBlockedByFloorPct.toFixed(2)}%`}
          tone="text-warn"
        />
      )}
      <div className="mt-1.5 border-t border-border pt-1.5">
        <Line
          label="Customer rate"
          value={
            <span className="font-semibold">{fmtPct(finalDisplayRate)}</span>
          }
          hint="Requested rate if provided, otherwise the suggested rate."
        />
      </div>
    </RailSegment>
  );
}

function RatePath({
  cardedRate,
  suggestedRate,
  requestedRate,
  finalDisplayRate,
  floorRate,
  topRate,
  requestedRateLabel,
  discountOnly,
}: {
  cardedRate: number | null;
  suggestedRate: number | null;
  requestedRate: number | null;
  finalDisplayRate: number | null;
  floorRate: number | null;
  topRate: number | null;
  requestedRateLabel: string;
  discountOnly: boolean;
}) {
  const rates = [
    cardedRate,
    suggestedRate,
    requestedRate,
    finalDisplayRate,
  ].filter((value): value is number => value != null && !Number.isNaN(value));
  if (rates.length === 0) return null;

  const hasBand = floorRate != null && topRate != null;
  // Scale spans the floor–top band plus any marker that falls outside it (e.g. a
  // requested rate below the floor), so nothing is clipped.
  const scaleValues = [...rates, floorRate, topRate].filter(
    (value): value is number => value != null && !Number.isNaN(value),
  );
  const low = Math.min(...scaleValues) - 0.1;
  const high = Math.max(...scaleValues) + 0.1;
  const range = Math.max(0.1, high - low);
  const position = (value: number | null) =>
    value == null ? 50 : ((value - low) / range) * 100;

  const markers = [
    { label: "Carded", value: cardedRate, className: "bg-muted" },
    { label: "Suggested", value: suggestedRate, className: "bg-brand" },
    {
      label: requestedRateLabel.replace(/ rate$/i, ""),
      value: requestedRate,
      className: "bg-warn",
    },
    { label: "Customer", value: finalDisplayRate, className: "bg-ink" },
  ].filter((marker) => marker.value != null);

  return (
    <div className="mb-3 rounded-lg bg-panel/50 px-3 py-2.5">
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>
          {hasBand ? "Score-100 rate" : "Lower rate"}
          {hasBand && (
            <span className="tnum ml-1 text-ok">{fmtPct(floorRate)}</span>
          )}
        </span>
        <span>
          {hasBand ? (discountOnly ? "Starting rate" : "Top") : "Higher rate"}
          {hasBand && (
            <span className="tnum ml-1 text-warn">{fmtPct(topRate)}</span>
          )}
        </span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-border">
        {hasBand && (
          <div
            className="absolute top-0 h-2 rounded-full bg-brand/20"
            style={{
              left: `${position(floorRate)}%`,
              width: `${Math.max(0, position(topRate) - position(floorRate))}%`,
            }}
            aria-hidden
          />
        )}
        {markers.map((marker) => (
          <div
            key={marker.label}
            className={`absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${marker.className}`}
            style={{ left: `${position(marker.value)}%` }}
            title={`${marker.label}: ${fmtPct(marker.value)}`}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted">
        {markers.map((marker) => (
          <div key={marker.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${marker.className}`}
            />
            <span>
              {marker.label}:{" "}
              <span className="tnum text-ink">{fmtPct(marker.value)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
