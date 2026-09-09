import { Select } from "@/components/quote-form-ui";
import { YES_NO_UNKNOWN_OPTIONS } from "@/lib/format";
import { CompetitorPricingCard } from "@/components/quote/CompetitorPricingCard";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function StrategicContextCard({
  livesInServiceRegion,
  onLivesInServiceRegionChange,
  vipCustomer,
  onVipCustomerChange,
  ...competitorProps
}: {
  livesInServiceRegion: string;
  onLivesInServiceRegionChange: (value: string) => void;
  vipCustomer: boolean;
  onVipCustomerChange: (value: boolean) => void;
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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          Strategic context
        </h3>
        <div className="grid gap-4 @md:grid-cols-2">
          <Select
            label="Lives in Region"
            value={livesInServiceRegion}
            onChange={onLivesInServiceRegionChange}
            options={YES_NO_UNKNOWN_OPTIONS}
          />
          <Select
            label="VIP customer"
            value={vipCustomer ? "yes" : "no"}
            onChange={(value) => onVipCustomerChange(value === "yes")}
            options={YES_NO_OPTIONS}
          />
        </div>
      </div>
      <div className="border-t border-border pt-5">
        <h3 className="mb-1 text-sm font-semibold text-ink">
          Competitor / requested pricing
        </h3>
        <p className="mb-4 max-w-prose text-xs text-muted">
          Capture the external pricing pressure and the rate requested by the
          customer within the broader strategic assessment.
        </p>
        <CompetitorPricingCard {...competitorProps} />
      </div>
    </div>
  );
}
