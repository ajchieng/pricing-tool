import type { PricingResult } from "@/lib/pricing/types";
import { Line, RailSegment } from "@/components/result/shared";
import { fmtPct, fmtSignedPct } from "@/lib/format";

type Comparison = NonNullable<PricingResult["competitorComparison"]>;

// Where the Suggested Rate sits against the best matching competitor product.

export function MarketComparisonPanel({
  comparison,
  bare = false,
}: {
  comparison: Comparison;
  bare?: boolean;
}) {
  return (
    <RailSegment title={bare ? undefined : "Market comparison"} bare={bare}>
      <MarketGap comparison={comparison} />
      <Line label="Best matching competitor" value={comparison.lenderName} />
      <Line
        label="Advertised rate"
        value={fmtPct(comparison.advertisedRate)}
        tone={comparison.rateGap > 0 ? "text-warn" : "text-ok"}
      />
      <Line label="Comparison rate" value={fmtPct(comparison.comparisonRate)} />
      <Line
        label="Gap to suggested"
        value={fmtSignedPct(comparison.rateGap)}
        tone={comparison.rateGap > 0 ? "text-warn" : "text-ok"}
      />
      <div className="mt-1.5 border-t border-border pt-1.5">
        <Line label="Matched products" value={comparison.matchCount} />
        <p className="mt-1 text-xs text-faint">{comparison.productName}</p>
      </div>
    </RailSegment>
  );
}

function MarketGap({ comparison }: { comparison: Comparison }) {
  const gap = comparison.rateGap;
  const clamped = Math.min(0.5, Math.max(-0.5, gap));
  const position = ((clamped + 0.5) / 1) * 100;
  const isAboveCompetitor = gap > 0;

  return (
    <div className="mb-3 rounded-lg bg-panel/50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted">
            Suggested vs market
          </div>
          <div
            className={`text-sm font-semibold ${
              isAboveCompetitor ? "text-warn" : "text-ok"
            }`}
          >
            {isAboveCompetitor ? "Above competitor" : "At or below competitor"}
          </div>
        </div>
        <div className="tnum text-sm font-semibold text-ink">
          {fmtSignedPct(gap)}
        </div>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-border">
        <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-ink/50" />
        <div
          className={`absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
            isAboveCompetitor ? "bg-warn" : "bg-ok"
          }`}
          style={{ left: `${position}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>Sharper than market</span>
        <span>Market</span>
        <span>Above market</span>
      </div>
    </div>
  );
}
