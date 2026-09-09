import { Field, inputClass } from "@/components/ui/Field";
import { RateInput } from "@/components/ui/inputs";
import { Select } from "@/components/quote-form-ui";
import { REQUESTED_REASONS } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";

// Section body: competitor evidence and the rate the member has asked for.
// Optional — pricing works without it, but a requested rate drives the
// exception/approval analysis.

export function CompetitorPricingCard({
  competitorLender,
  onCompetitorLenderChange,
  competitorRate,
  onCompetitorRateChange,
  competitorNotes,
  onCompetitorNotesChange,
  requestedRate,
  onRequestedRateChange,
  requestedReason,
  onRequestedReasonChange,
  requestedReasonNotes,
  onRequestedReasonNotesChange,
  marketEvidence = null,
  onDetachMarketEvidence,
}: {
  competitorLender: string;
  onCompetitorLenderChange: (value: string) => void;
  competitorRate: string;
  onCompetitorRateChange: (value: string) => void;
  competitorNotes: string;
  onCompetitorNotesChange: (value: string) => void;
  requestedRate: string;
  onRequestedRateChange: (value: string) => void;
  requestedReason: string;
  onRequestedReasonChange: (value: string) => void;
  requestedReasonNotes: string;
  onRequestedReasonNotesChange: (value: string) => void;
  marketEvidence?: MarketQuoteEvidence | null;
  onDetachMarketEvidence?: () => void;
}) {
  const showOtherReason = requestedReason === "other";
  const evidenceCriteria = marketEvidence
    ? [
        marketEvidence.rateCriteria.loanPurpose,
        marketEvidence.rateCriteria.lendingRateType,
        marketEvidence.rateCriteria.repaymentType,
        marketEvidence.rateCriteria.fixedPeriodMonths != null
          ? `${marketEvidence.rateCriteria.fixedPeriodMonths} months fixed`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      {marketEvidence && (
        <div className="rounded-lg border border-brand/25 bg-brand-soft/60 p-4 @md:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">
                Market evidence attached
              </p>
              <p className="mt-1 text-sm text-muted">
                {marketEvidence.lender} · {marketEvidence.productName} ·{" "}
                <span className="tnum">
                  {marketEvidence.advertisedRate.toFixed(2)}%
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-faint">
                This fictional product comes from the catalogue bundled with the
                demo. Saving keeps this evidence with the quote in your browser;
                it does not change the lender’s pricing policy.
              </p>
              {evidenceCriteria && (
                <p className="mt-1 text-xs leading-5 text-faint">
                  {evidenceCriteria}
                </p>
              )}
              {marketEvidence.evidenceUrl && (
                <a
                  href={marketEvidence.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-brand hover:text-brand-strong"
                >
                  Open lender evidence
                </a>
              )}
            </div>
            {onDetachMarketEvidence && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDetachMarketEvidence}
              >
                Use manual evidence instead
              </Button>
            )}
          </div>
        </div>
      )}
      <Field label="Competitor lender" htmlFor="competitor-lender">
        <input
          id="competitor-lender"
          className={inputClass}
          value={competitorLender}
          onChange={(e) => onCompetitorLenderChange(e.target.value)}
          disabled={Boolean(marketEvidence)}
        />
      </Field>
      <Field label="Competitor rate" htmlFor="competitor-rate">
        <RateInput
          id="competitor-rate"
          value={competitorRate}
          onChange={onCompetitorRateChange}
          disabled={Boolean(marketEvidence)}
        />
      </Field>
      <Field
        label="Competitor notes / evidence"
        htmlFor="competitor-notes"
        helper="e.g. written quote reference, advertised offer, screenshot on file."
        className="@md:col-span-2"
      >
        <input
          id="competitor-notes"
          className={inputClass}
          value={competitorNotes}
          onChange={(e) => onCompetitorNotesChange(e.target.value)}
          disabled={Boolean(marketEvidence)}
        />
      </Field>
      <Field
        label="Requested customer rate"
        htmlFor="requested-rate"
        helper="The rate the member has asked for — pricing shows its margin impact."
      >
        <RateInput
          id="requested-rate"
          value={requestedRate}
          onChange={onRequestedRateChange}
        />
      </Field>
      <Select
        label="Reason for requested rate"
        value={requestedReason}
        onChange={onRequestedReasonChange}
        options={REQUESTED_REASONS}
        placeholder="Select…"
      />
      {showOtherReason && (
        <Field
          label="Reason (other)"
          htmlFor="requested-reason-notes"
          className="@md:col-span-2"
        >
          <input
            id="requested-reason-notes"
            className={inputClass}
            value={requestedReasonNotes}
            onChange={(e) => onRequestedReasonNotesChange(e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}
