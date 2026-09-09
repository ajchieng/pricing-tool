import type React from "react";
import { TONE, type Tone } from "@/lib/tones";

// Compact metric for KPI rows (profitability grid, dashboard summary): an
// unboxed stat set off by a single neutral hairline, mono figure carries it.

export function KpiTile({
  label,
  value,
  hint,
  supporting,
  tone,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  supporting?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      data-quote-parameter-label={label}
      className={`min-w-0 border-l border-border-strong pl-3.5 py-0.5 ${className}`}
    >
      <div className="truncate text-xs font-medium text-muted" title={label}>
        {label}
      </div>
      <div
        data-quote-parameter-value
        className={`tnum mt-1 truncate text-[calc(1.25rem*var(--numeric-scale,1))] font-semibold leading-snug ${
          tone ? TONE[tone].text : "text-ink"
        }`}
      >
        {value}
      </div>
      {supporting}
      {hint && <div className="mt-0.5 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}
