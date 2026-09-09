import type {
  CustomerScoreCategory,
  CustomerScoreResult,
} from "@/lib/pricing/types";
import { Line, RailSegment } from "@/components/result/shared";
import { fmtSignedPct } from "@/lib/format";
import { customerScoreVisual } from "@/lib/quote-visuals";
import { TONE } from "@/lib/tones";

const SCORE_CATEGORY_LABELS: Record<CustomerScoreCategory, string> = {
  loan: "Loan",
  risk: "Risk",
  relationship: "Relationship",
  strategic: "Strategic",
};

function scoreCategoryAverage(
  score: CustomerScoreResult,
  category: CustomerScoreCategory,
): number | null {
  const factors = score.factors.filter((f) => f.category === category);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight <= 0) return null;
  return factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight;
}

function scoreBandLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Customer score gauge, band and the category drivers behind it.

export function CustomerScorePanel({
  customerScore,
  bare = false,
}: {
  customerScore: CustomerScoreResult;
  bare?: boolean;
}) {
  return (
    <RailSegment title={bare ? undefined : "Customer score"} bare={bare}>
      <ScoreGauge score={customerScore.score} />
      <Line
        label="Overall score"
        value={`${customerScore.score.toFixed(2)} / 100`}
        tone={
          customerScore.score >= 72
            ? "text-ok"
            : customerScore.score < 50
              ? "text-warn"
              : "text-ink"
        }
      />
      <Line label="Score band" value={scoreBandLabel(customerScore.band)} />
      {customerScore.modelName && (
        <Line
          label="Score model"
          value={`${customerScore.modelName}${
            customerScore.modelVersion ? ` v${customerScore.modelVersion}` : ""
          }`}
        />
      )}
      <Line
        label={
          customerScore.pricingBasis === "discount_entitlement_v1"
            ? "Score discount"
            : "Legacy score adjustment"
        }
        value={
          customerScore.pricingBasis === "discount_entitlement_v1"
            ? `${customerScore.scoreDiscountPct.toFixed(2)}%`
            : fmtSignedPct(customerScore.pricingAdjustment)
        }
        tone={customerScore.scoreDiscountPct > 0 ? "text-ok" : "text-ink"}
      />
      {customerScore.discountEntitlementPct != null && (
        <Line
          label="Discount entitlement"
          value={`${customerScore.discountEntitlementPct.toFixed(1)}% of ${customerScore.maxDiscountPct.toFixed(2)}% maximum`}
        />
      )}
      <div className="mt-2 border-t border-border pt-2">
        <div className="mb-1.5 text-xs font-medium text-muted">
          Score drivers
        </div>
        <div className="space-y-2">
          {(["risk", "loan", "relationship", "strategic"] as const).map(
            (category) => {
              const avg = scoreCategoryAverage(customerScore, category);
              const visual = customerScoreVisual(avg);
              const tone = TONE[visual.tone];
              return (
                <div
                  key={category}
                  className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-xs"
                >
                  <span className="text-muted">
                    {SCORE_CATEGORY_LABELS[category]}
                  </span>
                  <div className="h-2 rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${tone.bg}`}
                      style={{ width: `${visual.position}%` }}
                    />
                  </div>
                  <span className="tnum text-right font-medium text-ink">
                    {avg == null ? "—" : avg.toFixed(1)}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </RailSegment>
  );
}

function ScoreGauge({ score }: { score: number | null | undefined }) {
  const visual = customerScoreVisual(score);
  const tone = TONE[visual.tone];

  return (
    <div className={`mb-3 rounded-lg px-3 py-2.5 ${tone.soft}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium">Score band</div>
          <div className="text-lg font-semibold text-ink">{visual.label}</div>
        </div>
        <div className="text-right">
          <div className="tnum text-xl font-semibold text-ink">
            {score == null ? "—" : score.toFixed(1)}
          </div>
          <div className="text-xs">Range {visual.range}</div>
        </div>
      </div>
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="absolute inset-y-0 left-0 w-[45%] bg-alert/70" />
        <div className="absolute inset-y-0 left-[45%] w-[7%] bg-warn/75" />
        <div className="absolute inset-y-0 left-[52%] w-[20%] bg-info/70" />
        <div className="absolute inset-y-0 left-[72%] w-[8%] bg-ok/70" />
        <div className="absolute inset-y-0 left-[80%] w-[20%] bg-ok" />
        <div
          className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-surface"
          style={{ left: `${visual.position}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>Weak</span>
        <span>Watch</span>
        <span>Standard</span>
        <span>Strong</span>
        <span>Excellent</span>
      </div>
      <p className="mt-2 text-xs text-ink/80">{visual.helper}</p>
    </div>
  );
}
