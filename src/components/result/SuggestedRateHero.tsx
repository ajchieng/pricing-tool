import { ApprovalBadge } from "@/components/ApprovalBadge";
import { Badge } from "@/components/ui/Badge";
import { fmtPct, fmtSignedPct } from "@/lib/format";
import { MARGIN_STATUS } from "@/lib/status";

// The answer: Suggested Rate, approval requirement and margin health in one
// glance. The app's one dark surface outside the rail — a product-tinted
// decision panel with the rate as a luminous mono figure. Wording stays
// conservative: it is a suggested rate, never an approval.

export function SuggestedRateHero({
  suggestedRate,
  cardedRate,
  totalAdjustment,
  pricingBasis,
  approvalLevel,
  marginStatus,
  requestedRate,
  requestedBelowSuggested,
  requestedRateLabel = "Requested",
  loading = false,
}: {
  suggestedRate: number | null;
  cardedRate: number | null;
  totalAdjustment: number;
  pricingBasis: "legacy_signed_adjustment" | "discount_entitlement_v1";
  approvalLevel: string | null;
  marginStatus: string;
  requestedRate: number | null;
  requestedBelowSuggested: boolean;
  requestedRateLabel?: string;
  loading?: boolean;
}) {
  const marginState = MARGIN_STATUS[marginStatus] ?? MARGIN_STATUS.unavailable;
  return (
    <section
      data-quote-parameter-group="Decision"
      className="rounded-2xl bg-brand-deep p-5 text-rail-ink shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-brand-deep-muted">
            Suggested rate
            {loading && (
              <span className="ml-2 text-xs font-normal opacity-80">
                Recalculating…
              </span>
            )}
          </h3>
        </div>
        <span data-quote-parameter-label="Approval requirement">
          <span data-quote-parameter-value>
            <ApprovalBadge level={approvalLevel} />
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div
          data-quote-parameter-label="Suggested rate"
          data-quote-parameter-value
          className="tnum font-serif text-[3.2rem] font-semibold leading-none text-brand-glow"
        >
          {suggestedRate != null ? suggestedRate.toFixed(2) : "—"}
          <span className="ml-1 text-2xl font-medium tracking-normal text-brand-deep-muted">
            %
          </span>
        </div>
        <span data-quote-parameter-label="Margin status">
          <span data-quote-parameter-value>
            <Badge tone={marginState.tone} size="sm" className="mb-0.5">
              Margin: {marginState.label}
            </Badge>
          </span>
        </span>
      </div>

      {cardedRate != null && (
        <p className="tnum mt-3 text-sm text-brand-deep-muted">
          Starting rate {fmtPct(cardedRate)}
          <span className="mx-1.5 opacity-70">→</span>
          <span
            className={
              totalAdjustment < 0 ? "text-brand-glow" : "text-rail-ink"
            }
          >
            {pricingBasis === "discount_entitlement_v1"
              ? `${Math.max(0, -totalAdjustment).toFixed(2)}% total discount`
              : `${fmtSignedPct(totalAdjustment)} legacy adjustment`}
          </span>
        </p>
      )}

      {requestedRate != null && (
        <p
          data-quote-parameter-label={requestedRateLabel}
          className={`tnum mt-1 text-sm ${
            requestedBelowSuggested
              ? "text-warn-bright"
              : "text-brand-deep-muted"
          }`}
        >
          {requestedRateLabel}{" "}
          <span data-quote-parameter-value>{fmtPct(requestedRate)}</span>
          {requestedBelowSuggested ? " — below suggested" : ""}
        </p>
      )}
    </section>
  );
}
