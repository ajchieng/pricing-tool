import { PrintGuideButton } from "./PrintGuideButton";
import Link from "next/link";
import { fmtMoney, fmtPct } from "@/lib/format";
import {
  getCommercialGuidePolicy,
  type CommercialPricingGuidePolicy,
} from "./demo-guide-policy";
import { scoreModelCategoryRollups } from "@/lib/pricing/score-guide-data";
import {
  isDiscountEntitlementCurve,
  scoreToPricingAdjustmentWithCurve,
} from "@/lib/pricing/score-engine";
import { buttonClass } from "@/components/ui/Button";
import { GuidePolicyNotes } from "@/components/score-guide/GuidePolicyNotes";
import { ScoreGuideTabs } from "@/components/score-guide/ScoreGuideTabs";
import { ActiveScoreModelDetails } from "@/components/score-guide/ActiveScoreModelDetails";
import { ActiveEconomicPolicyDetails } from "@/components/score-guide/ActiveEconomicPolicyDetails";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import {
  SCORE_BAND_COLORS,
  SCORE_CATEGORY_COLORS,
  SCORE_CHART_GRID,
  SCORE_CHART_TRACK,
  scoreSoftFill,
} from "@/components/score-guide/visual-tokens";
import type {
  CustomerScoreBandConfig,
  CustomerScoreModelConfig,
  CustomerScoreRateCurveConfig,
} from "@/lib/pricing/types";
import { PUBLISHED_RATE_ROLE_LABELS } from "@/lib/pricing/rate-role";
import { labelCommercialLoanType } from "@/lib/pricing/commercial/labels";

// Semantic category colours, shared with the home and personal score guides so
// all three verticals read the same. The commercial accent (blue) drives the
// brand chips via [data-product="commercial"]; category hues stay meaning-coded.
const FLOW_STEPS = [
  {
    label: "Inputs",
    value: "risk + loan + relationship + strategic",
    detail: "Staff enter the business scenario once.",
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
    detail: "Subtracted from the selected facility base rate.",
  },
];

const CURRENT_COMMERCIAL_RULES = [
  {
    title: "One quote represents one facility",
    detail:
      "Facility type controls the active structure fields. Term loans use a facility amount, overdrafts use a revolving limit, equipment finance derives the financed amount from purchase funding, and commercial property distinguishes purchases from refinances.",
  },
  {
    title: "Security belongs to the facility",
    detail:
      "A facility records 1–10 securities and exactly one primary item. The primary type supplies the existing security-type score factor; complete assessed values are summed for aggregate coverage.",
  },
  {
    title: "Incomplete security is not partially counted",
    detail:
      "If any secured item has no assessed value, total security value and coverage remain unassessed. The quote stays saveable but carries a specific warning and manager escalation. An unsecured facility is one sole primary unsecured record.",
  },
  {
    title: "Customer Equity Contribution has no direct score weight",
    detail:
      "Equipment Finance and Commercial Property purchases derive amount financed from purchase price less Customer Equity Contribution. Commercial Property refinances keep direct facility amount entry and do not accept purchase funding. The derived amount flows through limits, fees, DSCR, profitability, capital exposure, coverage and the facility-amount factor. Purchase funding is not scored directly and never becomes assessed security value automatically.",
  },
  {
    title: "Relationship facts exclude deposit balances",
    detail:
      "Deposit and savings balances are not an active quote or score input. Operating in the region is a nullable Relationship fact, so an omitted answer stays neutral. VIP status and requested-rate pressure are governed Strategic factors; their active raw weights and normalised influence are shown below.",
  },
  {
    title: "Market evidence uses the bundled sample catalogue",
    detail:
      "Selecting a sample product in Market Search checks its lending area, prefills an equivalent fictional commercial facility and attaches market evidence. Saving the quote freezes a versioned evidence snapshot; the resolved rate supplies the competitor score fact when the model contains it. The requested rate remains unchanged.",
  },
  {
    title: "Channel opens the commercial context",
    detail:
      "Direct, Online and Broker are the opening channel choices. Broker name and company are captured only for Broker and never score. Online quotes always normalise commission to zero.",
  },
  {
    title: "Scenario previews are temporary",
    detail:
      "A customer-rate scenario recalculates DSCR, margin, profitability, capital and approval for comparison. It is saved only after staff explicitly apply it to the formal requested-rate field.",
  },
  {
    title: "Largest-customer concentration uses a governed cutoff",
    detail:
      "Staff answer Yes or No to whether the largest customer contributes more than the active revenue-share threshold. The cutoff is governed under Commercial policy thresholds and is snapshotted on every saved quote.",
  },
  {
    title: "Overdraft exposure has two purposes",
    detail:
      "Annual P&L uses expected utilised exposure. APS 112 regulatory exposure uses current drawings plus the CCF-adjusted undrawn commitment. Amortising facilities use full exposure for annual P&L.",
  },
  {
    title: "Facility fees stay outside profitability",
    detail:
      "Product establishment, documentation and annual line fees are displayed for context and are not recognised as profitability income. Separate effective quote-level upfront and monthly fees are recognised in first-year profitability. Annual operating assumptions come from governed channel-by-facility defaults when quote fields are blank.",
  },
  {
    title: "Capital confirmation is required",
    detail:
      "The quote snapshots the APS 112 classification, regulatory exposure, risk weight, allocated capital and indicative ROE. An unconfirmed classification is conservative and blocks acceptance; demo overrides require a reason and are recorded in browser history.",
  },
];

function formatNumber(value: number, dp = 2) {
  return value.toFixed(dp).replace(/\.00$/, "");
}

function categoryStats(model: CustomerScoreModelConfig) {
  return scoreModelCategoryRollups(model)
    .filter((rollup) => rollup.factors.length > 0)
    .map((rollup) => ({
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
          ["Suggested rate", "baseRate - scoreDiscount"],
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

function FacilityBaseRates({
  curve,
  facilities,
}: {
  curve: CustomerScoreRateCurveConfig;
  facilities: CommercialPricingGuidePolicy["facilities"];
}) {
  const maxRate = Math.max(
    ...facilities.flatMap((config) => config.rates.map((rate) => rate.rate)),
  );
  const neutralMargin = curve.neutralMargin ?? 0;
  const discountOnly = isDiscountEntitlementCurve(curve);
  const maxMargin = discountOnly ? 0 : neutralMargin + curve.maxLoading;

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Facility base rates</h2>
        <p className="text-sm text-muted">
          Every facility starts from its selected base rate. The customer-score
          discount is subtracted unless an explicit minimum customer rate
          prevents some or all of it.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {facilities.map((config) => {
          return (
            <div
              key={config.facilityType}
              className="border-t border-border py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
            >
              <p className="text-sm font-medium text-ink">{config.label}</p>
              <p className="mt-1 text-xs text-muted">{config.baseRateName}</p>
              <div className="mt-3 divide-y divide-border">
                {config.rates.map((rate) => {
                  const minMargin = Math.max(
                    discountOnly
                      ? -curve.maxDiscount
                      : (config.marginPolicy.scoreMarginFloorPct ?? 0),
                    discountOnly
                      ? -curve.maxDiscount
                      : neutralMargin - curve.maxDiscount,
                    rate.pricingRole === "minimum_customer_rate"
                      ? 0
                      : -Infinity,
                  );
                  return (
                    <div key={rate.loanType} className="py-3 first:pt-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium text-muted">
                          {labelCommercialLoanType(rate.loanType)}
                        </span>
                        <span className="tnum text-xl font-semibold text-ink">
                          {fmtPct(rate.rate)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-border">
                        <div
                          className="h-full rounded bg-brand"
                          style={{ width: `${(rate.rate / maxRate) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Suggested {fmtPct(rate.rate + minMargin)}–
                        {fmtPct(rate.rate + maxMargin)} ·{" "}
                        {PUBLISHED_RATE_ROLE_LABELS[rate.pricingRole]}
                        {rate.pricingRole === "minimum_customer_rate"
                          ? " · quoted rates cannot fall below this rate"
                          : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
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
            The band is a label for the weighted score. The discount still uses
            the exact score.
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

function MarginCurve({
  curve,
  marginFloor,
}: {
  curve: CustomerScoreRateCurveConfig;
  marginFloor: number;
}) {
  const discountOnly = isDiscountEntitlementCurve(curve);
  const neutralMargin = curve.neutralMargin ?? 0;
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
    const movement = scoreToPricingAdjustmentWithCurve(value, curve);
    const plottedValue = discountOnly ? -movement : movement;
    const x = (value / 100) * 300;
    return `${x.toFixed(2)},${projectY(plottedValue).toFixed(2)}`;
  }).join(" ");

  const yTicks: Array<[number, string]> = discountOnly
    ? [
        [yMax, `${yMax.toFixed(2)}%`],
        [yMax / 2, `${(yMax / 2).toFixed(2)}%`],
        [0, "0.00%"],
      ]
    : [
        [yMax, `${yMax.toFixed(2)}%`],
        [neutralMargin, `${neutralMargin.toFixed(2)}%`],
        [yMin, `${yMin.toFixed(2)}%`],
      ];

  const curveFacts = discountOnly
    ? [
        [
          "No-discount boundary",
          "Score 40",
          "No rate loading applies below the boundary.",
        ],
        [
          "Progressive entitlement",
          "Scores 41-99",
          "Each score point earns 1/60 of the maximum discount.",
        ],
        [
          "Maximum discount",
          "Score 100",
          `${fmtPct(curve.maxDiscount)} subtracted from the selected base rate.`,
        ],
      ]
    : [
        [
          "Legacy neutral pivot",
          `Score ${curve.neutralScore}`,
          `${neutralMargin.toFixed(2)}% margin over base`,
        ],
        [
          "Legacy best score",
          `Score >= ${curve.neutralScore}`,
          `-${curve.discountSlope.toFixed(3)}% per score point, floor ${yMin.toFixed(2)}%`,
        ],
        [
          "Legacy weak score",
          `Score < ${curve.neutralScore}`,
          `+${curve.loadingSlope.toFixed(3)}% per score point, capped at ${yMax.toFixed(2)}%`,
        ],
      ];

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          {discountOnly
            ? "Score to discount curve"
            : "Legacy score to margin curve"}
        </h2>
        <p className="text-sm text-muted">
          {discountOnly
            ? `Scores at or below ${curve.neutralScore} receive no discount. Higher scores progressively earn up to ${fmtPct(curve.maxDiscount)}, which is subtracted directly from the selected base rate.`
            : `This legacy model adds or removes margin around score ${curve.neutralScore}. Its governed margin floor of ${fmtPct(marginFloor)} still applies only to legacy calculations.`}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <svg
          role="img"
          aria-label={
            discountOnly
              ? "Line chart showing customer score to rate discount"
              : "Line chart showing legacy customer score to margin over base rate"
          }
          viewBox="-40 0 376 172"
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
          {curveFacts.map(([label, value, detail]) => (
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

// DSCR is EBITDA / total annual debt service. Higher is stronger, so the bands
// run left (insufficient) to right (strong). Domain 0..2.5x leaves headroom
// above the strong benchmark.
function DscrBands({
  dscrBands,
}: {
  dscrBands: CommercialPricingGuidePolicy["dscrBands"];
}) {
  const domain = 2.5;
  const bands = [
    {
      label: "Insufficient",
      range: "below 1.00x",
      from: 0,
      to: 1.0,
      color: SCORE_BAND_COLORS.weak,
      detail: "EBITDA does not cover debt service — escalates to exception.",
    },
    {
      label: "Marginal",
      range: `1.00x–${dscrBands.acceptableMin.toFixed(2)}x`,
      from: 1.0,
      to: dscrBands.acceptableMin,
      color: SCORE_BAND_COLORS.watch,
      detail: "Below the acceptable benchmark and escalates for review.",
    },
    {
      label: "Acceptable",
      range: `${dscrBands.acceptableMin.toFixed(2)}x–${dscrBands.strongMin.toFixed(2)}x`,
      from: dscrBands.acceptableMin,
      to: dscrBands.strongMin,
      color: SCORE_BAND_COLORS.standard,
      detail: "Covers debt service within policy.",
    },
    {
      label: "Strong",
      range: `${dscrBands.strongMin.toFixed(2)}x or better`,
      from: dscrBands.strongMin,
      to: domain,
      color: SCORE_BAND_COLORS.excellent,
      detail: "EBITDA covers debt service with strong headroom.",
    },
  ];

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Cash-flow cover (DSCR)</h2>
        <p className="text-sm text-muted">
          Debt service cover is EBITDA divided by total annual debt service.
          Missing EBITDA means cash flow is not assessed and the quote
          escalates.
        </p>
      </div>
      <div className="relative">
        <div className="flex h-12 overflow-hidden rounded border border-border">
          {bands.map((band) => (
            <div
              key={band.label}
              className="flex min-w-0 flex-col items-center justify-center border-r border-white/60 px-2 last:border-r-0"
              style={{
                width: `${((band.to - band.from) / domain) * 100}%`,
                backgroundColor: scoreSoftFill(band.color),
                color: band.color,
              }}
            >
              <span className="text-xs font-semibold">{band.label}</span>
              <span className="text-[11px] text-muted">{band.range}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-2 h-4 text-xs text-faint">
          {[
            { label: "0x", value: 0 },
            { label: "1.0x", value: 1.0 },
            {
              label: `${dscrBands.acceptableMin.toFixed(1)}x`,
              value: dscrBands.acceptableMin,
            },
            {
              label: `${dscrBands.strongMin.toFixed(1)}x`,
              value: dscrBands.strongMin,
            },
            { label: `${domain.toFixed(1)}x`, value: domain },
          ].map((tick, index, arr) => (
            <span
              key={tick.label}
              className="absolute whitespace-nowrap"
              style={{
                left: `${(tick.value / domain) * 100}%`,
                transform:
                  index === 0
                    ? "translateX(0)"
                    : index === arr.length - 1
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bands.map((band) => (
          <div key={band.label} className="border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: band.color }}
              />
              <p className="text-sm font-semibold">{band.label}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">{band.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalEscalation({
  approval,
}: {
  approval: CommercialPricingGuidePolicy["approval"];
}) {
  const steps = [
    {
      tier: "Senior",
      title: "Senior exposure",
      value: fmtMoney(approval.seniorExposure),
      detail: "Facilities above this escalate to senior sign-off.",
    },
    {
      tier: "Review",
      title: "Review exposure",
      value: fmtMoney(approval.reviewExposure),
      detail: "The largest facilities require a full credit review.",
    },
    {
      tier: "Manager",
      title: "Requested-rate discount",
      value: fmtPct(approval.requestedBelowIndicativeManager),
      detail: "Requested rate below the suggested rate by more than this.",
    },
    {
      tier: "Senior",
      title: "Requested-rate discount",
      value: fmtPct(approval.requestedBelowIndicativeSenior),
      detail: "Deeper discounts escalate past the manager to senior sign-off.",
    },
  ];
  const tierColor = (tier: string) =>
    tier === "Review"
      ? SCORE_BAND_COLORS.weak
      : tier === "Senior"
        ? SCORE_BAND_COLORS.strong
        : SCORE_BAND_COLORS.watch;

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Floors and approvals</h2>
        <p className="text-sm text-muted">
          The customer score sets the discount. Hard-NIM, exposure and other
          approval rules still apply afterwards, but they do not turn the
          discount into a rate loading.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={`${step.tier}-${step.title}`}
            className="relative border-t-2 pt-4"
            style={{ borderTopColor: tierColor(step.tier) }}
          >
            <span
              className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                color: tierColor(step.tier),
                backgroundColor: scoreSoftFill(tierColor(step.tier)),
              }}
            >
              {step.tier} review
            </span>
            <p className="mt-3 text-sm font-medium text-ink">{step.title}</p>
            <p className="tnum mt-1 text-2xl font-semibold text-ink">
              {step.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeesAndFloor({
  guidePolicy,
}: {
  guidePolicy: CommercialPricingGuidePolicy;
}) {
  const discountOnly = isDiscountEntitlementCurve(
    guidePolicy.scoreModel.rateCurve,
  );
  const primaryFees =
    guidePolicy.facilities.find((item) => item.facilityType === "term_loan")
      ?.fees ?? guidePolicy.facilities[0].fees;
  const overdraftFees =
    guidePolicy.facilities.find((item) => item.facilityType === "overdraft")
      ?.fees ?? primaryFees;
  const equipmentFees =
    guidePolicy.facilities.find(
      (item) => item.facilityType === "equipment_finance",
    )?.fees ?? primaryFees;
  return (
    <section className="border-y border-border">
      <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
        {[
          discountOnly
            ? [
                "Maximum score discount",
                fmtPct(guidePolicy.scoreModel.rateCurve.maxDiscount),
                "Earned in full at customer score 100.",
              ]
            : [
                "Legacy score margin floor",
                fmtPct(guidePolicy.marginPolicy.scoreMarginFloorPct ?? 0),
                "Retained for historical pricing only.",
              ],
          [
            "Establishment fee",
            fmtPct(primaryFees.establishmentFeePct),
            `Minimum ${fmtMoney(primaryFees.establishmentFeeMin)}.`,
          ],
          [
            "Overdraft line fee",
            fmtPct(overdraftFees.overdraftLineFeePct),
            "Per annum on the limit, overdrafts only.",
          ],
          [
            "Equipment doc fee",
            fmtMoney(equipmentFees.equipmentDocumentationFee),
            "Equipment finance only.",
          ],
        ].map(([label, value, detail]) => (
          <div key={label} className="py-4 md:px-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="tnum mt-1 text-xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CommercialScoreGuide() {
  const guidePolicy = getCommercialGuidePolicy();
  const scoreModel = guidePolicy.scoreModel;
  const stats = categoryStats(scoreModel);
  const scoreBands = scoreBandsForDiagram(scoreModel.bands);
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
      <ScoreGuideTabs
        active="score"
        guidePath={PRODUCT_AREAS.commercial.guidePath}
      />
      <section className="border-b border-border pb-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              Pricing Tool · Commercial Loans
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
              Commercial loan pricing guide
            </h1>
            <p className="mt-2 text-xs leading-5 text-muted">
              Fictional demonstration assumptions. Indicative examples only; not
              an offer or credit decision.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Commercial loans use a customer score — a weighted average of
              business risk, DSCR, security, facility structure, relationship
              value and requested-rate pressure — to earn a discount from the
              selected facility base rate. This page documents the score,
              cash-flow, fee and approval model.
            </p>
            <p className="mt-2 text-sm text-muted">
              Showing fictional demonstration model: {scoreModel.name} v
              {scoreModel.version}.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {scoreModel.description ?? "No model description supplied."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/commercial-loans/new"
                className={buttonClass("secondary", "sm")}
              >
                New quote
              </Link>
              <PrintGuideButton className={buttonClass("secondary", "sm")} />
            </div>
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
                {scoreModel.rateCurve.neutralScore}
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
        description="Commercial pricing is facility-led. These rules explain how facility structure, security, purchase funding, profitability and capital interact with the customer score."
        notes={CURRENT_COMMERCIAL_RULES}
      />
      <FacilityBaseRates
        curve={scoreModel.rateCurve}
        facilities={guidePolicy.facilities}
      />
      <ActiveEconomicPolicyDetails
        expectedLossPolicy={guidePolicy.expectedLossPolicy}
      />
      <ScoreBandDiagram bands={scoreBands} />
      <CategoryRings stats={stats} />
      <FactorHeatmap stats={stats} />
      <ActiveScoreModelDetails categories={stats} model={scoreModel} />
      <MarginCurve
        curve={scoreModel.rateCurve}
        marginFloor={guidePolicy.marginPolicy.hardMinimumMargin}
      />
      <DscrBands dscrBands={guidePolicy.dscrBands} />
      <ApprovalEscalation approval={guidePolicy.approval} />
      <FeesAndFloor guidePolicy={guidePolicy} />

      <section className="border-y border-border py-5 text-sm text-muted">
        <h2 className="text-sm font-semibold text-ink">Notes for staff</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <p>Scores are clamped to 0-100 and rounded to two decimals.</p>
          <p>
            Each factor has a governed fallback score. Missing DSCR or security
            evidence can still create warnings and approval escalation.
          </p>
          <p>
            The page reads the same fictional commercial policy as the quote
            calculation.
          </p>
        </div>
      </section>
    </div>
  );
}
