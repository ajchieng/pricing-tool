import { PrintGuideButton } from "./PrintGuideButton";
import Link from "next/link";
import { fmtMoney, fmtPct } from "@/lib/format";
import { scoreModelCategoryRollups } from "@/lib/pricing/score-guide-data";
import {
  discountOnlyRateCurve,
  scoreToPricingAdjustmentWithCurve,
} from "@/lib/pricing/score-engine";
import { personalMaxDiscountsForCurve } from "@/lib/pricing/personal/discount-policy";
import {
  PERSONAL_AFFORDABILITY,
  PERSONAL_APPROVAL,
  PERSONAL_LOAN_LIMITS,
  PERSONAL_RATE_BOUNDS,
} from "@/lib/pricing/personal/config";
import { getPersonalGuidePolicy } from "./demo-guide-policy";
import type {
  PersonalApprovalRuleConfig,
  PersonalProductConfig,
} from "@/lib/pricing/personal/types";
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
import {
  PUBLISHED_RATE_ROLE_LABELS,
  publishedRateRole,
} from "@/lib/pricing/rate-role";

// Semantic category colours, shared with the home loan score guide so both
// verticals read the same. The personal accent (purple) drives the brand chips
// via [data-product="personal"]; category hues stay meaning-coded.
const CURRENT_PERSONAL_RULES = [
  {
    title: "Governed products set hard limits",
    detail:
      "The active product and carded-rate catalogue controls amount and term eligibility. A product-specific limit breach is a hard stop. If no governed product or rate matches, the quote carries a personal-product fallback warning.",
  },
  {
    title: "Requested rate is a governed score factor",
    detail:
      "Requested-rate pressure sits inside the Strategic category. Its active raw weight and normalised influence are shown below. Separate approval rules can still escalate a requested rate that is materially below the suggested rate.",
  },
  {
    title: "Market evidence uses the bundled sample catalogue",
    detail:
      "Selecting a sample product in Market Search checks its lending area, prefills an equivalent fictional personal-loan product and attaches market evidence. Saving the quote freezes a versioned evidence snapshot; the resolved rate supplies the competitor score fact when the model contains it. The requested rate remains unchanged.",
  },
  {
    title: "Multiple Equifax scores are averaged",
    detail:
      "Enter each applicant's Equifax score separately. Their arithmetic mean is the only credit-score value used by pricing, warnings and approval rules; Retention clears both the individual scores and mean.",
  },
  {
    title: "Scenario previews are temporary",
    detail:
      "A customer-rate scenario recalculates repayments, affordability, profitability, capital and approval for comparison. It is saved only after staff explicitly apply it to the formal requested-rate field.",
  },
  {
    title: "Stream selects the assessment path",
    detail:
      "New to Bank starts without member tenure, Existing Member activates relationship tenure, and Retention replaces credit and employment questions with current rate and arrears history. The active model's category allocation is shown below.",
  },
  {
    title: "Retention constrains the effective rate",
    detail:
      "No recent issue uses the sharper of current and ordinary pricing; an 18-month issue permits the configured share of the available additional discount; 12-month arrears retains the current rate. A requested rate below that constraint is not applied.",
  },
  {
    title: "Broker context is scored only for the Broker channel",
    detail:
      "Broker region, 12-month lender volume and discretion usage stay neutral for Direct and Online channels. Their active raw weights, normalised influence and scoring rules are shown below.",
  },
  {
    title: "Affordability remains an independent guardrail",
    detail:
      "Monthly repayment is compared with net-income surplus after living costs and existing debt repayments. Tight, insufficient or unassessed affordability can escalate approval regardless of a strong customer score.",
  },
  {
    title: "Security selects the product path",
    detail:
      "The quote records whether lending is unsecured or supported by the eligible security type. Unsecured exposure and large total exposure have separate governed approval rules.",
  },
  {
    title: "Profitability and capital are snapshotted",
    detail:
      "The saved quote records first-year profitability, including effective quote fees, and indicative APS 112 capital allocation using the quoted exposure. An unconfirmed classification uses a conservative risk weight and blocks acceptance.",
  },
  {
    title: "The saved quote is the audit record",
    detail:
      "Saving records a complete calculation, input and fictional policy snapshot in this browser. Revisions preserve the original; printing and JSON exports use the saved snapshot.",
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

function FlowDiagram({ curve }: { curve: CustomerScoreRateCurveConfig }) {
  const caps = personalMaxDiscountsForCurve(curve);
  const hasSecurityCaps = caps.secured !== caps.unsecured;
  const steps = [
    {
      label: "Inputs",
      value: "risk + loan + relationship + strategic",
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
      value: `0-${caps.secured.toFixed(2)} percentage points`,
      detail: hasSecurityCaps
        ? `Secured maximum; unsecured is capped at ${caps.unsecured.toFixed(2)} points.`
        : "Subtracted from the product carded rate.",
    },
  ];
  return (
    <section className="border-y border-border">
      <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map((step, index) => (
          <div key={step.label} className="relative py-4 md:px-4">
            {index < steps.length - 1 && (
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
          ["Suggested rate", "cardedRate + adjustment(score)"],
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

function CardedRates({
  products,
  discountCaps,
}: {
  products: PersonalProductConfig[];
  discountCaps: { secured: number; unsecured: number };
}) {
  const rows = [...products].sort((a, b) => a.cardedRate - b.cardedRate);
  const maxRate = Math.max(
    ...rows.map((row) => row.cardedRate),
    PERSONAL_RATE_BOUNDS.ceiling,
  );
  const governed = rows.some((row) => row.id != null);
  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Product carded rates</h2>
        <p className="text-sm text-muted">
          {governed
            ? "These active governed products and rates are the starting points the score adjusts from."
            : "No active governed product/rate matched, so this guide is showing the labelled code fallbacks used for resilience and tests."}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`${row.id ?? "fallback"}-${row.name}`}
            className="border-t border-border py-4 first:border-t-0 lg:border-t-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink">{row.name}</p>
              <p className="tnum text-2xl font-semibold text-ink">
                {fmtPct(row.cardedRate)}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-border">
              <div
                className="h-full rounded bg-brand"
                style={{ width: `${(row.cardedRate / maxRate) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {row.securityType === "secured" ? "Secured" : "Unsecured"} ·
              amount{" "}
              {row.minLoanAmount == null
                ? "no configured minimum"
                : `from ${fmtMoney(row.minLoanAmount)}`}{" "}
              to{" "}
              {row.maxLoanAmount == null
                ? "no configured maximum"
                : fmtMoney(row.maxLoanAmount)}{" "}
              · term {row.minTermMonths ?? "no minimum"}–
              {row.maxTermMonths ?? "no maximum"} months. Suggested rate can
              fall to{" "}
              {fmtPct(
                publishedRateRole(row.pricingRole) === "minimum_customer_rate"
                  ? row.cardedRate
                  : row.cardedRate - discountCaps[row.securityType],
              )}{" "}
              and is capped at {fmtPct(PERSONAL_RATE_BOUNDS.ceiling)}.
            </p>
            <p className="mt-1 text-xs font-medium text-ink">
              {PUBLISHED_RATE_ROLE_LABELS[publishedRateRole(row.pricingRole)]}
              {publishedRateRole(row.pricingRole) === "minimum_customer_rate"
                ? " · the suggested rate cannot fall below this rate"
                : ""}
            </p>
          </div>
        ))}
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
  const caps = personalMaxDiscountsForCurve(curve);
  const hasSecurityCaps = discountOnly && caps.secured !== caps.unsecured;
  const yMin = discountOnly ? 0 : neutralMargin - curve.maxDiscount;
  const yMax = discountOnly
    ? curve.maxDiscount
    : neutralMargin + curve.maxLoading;
  const pad = (yMax - yMin) * 0.08 || 0.1;
  const domainMin = yMin - pad;
  const domainMax = yMax + pad;

  const projectY = (value: number) =>
    20 + ((domainMax - value) / (domainMax - domainMin)) * 120;

  const series = hasSecurityCaps
    ? [
        {
          label: "Secured",
          curve: discountOnlyRateCurve(caps.secured, curve.neutralScore),
          color: "var(--brand)",
        },
        {
          label: "Unsecured",
          curve: discountOnlyRateCurve(caps.unsecured, curve.neutralScore),
          color: SCORE_CATEGORY_COLORS.strategic.color,
        },
      ]
    : [{ label: "Score discount", curve, color: "var(--brand)" }];
  const pointsForCurve = (seriesCurve: CustomerScoreRateCurveConfig) =>
    Array.from({ length: 101 }, (_, value) => {
      const adjustment = scoreToPricingAdjustmentWithCurve(value, seriesCurve);
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
          scores earn a continuous share of the applicable maximum
          {hasSecurityCaps
            ? `: ${caps.secured.toFixed(2)}% secured or ${caps.unsecured.toFixed(2)}% unsecured.`
            : ` of ${curve.maxDiscount.toFixed(2)}%.`}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <svg
          role="img"
          aria-label={
            hasSecurityCaps
              ? "Line chart showing secured and unsecured customer score discounts"
              : "Line chart showing customer score to discount"
          }
          viewBox="-36 0 372 172"
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
          {series.map((item) => (
            <polyline
              key={item.label}
              points={pointsForCurve(item.curve)}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
            />
          ))}
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
                  "Each point earns an equal share of the applicable maximum discount.",
                ],
                ...(hasSecurityCaps
                  ? [
                      [
                        "Secured maximum",
                        "Score 100",
                        `${caps.secured.toFixed(2)} percentage points`,
                      ],
                      [
                        "Unsecured maximum",
                        "Score 100",
                        `${caps.unsecured.toFixed(2)} percentage points`,
                      ],
                    ]
                  : [
                      [
                        "Maximum discount",
                        "Score 100",
                        `${curve.maxDiscount.toFixed(2)} percentage points`,
                      ],
                    ]),
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
          ).map(([label, value, detail]) => {
            const seriesColor =
              label === "Secured maximum"
                ? "var(--brand)"
                : label === "Unsecured maximum"
                  ? SCORE_CATEGORY_COLORS.strategic.color
                  : null;
            return (
              <div
                key={label}
                className="border-t border-border py-3 first:border-t-0"
              >
                <p className="flex items-center gap-2 text-sm text-muted">
                  {seriesColor ? (
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: seriesColor }}
                    />
                  ) : null}
                  {label}
                </p>
                <p className="mt-1 font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted">{detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Affordability compares the quoted repayment with monthly surplus. Bands run
// on repayment-as-a-share-of-surplus, so lower is better (opposite of the score
// bands). Domain 0..120 leaves room for the open-ended "insufficient" tail.
function AffordabilityBands() {
  const bands = [
    {
      label: "Comfortable",
      range: `up to ${PERSONAL_AFFORDABILITY.comfortableMaxPct}%`,
      from: 0,
      to: PERSONAL_AFFORDABILITY.comfortableMaxPct,
      color: SCORE_BAND_COLORS.excellent,
      detail: `Repayment uses ${PERSONAL_AFFORDABILITY.comfortableMaxPct}% or less of the available monthly surplus.`,
    },
    {
      label: "Adequate",
      range: `up to ${PERSONAL_AFFORDABILITY.adequateMaxPct}%`,
      from: PERSONAL_AFFORDABILITY.comfortableMaxPct,
      to: PERSONAL_AFFORDABILITY.adequateMaxPct,
      color: SCORE_BAND_COLORS.standard,
      detail: "Still serviceable, but with less spare capacity.",
    },
    {
      label: "Tight",
      range: `up to ${PERSONAL_AFFORDABILITY.tightMaxPct}%`,
      from: PERSONAL_AFFORDABILITY.adequateMaxPct,
      to: PERSONAL_AFFORDABILITY.tightMaxPct,
      color: SCORE_BAND_COLORS.watch,
      detail: "Triggers review because spare capacity is limited.",
    },
    {
      label: "Insufficient",
      range: `over ${PERSONAL_AFFORDABILITY.tightMaxPct}%`,
      from: PERSONAL_AFFORDABILITY.tightMaxPct,
      to: 120,
      color: SCORE_BAND_COLORS.weak,
      detail: "Escalates to exception because repayment exceeds surplus.",
    },
  ];
  const domain = 120;

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Affordability bands</h2>
        <p className="text-sm text-muted">
          Repayment as a share of monthly surplus (net income less living
          expenses and existing debt repayments). Lower is stronger.
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
            { label: "0%", value: 0 },
            {
              label: `${PERSONAL_AFFORDABILITY.comfortableMaxPct}%`,
              value: PERSONAL_AFFORDABILITY.comfortableMaxPct,
            },
            {
              label: `${PERSONAL_AFFORDABILITY.adequateMaxPct}%`,
              value: PERSONAL_AFFORDABILITY.adequateMaxPct,
            },
            {
              label: `${PERSONAL_AFFORDABILITY.tightMaxPct}%`,
              value: PERSONAL_AFFORDABILITY.tightMaxPct,
            },
            { label: `${PERSONAL_AFFORDABILITY.tightMaxPct}%+`, value: domain },
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
  rules,
}: {
  rules: PersonalApprovalRuleConfig[];
}) {
  const fallbackSteps = [
    {
      tier: "Manager",
      title: "Unsecured amount",
      value: fmtMoney(PERSONAL_APPROVAL.unsecuredManagerAmount),
      detail: `Unsecured lending is outside policy above ${fmtMoney(PERSONAL_LOAN_LIMITS.maxUnsecuredLoanAmount)}.`,
    },
    {
      tier: "Manager",
      title: "Large amount",
      value: fmtMoney(PERSONAL_APPROVAL.largeAmountManager),
      detail: "Any personal-loan exposure above this escalates to a manager.",
    },
    {
      tier: "Manager",
      title: "Requested-rate discount",
      value: fmtPct(PERSONAL_APPROVAL.requestedBelowSuggestedManager),
      detail: "Requested rate below the suggested rate by more than this.",
    },
    {
      tier: "Senior",
      title: "Requested-rate discount",
      value: fmtPct(PERSONAL_APPROVAL.requestedBelowSuggestedSenior),
      detail: "Deeper discounts escalate past the manager to senior sign-off.",
    },
  ];
  const activeRules = rules
    .filter((rule) => rule.active && rule.approvalLevel !== "none")
    .sort((a, b) => a.priority - b.priority || a.id - b.id);
  const steps =
    activeRules.length > 0
      ? activeRules.map((rule) => ({
          tier:
            rule.approvalLevel.charAt(0).toUpperCase() +
            rule.approvalLevel.slice(1),
          title: rule.name,
          value:
            rule.conditionType === "loan_amount" ||
            rule.conditionType === "unsecured_amount"
              ? `${operatorLabel(rule.conditionOperator)} ${fmtMoney(Number(rule.conditionValue))}`
              : rule.conditionType === "requested_below_suggested"
                ? `${operatorLabel(rule.conditionOperator)} ${fmtPct(Number(rule.conditionValue))}`
                : "When triggered",
          detail: rule.reasonText,
        }))
      : fallbackSteps;

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Approval escalation</h2>
        <p className="text-sm text-muted">
          Approval is driven by policy flags as well as the suggested rate. A
          strong score does not override serviceability or exposure limits.
          {activeRules.length > 0
            ? " The rows below are the active governed rules."
            : " No governed rules are active, so the calculator's labelled fallback rules are shown."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <div
            key={`${step.tier}-${step.title}`}
            className="relative border-t-2 pt-4"
            style={{
              borderTopColor:
                step.tier !== "Manager"
                  ? SCORE_BAND_COLORS.weak
                  : SCORE_BAND_COLORS.watch,
            }}
          >
            <span
              className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                color:
                  step.tier !== "Manager"
                    ? SCORE_BAND_COLORS.weak
                    : SCORE_BAND_COLORS.watch,
                backgroundColor: scoreSoftFill(
                  step.tier !== "Manager"
                    ? SCORE_BAND_COLORS.weak
                    : SCORE_BAND_COLORS.watch,
                ),
              }}
            >
              {step.tier === "Exception"
                ? "Pricing exception"
                : step.tier === "Review"
                  ? "Pricing review"
                  : `${step.tier} review`}
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

function operatorLabel(
  operator: PersonalApprovalRuleConfig["conditionOperator"],
) {
  return {
    lt: "<",
    lte: "≤",
    gt: ">",
    gte: "≥",
    eq: "=",
  }[operator];
}

export default function PersonalScoreGuide() {
  const guidePolicy = getPersonalGuidePolicy();
  const activeModel = guidePolicy.scoreModel;
  const discountCaps = personalMaxDiscountsForCurve(activeModel.rateCurve);
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
      <ScoreGuideTabs
        active="score"
        guidePath={PRODUCT_AREAS.personal.guidePath}
      />
      <section className="border-b border-border pb-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              Pricing Tool · Personal Loans
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
              Personal loan pricing guide
            </h1>
            <p className="mt-2 text-xs leading-5 text-muted">
              Fictional demonstration assumptions. Indicative examples only; not
              an offer or credit decision.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Personal loans use a customer score — a weighted average of loan,
              risk, relationship and strategic factors — to earn a discount of
              up to {discountCaps.secured.toFixed(2)} percentage points for
              secured lending and {discountCaps.unsecured.toFixed(2)} points for
              unsecured lending from the product carded rate. Stream selects the
              customer assessment path, while Channel selects Direct, Online or
              Broker context. This page documents the score, retention
              constraint, affordability and approval model.
            </p>
            <p className="mt-2 text-sm text-muted">
              Showing fictional demonstration model: {activeModel.name} v
              {activeModel.version}.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {activeModel.description ?? "No model description supplied."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/personal-loans/new"
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

      <FlowDiagram curve={activeModel.rateCurve} />
      <FormulaStrip />
      <GuidePolicyNotes
        description="The customer score is one part of the personal-loan result. Product eligibility, affordability, approval and capital checks remain independently binding."
        notes={CURRENT_PERSONAL_RULES}
      />
      <CardedRates
        products={guidePolicy.products}
        discountCaps={discountCaps}
      />
      <ActiveEconomicPolicyDetails
        expectedLossPolicy={guidePolicy.expectedLossPolicy}
      />
      <ScoreBandDiagram bands={scoreBands} />
      <CategoryRings stats={stats} />
      <FactorHeatmap stats={stats} />
      <ActiveScoreModelDetails categories={stats} model={activeModel} />
      <AdjustmentCurve curve={activeModel.rateCurve} />
      <AffordabilityBands />
      <ApprovalEscalation rules={guidePolicy.approvalRules} />

      <section className="border-y border-border py-5 text-sm text-muted">
        <h2 className="text-sm font-semibold text-ink">Notes for staff</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <p>Scores are clamped to 0-100 and rounded to two decimals.</p>
          <p>
            Each factor has a governed fallback score. Retention replaces credit
            and employment inputs, but repayment affordability remains required
            and independently binding.
          </p>
          <p>
            The quote workspace identifies the fictional policy used to keep a
            calculation explainable.
          </p>
        </div>
      </section>
    </div>
  );
}
