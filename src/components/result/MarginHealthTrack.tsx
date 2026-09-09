import { fmtPct } from "@/lib/format";
import type { MarginResult } from "@/lib/pricing/types";
import { marginVisual, percentPosition } from "@/lib/quote-visuals";
import { TONE } from "@/lib/tones";

export type MarginHealthAssessment = Pick<
  MarginResult,
  "estimatedMargin" | "targetMargin" | "hardMinimumMargin" | "status"
>;

export function MarginHealthTrack({
  margin,
}: {
  margin: MarginHealthAssessment;
}) {
  const visual = marginVisual(margin);
  const tone = TONE[visual.tone];
  const values = [
    margin.estimatedMargin,
    margin.targetMargin,
    margin.hardMinimumMargin,
  ].filter((value): value is number => value != null && !Number.isNaN(value));
  const high = Math.max(3, ...values) + 0.25;
  const pos = (value: number | null) =>
    value == null ? null : percentPosition((value / high) * 100);

  const currentPosition = pos(margin.estimatedMargin);
  const hardMinimumPosition = pos(margin.hardMinimumMargin);
  const targetPosition = pos(margin.targetMargin);

  return (
    <div
      role="group"
      aria-label={`Margin health: ${visual.label}`}
      data-quote-parameter-label="Estimated margin"
      className={`mt-2 rounded-lg px-3 py-2.5 ${tone.soft}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium">Margin health</div>
          <div className="font-semibold text-ink">{visual.label}</div>
        </div>
        <div
          data-quote-parameter-value
          className="tnum text-right text-sm font-semibold text-ink"
        >
          {fmtPct(margin.estimatedMargin)}
        </div>
      </div>
      {values.length > 0 && (
        <>
          <div
            role="img"
            aria-label={`Estimated margin ${fmtPct(margin.estimatedMargin)}; hard minimum ${fmtPct(margin.hardMinimumMargin)}; target ${fmtPct(margin.targetMargin)}.`}
            className="relative mt-3 h-2 rounded-full bg-border"
          >
            {hardMinimumPosition != null && (
              <div
                className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-alert"
                style={{ left: `${hardMinimumPosition}%` }}
                aria-hidden
              />
            )}
            {targetPosition != null && (
              <div
                className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-ok"
                style={{ left: `${targetPosition}%` }}
                aria-hidden
              />
            )}
            {currentPosition != null && (
              <div
                className={`h-full rounded-full ${tone.bg}`}
                style={{ width: `${currentPosition}%` }}
                aria-hidden
              />
            )}
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[11px] text-muted">
            <span>Hard min {fmtPct(margin.hardMinimumMargin)}</span>
            <span>Target {fmtPct(margin.targetMargin)}</span>
          </div>
        </>
      )}
      <p className="mt-1.5 text-xs text-ink/80">{visual.helper}</p>
    </div>
  );
}
