import { Line, RailSegment } from "@/components/result/shared";
import { fmtMoney } from "@/lib/format";

// Repayment estimates get their own segment — they're what the member asks
// about first. Always labelled indicative.

export function IndicativeRepaymentCard({
  monthlyRepayment,
  fortnightlyRepayment,
  usingRequested,
  rateLabel,
}: {
  monthlyRepayment: number | null;
  fortnightlyRepayment: number | null;
  usingRequested: boolean;
  rateLabel?: string;
}) {
  return (
    <RailSegment title="Indicative Repayment">
      <div
        data-quote-parameter-label="Monthly repayment"
        className="flex items-baseline justify-between gap-4"
      >
        <span className="text-sm text-muted">Monthly</span>
        <span
          data-quote-parameter-value
          className="tnum text-xl font-semibold text-ink"
        >
          {fmtMoney(monthlyRepayment, 2)}
        </span>
      </div>
      <Line label="Fortnightly" value={fmtMoney(fortnightlyRepayment, 2)} />
      <p className="mt-1.5 text-xs leading-5 text-faint">
        At the{" "}
        {rateLabel ?? (usingRequested ? "requested rate" : "suggested rate")}.
        Indicative estimates, principal &amp; interest — not a repayment
        commitment.
      </p>
    </RailSegment>
  );
}
