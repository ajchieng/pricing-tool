import { PrintGuideButton } from "./PrintGuideButton";
import { getHomeGuidePolicy } from "./demo-guide-policy";
import { scoreModelCategoryRollups } from "@/lib/pricing/score-guide-data";
import { scoreToPricingAdjustmentWithCurve } from "@/lib/pricing/score-engine";
import { ScoreGuideTabs } from "@/components/score-guide/ScoreGuideTabs";
import { ActiveScoreModelDetails } from "@/components/score-guide/ActiveScoreModelDetails";
import { ActiveEconomicPolicyDetails } from "@/components/score-guide/ActiveEconomicPolicyDetails";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import { GuidePolicyNotes } from "@/components/score-guide/GuidePolicyNotes";
import {
  SCORE_BAND_COLORS,
  SCORE_CATEGORY_COLORS,
  SCORE_CHART_GRID,
  SCORE_CHART_TRACK,
  scoreSoftFill,
} from "@/components/score-guide/visual-tokens";
import type {
  CustomerScoreBandConfig,
  CustomerScoreRateCurveConfig,
} from "@/lib/pricing/types";
import { PUBLISHED_RATE_ROLE_LABELS } from "@/lib/pricing/rate-role";

const FLOW_STEPS = [
  {
    label: "Inputs",
    value: "loan + risk + relationship + strategic",
    detail: "Staff enter the scenario once.",
  },
  {
    label: "Factor scores",
    value: "0-100 each",
    detail: "Missing values use each factor's governed fallback score.",
  },
  {
    label: "Weighted average",
    value: "customer score",
    detail: "High-weight factors move the total more.",
  },
  {
    label: "Score discount",
    value: "governed curve",
    detail:
      "Scores above the governed threshold earn a continuous share of the maximum discount.",
  },
];

const CURRENT_HOME_RULES = [
  {
    title: "Customer stream changes the assessment",
    detail:
      "New to bank, Existing member and Retention are distinct paths. New-to-bank quotes neutralise relationship depth. Retention replaces ordinary credit, DTI and income questions with the current rate and 18-month and 12-month arrears history.",
  },
  {
    title: "Multiple Equifax scores are averaged",
    detail:
      "Enter each individual applicant's Equifax score. Their arithmetic mean is the only credit-score value used by customer scoring, warnings and approval rules.",
  },
  {
    title: "Pricing pressure is inside the score",
    detail:
      "Competitor rate and requested rate are governed Strategic factors. Their active raw weights and normalised influence are shown below. They are not applied again as a separate score adjustment. Product comparison rates remain display-only context.",
  },
  {
    title: "Market evidence uses the bundled sample catalogue",
    detail:
      "Selecting a sample product in Market Search checks its lending area, prefills an equivalent fictional home-loan product and attaches market evidence. Saving the quote freezes a versioned evidence snapshot; the resolved rate supplies the competitor score fact when the model contains it. The requested rate remains unchanged.",
  },
  {
    title: "Scenario previews are temporary",
    detail:
      "A customer-rate scenario recalculates downstream economics and approval for comparison. It is not saved or audited until staff explicitly apply it to the formal requested-rate field.",
  },
  {
    title: "Retention discount is constrained",
    detail:
      "Retention pricing limits further discount from the member's current rate. Twelve-month arrears produces “No further discount can be provided” while the quote continues through its normal review path.",
  },
  {
    title: "Broker context is conditional",
    detail:
      "Broker region, trailing 12-month volume and discretion are Strategic factors only for the Broker channel. They stay neutral for Direct and Online scenarios.",
  },
  {
    title: "Profitability and capital are separate",
    detail:
      "The score moves the suggested rate. The quote then snapshots margin, first-year profitability (including effective quote fees) and indicative APS 112 capital allocation. An unconfirmed capital classification is conservative and blocks acceptance until confirmed.",
  },
];

function formatNumber(value: number, dp = 2) {
  return value.toFixed(dp).replace(/\.00$/, "");
}

function categoryStats(
  model: Awaited<ReturnType<typeof getHomeGuidePolicy>>["scoreModel"],
) {
  return scoreModelCategoryRollups(model).map((rollup) => ({
    ...rollup,
    ...SCORE_CATEGORY_COLORS[rollup.category],
  }));
}

function scoreBandsForDiagram(bands: CustomerScoreBandConfig[]) {
  const sorted = [...bands].sort((a, b) => a.minScore - b.minScore);
  return sorted.map((band, index) => {
    const next = sorted[index + 1]?.minScore ?? 100;
    return {
      label: band.label,
      range:
        next === 100 ? `${band.minScore}+` : `${band.minScore}-${next - 1}`,
      from: band.minScore,
      to: next,
      color: SCORE_BAND_COLORS[band.key],
    };
  });
}

function FlowDiagram() {
  return (
    <section className="border-y border-border">
      <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
        {FLOW_STEPS.map((step, index) => (
          <div key={step.label} className="relative py-4 md:px-4">
            {index < FLOW_STEPS.length - 1 && (
              <div
                aria-hidden
                className="absolute right-[-7px] top-1/2 z-10 hidden h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-border bg-bg md:block"
              />
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="grid h-7 w-7 place-items-center rounded bg-brand-soft text-xs font-semibold text-brand-strong">
                {index + 1}
              </span>
              <span className="text-xs text-faint">stage</span>
            </div>
            <h2 className="text-sm font-semibold">{step.label}</h2>
            <p className="mt-1 text-lg font-semibold text-ink">{step.value}</p>
            <p className="mt-2 text-sm leading-5 text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormulaStrip() {
  return (
    <section className="border-y border-border">
      <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          ["Normalised weight", "raw weight / sum(enabled raw weights)"],
          ["Overall score", "sum(score x raw weight) / sum(raw weights)"],
          ["Missing input", "factorScore = configured missing score"],
        ].map(([label, formula]) => (
          <div key={label} className="py-4 md:px-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-mono text-sm text-ink">{formula}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeRateRoles({
  rateBands,
}: {
  rateBands: Awaited<ReturnType<typeof getHomeGuidePolicy>>["rateBands"];
}) {
  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Active product-rate roles</h2>
        <p className="text-sm text-muted">
          A rate is enforced as a customer-rate floor only when its governed
          role explicitly says so. Other rows remain pricing anchors or
          representative starting rates.
        </p>
      </div>
      {rateBands.length === 0 ? (
        <p className="text-sm font-medium text-ink">
          No active governed rate bands are configured.
        </p>
      ) : (
        <div className="grid gap-x-6 md:grid-cols-2">
          {rateBands.map((rate) => (
            <div key={rate.id} className="border-t border-border py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  {rate.productName}
                </p>
                <p className="tnum font-semibold text-ink">
                  {rate.rate.toFixed(2)}%
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">
                LVR {rate.lvrMin.toFixed(2)}–{rate.lvrMax.toFixed(2)}% ·{" "}
                {PUBLISHED_RATE_ROLE_LABELS[rate.pricingRole]}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ScoreBandDiagram({
  bands,
}: {
  bands: ReturnType<typeof scoreBandsForDiagram>;
}) {
  return (
    <section className="border-y border-border py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Score bands</h2>
          <p className="text-sm text-muted">
            The band is a label for the weighted score. The adjustment still
            uses the exact score.
          </p>
        </div>
      </div>
      <div className="relative">
        <div className="flex h-12 overflow-hidden rounded border border-border">
          {bands.map((band) => (
            <div
              key={band.label}
              className="flex min-w-0 flex-col items-center justify-center border-r border-white/60 px-2 last:border-r-0"
              style={{
                width: `${band.to - band.from}%`,
                backgroundColor: scoreSoftFill(band.color),
                color: band.color,
              }}
            >
              <span className="text-xs font-semibold">{band.label}</span>
              <span className="text-[11px] text-muted">{band.range}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-faint">
          <span>0</span>
          {bands
            .filter((band) => band.from > 0)
            .map((band) => (
              <span key={band.label}>{band.from}</span>
            ))}
          <span>100</span>
        </div>
      </div>
    </section>
  );
}

function CategoryRings({ stats }: { stats: ReturnType<typeof categoryStats> }) {
  const totalWeight = stats.reduce((sum, item) => sum + item.rawWeight, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const segments = stats.reduce<
    Array<(typeof stats)[number] & { dash: string; offset: number }>
  >((items, item) => {
    const previousLength = items.reduce((sum, segment) => {
      const [length] = segment.dash.split(" ").map(Number);
      return sum + length;
    }, 0);
    const length = (item.normalisedWeight / 100) * circumference;
    return [
      ...items,
      {
        ...item,
        dash: `${length} ${circumference - length}`,
        offset: -previousLength,
      },
    ];
  }, []);

  return (
    <section className="grid gap-6 border-y border-border py-6 lg:grid-cols-[280px_1fr]">
      <div className="flex items-center justify-center">
        <svg
          role="img"
          aria-label="Category weight donut chart"
          viewBox="0 0 160 160"
          className="h-64 w-64"
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={SCORE_CHART_TRACK}
            strokeWidth="18"
          />
          {segments.map((segment) => (
            <circle
              key={segment.category}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeDasharray={segment.dash}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              strokeWidth="18"
              transform="rotate(-90 80 80)"
            />
          ))}
          <text
            x="80"
            y="74"
            textAnchor="middle"
            className="fill-ink text-[15px] font-semibold"
          >
            {totalWeight.toFixed(1)}
          </text>
          <text
            x="80"
            y="92"
            textAnchor="middle"
            className="fill-muted text-[9px]"
          >
            raw total
          </text>
        </svg>
      </div>
      <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
        {stats.map((item) => (
          <div
            key={item.category}
            className="border-t border-border py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <h3 className="text-sm font-semibold">{item.label}</h3>
              <span className="ml-auto tnum text-sm text-muted">
                {item.normalisedWeight.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-border">
              <div
                className="h-full rounded"
                style={{
                  width: `${item.normalisedWeight}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-faint">Raw weight</p>
                <p className="tnum font-semibold">
                  {formatNumber(item.rawWeight)}
                </p>
              </div>
              <div>
                <p className="text-faint">Factors</p>
                <p className="tnum font-semibold">{item.factors.length}</p>
              </div>
              <div>
                <p className="text-faint">Share</p>
                <p className="tnum font-semibold">
                  {item.normalisedWeight.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">{item.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactorHeatmap({ stats }: { stats: ReturnType<typeof categoryStats> }) {
  const maxFactorWeight = Math.max(
    ...stats.flatMap((item) => item.factors.map((factor) => factor.rawWeight)),
  );

  return (
    <section className="border-y border-border py-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Every factor in the model</h2>
          <p className="text-sm text-muted">
            Each row shows the parameter and its model importance.
          </p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {stats.map((item) => (
          <div key={item.category}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{item.label}</h3>
              <span className="tnum text-xs text-muted">
                Raw {formatNumber(item.rawWeight)} ·{" "}
                {item.normalisedWeight.toFixed(1)}%
              </span>
            </div>
            <div className="divide-y divide-border">
              {item.factors.map((factor) => (
                <div key={factor.key} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-5">
                      {factor.label}
                    </p>
                    <span className="tnum shrink-0 text-xs text-muted">
                      Raw {formatNumber(factor.rawWeight)} ·{" "}
                      {factor.normalisedWeight.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded bg-border">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${(factor.rawWeight / maxFactorWeight) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdjustmentCurve({ curve }: { curve: CustomerScoreRateCurveConfig }) {
  const neutralMargin = curve.neutralMargin ?? 0;
  const discountOnly = curve.pricingBasis === "discount_entitlement_v1";
  const yMin = discountOnly ? 0 : neutralMargin - curve.maxDiscount;
  const yMax = discountOnly
    ? curve.maxDiscount
    : neutralMargin + curve.maxLoading;
  const pad = (yMax - yMin) * 0.08 || 0.1;
  const domainMin = yMin - pad;
  const domainMax = yMax + pad;
  const projectY = (value: number) =>
    20 + ((domainMax - value) / (domainMax - domainMin)) * 120;

  const points = Array.from({ length: 101 }, (_, value) => {
    const adjustment = scoreToPricingAdjustmentWithCurve(value, curve);
    const plottedValue = discountOnly ? -adjustment : adjustment;
    const x = (value / 100) * 300;
    return `${x.toFixed(2)},${projectY(plottedValue).toFixed(2)}`;
  }).join(" ");

  const yTicks: Array<[number, string]> = discountOnly
    ? [
        [yMax, `${yMax.toFixed(2)}%`],
        [0, "0.00%"],
      ]
    : [
        [yMax, `${yMax >= 0 ? "+" : ""}${yMax.toFixed(2)}`],
        [
          neutralMargin,
          `${neutralMargin >= 0 ? "+" : ""}${neutralMargin.toFixed(2)}`,
        ],
        [yMin, `${yMin >= 0 ? "+" : ""}${yMin.toFixed(2)}`],
      ];

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Score to discount curve</h2>
        <p className="text-sm text-muted">
          Scores of {curve.neutralScore} or below receive no discount. Higher
          scores earn a continuous share of the {curve.maxDiscount.toFixed(2)}%
          maximum.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <svg
          role="img"
          aria-label="Line chart showing customer score to discount"
          viewBox="-32 0 360 172"
          className="h-72 w-full rounded bg-panel"
        >
          {[0, curve.neutralScore, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={(tick / 100) * 300}
                x2={(tick / 100) * 300}
                y1="20"
                y2="140"
                stroke={SCORE_CHART_GRID}
                strokeDasharray={tick === curve.neutralScore ? "0" : "3 3"}
              />
              <text
                x={(tick / 100) * 300}
                y="160"
                textAnchor="middle"
                className="fill-muted text-[10px]"
              >
                {tick}
              </text>
            </g>
          ))}
          {yTicks.map(([value, label]) => {
            const y = projectY(value);
            return (
              <g key={label}>
                <line x1="0" x2="300" y1={y} y2={y} stroke={SCORE_CHART_GRID} />
                <text
                  x="-8"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted text-[10px]"
                >
                  {label}
                </text>
              </g>
            );
          })}
          <polyline
            points={points}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="3"
          />
        </svg>
        <div className="grid content-center gap-3">
          {(discountOnly
            ? [
                [
                  "No discount boundary",
                  `Score ${curve.neutralScore}`,
                  `Scores of ${curve.neutralScore} or below receive no discount.`,
                ],
                [
                  "Continuous entitlement",
                  `Scores ${curve.neutralScore}-100`,
                  "Each point earns an equal share of the maximum discount.",
                ],
                [
                  "Maximum discount",
                  "Score 100",
                  `${curve.maxDiscount.toFixed(2)} percentage points`,
                ],
              ]
            : [
                [
                  "Neutral pivot",
                  `Score ${curve.neutralScore}`,
                  `${neutralMargin.toFixed(2)}% adjustment`,
                ],
                [
                  "Downward side",
                  `Score >= ${curve.neutralScore}`,
                  `-${curve.discountSlope.toFixed(3)}% per score point, floor ${yMin.toFixed(2)}%`,
                ],
                [
                  "Upward side",
                  `Score < ${curve.neutralScore}`,
                  `+${curve.loadingSlope.toFixed(3)}% per score point, capped at ${yMax.toFixed(2)}%`,
                ],
              ]
          ).map(([label, value, detail]) => (
            <div
              key={label}
              className="border-t border-border py-3 first:border-t-0"
            >
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 font-semibold">{value}</p>
              <p className="mt-1 text-sm text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeScoreGuide() {
  const guidePolicy = getHomeGuidePolicy();
  const activeModel = guidePolicy.scoreModel;
  const stats = categoryStats(activeModel);
  const scoreBands = scoreBandsForDiagram(activeModel.bands);
  const totalWeight = stats.reduce(
    (sum, category) => sum + category.rawWeight,
    0,
  );
  const factorCount = stats.reduce(
    (sum, category) => sum + category.factors.length,
    0,
  );

  return (
    <div className="space-y-6 pb-8">
      <ScoreGuideTabs active="score" guidePath={PRODUCT_AREAS.home.guidePath} />

      <section className="border-b border-border pb-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              Pricing Tool · Pricing Engine
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
              Home loan customer score and discount guide
            </h1>
            <p className="mt-2 text-xs leading-5 text-muted">
              Fictional demonstration assumptions. Indicative examples only; not
              an offer or credit decision.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              This page documents the home loan customer score. The score is a
              weighted average of loan, risk, relationship and strategic
              factors. Scores at or below {activeModel.rateCurve.neutralScore}
              receive no customer-score discount; higher scores progressively
              earn up to {activeModel.rateCurve.maxDiscount.toFixed(2)}
              percentage points off the carded rate.
            </p>
            <p className="mt-2 text-sm text-muted">
              Showing fictional demonstration model: {activeModel.name} v
              {activeModel.version}.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {activeModel.description ?? "No model description supplied."}
            </p>
            <PrintGuideButton className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-panel" />
          </div>
          <div className="grid grid-cols-3 self-end border-y border-border text-center">
            <div className="py-4">
              <p className="text-xs text-muted">Raw weight total</p>
              <p className="tnum mt-1 text-2xl font-semibold">
                {totalWeight.toFixed(1)}
              </p>
            </div>
            <div className="border-x border-border py-4">
              <p className="text-xs text-muted">No-discount boundary</p>
              <p className="tnum mt-1 text-2xl font-semibold">
                {activeModel.rateCurve.neutralScore}
              </p>
            </div>
            <div className="py-4">
              <p className="text-xs text-muted">Factors</p>
              <p className="tnum mt-1 text-2xl font-semibold">{factorCount}</p>
            </div>
          </div>
        </div>
      </section>

      <FlowDiagram />
      <FormulaStrip />
      <GuidePolicyNotes
        description="These rules determine which fields are active and how the score fits into the wider home-loan decision record."
        notes={CURRENT_HOME_RULES}
      />
      <HomeRateRoles rateBands={guidePolicy.rateBands} />
      <ActiveEconomicPolicyDetails
        expectedLossPolicy={guidePolicy.expectedLossPolicy}
      />
      <ScoreBandDiagram bands={scoreBands} />
      <CategoryRings stats={stats} />
      <FactorHeatmap stats={stats} />
      <ActiveScoreModelDetails categories={stats} model={activeModel} />
      <AdjustmentCurve curve={activeModel.rateCurve} />

      <section className="border-y border-border py-5 text-sm text-muted">
        <h2 className="text-sm font-semibold text-ink">Notes for staff</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <p>Scores are clamped to 0-100 and rounded to two decimals.</p>
          <p>
            Each factor has a governed fallback score. Most unknown inputs are
            neutral, but staff should still complete the evidence needed for
            warnings and approval review.
          </p>
          <p>
            The model label above identifies the fictional policy used by the
            active calculation.
          </p>
        </div>
      </section>
    </div>
  );
}
