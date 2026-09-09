import type React from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ApprovalReason } from "@/lib/pricing/types";
import { approvalStatus } from "@/lib/status";
import type { Tone } from "@/lib/tones";

// The one dark decision surface on a saved quote detail page, shared by all
// three lending verticals: the rate (with how it was built), the approval
// requirement with its reasons and next step, and the indicative repayments.
// Vertical-specific wording arrives via props so the layout stays identical.

export interface DecisionBandRepaymentRow {
  label: string;
  value: string;
}

export function DecisionBandRateLine({
  warn = false,
  children,
}: {
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`tnum text-sm ${
        warn ? "text-warn-bright" : "text-brand-deep-muted"
      }`}
    >
      {children}
    </p>
  );
}

export function QuoteDecisionBand({
  rateLabel,
  rateValue,
  statusBadge,
  rateLines,
  approvalLevel,
  approvalReasons,
  nextAction,
  repaymentTitle = "Indicative Repayment",
  repaymentRows,
  repaymentEmpty,
  repaymentNote,
  loading = false,
}: {
  rateLabel: string;
  rateValue: number | null;
  statusBadge?: { tone: Tone; label: string } | null;
  rateLines?: React.ReactNode;
  approvalLevel: string | null;
  approvalReasons: ApprovalReason[];
  nextAction?: string;
  repaymentTitle?: string;
  repaymentRows: DecisionBandRepaymentRow[];
  repaymentEmpty?: string;
  repaymentNote?: string;
  loading?: boolean;
}) {
  const approval = approvalStatus(approvalLevel);
  const repaymentParameterLabel = (label: string) =>
    /repayment|interest|debt service/i.test(label)
      ? label
      : `${label} repayment`;

  return (
    <section
      data-quote-parameter-group="Decision"
      className="rounded-2xl bg-brand-deep p-5 text-rail-ink shadow-[var(--shadow-md)]"
      aria-label="Quote decision summary"
    >
      <div className="grid divide-y divide-rail-ink/10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.75fr)_minmax(18rem,0.75fr)] lg:divide-x lg:divide-y-0">
        <div
          data-quote-parameter-label={rateLabel}
          className="pb-5 lg:pb-0 lg:pr-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-brand-deep-muted">
                {rateLabel}
                {loading && (
                  <span className="ml-2 text-xs font-normal opacity-80">
                    Recalculating…
                  </span>
                )}
              </h3>
              <div
                data-quote-parameter-value
                className="tnum mt-2 font-serif text-[3.1rem] font-semibold leading-none text-brand-glow"
              >
                {rateValue != null ? rateValue.toFixed(2) : "—"}
                <span className="ml-0.5 text-2xl font-medium tracking-normal text-brand-deep-muted">
                  %
                </span>
              </div>
            </div>
            {statusBadge && (
              <Badge tone={statusBadge.tone} size="sm">
                {statusBadge.label}
              </Badge>
            )}
          </div>
          {rateLines && <div className="mt-3 space-y-1">{rateLines}</div>}
        </div>

        <div
          data-quote-parameter-label="Approval requirement"
          className="py-5 lg:px-6 lg:py-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-brand-deep-muted">
              Approval
            </h3>
            <span data-quote-parameter-value>
              <Badge tone={approval.tone} size="sm">
                {approval.label}
              </Badge>
            </span>
          </div>
          {approvalReasons.length > 0 ? (
            <details className="group mt-2">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-rail-ink transition-colors hover:text-brand-glow [&::-webkit-details-marker]:hidden">
                <span>
                  {approvalReasons.length} pricing approval{" "}
                  {approvalReasons.length === 1 ? "reason" : "reasons"}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                  className="shrink-0 text-brand-deep-muted transition-transform duration-150 group-open:rotate-180"
                />
              </summary>
              <ul className="mt-1 space-y-1 text-sm text-brand-deep-muted">
                {approvalReasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="select-none opacity-70">
                      –
                    </span>
                    <span>{r.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="mt-3 text-sm text-brand-deep-muted">
              No pricing approval reasons.
            </p>
          )}
          {nextAction && (
            <p className="mt-2 text-sm font-medium text-rail-ink">
              Next step: {nextAction}
            </p>
          )}
        </div>

        <div className="pt-5 lg:pl-6 lg:pt-0">
          <h3 className="text-sm font-medium text-brand-deep-muted">
            {repaymentTitle}
          </h3>
          {repaymentRows.length > 0 ? (
            <>
              <div className="mt-2 space-y-2">
                {repaymentRows.map((row, index) => (
                  <div
                    key={row.label}
                    data-quote-parameter-label={repaymentParameterLabel(
                      row.label,
                    )}
                    className={`flex items-baseline justify-between gap-4 ${
                      index > 0 ? "border-t border-rail-ink/10 pt-2" : ""
                    }`}
                  >
                    <span className="text-sm text-brand-deep-muted">
                      {row.label}
                    </span>
                    <span
                      data-quote-parameter-value
                      className={`tnum font-semibold text-rail-ink ${
                        index === 0 ? "text-xl" : ""
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              {repaymentNote && (
                <p className="mt-2 text-xs leading-5 text-brand-deep-muted">
                  {repaymentNote}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-brand-deep-muted">
              {repaymentEmpty ?? "No scheduled repayments for this quote."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
