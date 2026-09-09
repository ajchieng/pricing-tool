import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
  Info,
  Minus,
  X,
} from "lucide-react";
import { ComparisonActions } from "@/components/market-search/ComparisonActions";
import { buttonClass } from "@/components/ui/Button";
import {
  hasStructuredFeature,
  monthlyPrincipalAndInterestRepayment,
  summariseFees,
} from "@/lib/market/compare/calculations";
import {
  displayLenderName,
  formatDate,
  formatRate,
  labelFromCode,
  safeExternalHref,
} from "@/lib/market/search/format";
import {
  searchParamsFor,
  toggleComparisonParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import type { RankedProduct } from "@/lib/demo/market-search";
import { MARKET_VERTICALS, marketSearchHref } from "@/lib/market/verticals";

type ProductMetrics = {
  result: RankedProduct;
  lender: string;
  estimate: number;
  estimateKind: "monthly_repayment" | "annual_interest";
  fees: ReturnType<typeof summariseFees>;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLvr(result: RankedProduct): string {
  const { minLvr, maxLvr } = result.rate;
  if (!minLvr && !maxLvr) return "Not supplied";
  return `${minLvr ?? 0}%–${maxLvr ?? 100}%`;
}

function formatFixedPeriod(months: number | null): string {
  if (!months) return "Not applicable";
  return months % 12 === 0
    ? `${months / 12} year${months === 12 ? "" : "s"}`
    : `${months} months`;
}

function listedFeature(result: RankedProduct, type: string): string {
  return hasStructuredFeature(result.product.features, type)
    ? "Listed"
    : "Not listed";
}

function searchContext(filters: SearchFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.purpose) parts.push(labelFromCode(filters.purpose));
  if (filters.rateType) parts.push(labelFromCode(filters.rateType));
  if (filters.repayment) parts.push(labelFromCode(filters.repayment));
  if (filters.lvr !== null) parts.push(`${filters.lvr}% LVR`);
  if (filters.offset) parts.push("Offset");
  if (filters.redraw) parts.push("Redraw");
  if (filters.extraRepayments) parts.push("Extra repayments");
  if (filters.relationshipManagement) parts.push("Relationship management");
  if (filters.facilityCategory) {
    parts.push(labelFromCode(filters.facilityCategory));
  }
  if (filters.noOngoingFee) parts.push("No periodic fee listed");
  return parts.length ? parts.join(" · ") : "Unfiltered product catalogue";
}

function LowestFlag() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[0.65rem] font-bold text-brand-strong">
      <Check className="size-3" aria-hidden />
      Lowest shown
    </span>
  );
}

function FeatureValue({ value }: { value: string }) {
  const listed = value === "Listed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        listed ? "text-brand-strong" : "text-faint"
      }`}
    >
      {listed ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Minus className="size-3.5" aria-hidden />
      )}
      {value}
    </span>
  );
}

function EligibilitySummary({ metric }: { metric: ProductMetrics }) {
  const items = metric.result.product.eligibility;
  if (!items.length) return <span className="text-faint">Not supplied</span>;

  const itemList = (className: string) => (
    <ul className={className}>
      {items.slice(0, 4).map((item) => (
        <li key={item.id}>
          <strong className="font-semibold text-ink">
            {labelFromCode(item.eligibilityType)}
          </strong>
          {item.additionalInfo ? ` — ${item.additionalInfo}` : ""}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className="market-print-hide">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">
          {items.length} structured item{items.length === 1 ? "" : "s"}
        </summary>
        {itemList("space-y-2 pb-2 text-xs leading-5 text-muted")}
      </details>
      {itemList("market-print-only space-y-1 text-xs leading-4 text-ink")}
    </>
  );
}

function SectionRow({
  label,
  metrics,
  render,
}: {
  label: string;
  metrics: ProductMetrics[];
  render: (metric: ProductMetrics) => React.ReactNode;
}) {
  return (
    <tr className="border-b border-border align-top">
      <th
        scope="row"
        className="w-44 bg-bg px-4 py-3 text-left text-xs font-semibold text-muted"
      >
        {label}
      </th>
      {metrics.map((metric) => (
        <td
          key={metric.result.product.id}
          className="min-w-52 px-4 py-3 text-sm text-ink"
        >
          {render(metric)}
        </td>
      ))}
    </tr>
  );
}

function GroupRow({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  return (
    <tr>
      <th
        colSpan={count + 1}
        className="border-y border-border-strong bg-panel px-4 py-2.5 text-left text-sm font-bold text-ink"
      >
        {children}
      </th>
    </tr>
  );
}

function DesktopComparison({
  metrics,
  filters,
}: {
  metrics: ProductMetrics[];
  filters: SearchFilters;
}) {
  const advertisedMinimum = Math.min(
    ...metrics.map((metric) => metric.result.rate.advertisedRate),
  );
  const comparisonRates = metrics
    .map((metric) => metric.result.rate.comparisonRate)
    .filter((value): value is number => value !== null);
  const comparisonMinimum = comparisonRates.length
    ? Math.min(...comparisonRates)
    : null;
  const comparableEstimate =
    new Set(metrics.map((metric) => metric.estimateKind)).size === 1;
  const estimateMinimum = comparableEstimate
    ? Math.min(...metrics.map((metric) => metric.estimate))
    : null;
  const config = MARKET_VERTICALS[filters.vertical];

  return (
    <div className="market-comparison-desktop hidden overflow-x-auto md:block">
      <table className="market-comparison-table w-full border-collapse bg-surface">
        <caption className="sr-only">
          Side-by-side comparison of selected {config.label.toLowerCase()}{" "}
          products
        </caption>
        <thead>
          <tr className="border-b border-border-strong align-top">
            <th
              scope="col"
              className="w-44 bg-bg px-4 py-4 text-left text-xs font-semibold text-muted"
            >
              Product
            </th>
            {metrics.map(({ result, lender }) => (
              <th
                key={result.product.id}
                scope="col"
                className="min-w-52 px-4 py-4 text-left"
              >
                <p className="text-xs font-bold text-brand">{lender}</p>
                <p className="mt-1 font-serif text-lg font-semibold leading-snug text-ink">
                  {result.product.name}
                </p>
                <div className="market-print-hide mt-2 flex flex-wrap gap-x-3">
                  <a
                    href={marketSearchHref(
                      filters.vertical,
                      toggleComparisonParamsFor(filters, result.product.id),
                      "#market-comparison",
                    )}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden />
                    Remove
                  </a>
                  {result.product.source.isOwnBrand ? (
                    <span className="inline-flex min-h-[44px] items-center text-xs font-medium text-faint">
                      Lender · research only
                    </span>
                  ) : (
                    <Link
                      href={{
                        pathname: config.quotePath,
                        query: { marketId: result.rate.id },
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-brand hover:text-brand-strong"
                    >
                      Use in quote
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GroupRow count={metrics.length}>
            Rates and repayment estimate
          </GroupRow>
          <SectionRow
            label="Advertised rate"
            metrics={metrics}
            render={({ result }) => {
              const value = result.rate.advertisedRate;
              return (
                <>
                  <span className="tnum block text-xl font-semibold">
                    {formatRate(result.rate.advertisedRate)}
                  </span>
                  {value === advertisedMinimum ? (
                    <LowestFlag />
                  ) : (
                    <span className="tnum mt-1 block text-xs text-muted">
                      +{Math.round((value - advertisedMinimum) * 100)} bp from
                      lowest shown
                    </span>
                  )}
                  {!result.matchesFilters ? (
                    <span className="mt-1 block text-xs font-semibold text-warn">
                      Fallback published rate
                    </span>
                  ) : null}
                </>
              );
            }}
          />
          <SectionRow
            label="Comparison rate"
            metrics={metrics}
            render={({ result }) => {
              const value = result.rate.comparisonRate ?? null;
              if (value === null)
                return <span className="text-faint">Not supplied</span>;
              return (
                <>
                  <span className="tnum block text-lg font-semibold">
                    {formatRate(result.rate.comparisonRate)}
                  </span>
                  {value === comparisonMinimum ? (
                    <LowestFlag />
                  ) : comparisonMinimum !== null ? (
                    <span className="tnum mt-1 block text-xs text-muted">
                      +{Math.round((value - comparisonMinimum) * 100)} bp from
                      lowest shown
                    </span>
                  ) : null}
                </>
              );
            }}
          />
          <SectionRow
            label={
              filters.vertical === "commercial"
                ? "Indicative repayment / interest"
                : "Indicative monthly P&I"
            }
            metrics={metrics}
            render={({ estimate, estimateKind }) => (
              <>
                <span className="block text-xs text-muted">
                  {estimateKind === "annual_interest"
                    ? "Annual interest at full limit"
                    : "Monthly principal & interest"}
                </span>
                <span className="tnum mt-1 block text-lg font-semibold">
                  {formatMoney(estimate)}
                </span>
                {estimateMinimum !== null &&
                Math.abs(estimate - estimateMinimum) < 0.5 ? (
                  <LowestFlag />
                ) : estimateMinimum !== null ? (
                  <span className="tnum mt-1 block text-xs text-muted">
                    +{formatMoney(estimate - estimateMinimum)}{" "}
                    {estimateKind === "annual_interest"
                      ? "per year"
                      : "per month"}
                  </span>
                ) : null}
              </>
            )}
          />

          <GroupRow count={metrics.length}>Product criteria</GroupRow>
          <SectionRow
            label="Rate type"
            metrics={metrics}
            render={({ result }) => labelFromCode(result.rate.lendingRateType)}
          />
          <SectionRow
            label="Loan purpose"
            metrics={metrics}
            render={({ result }) => labelFromCode(result.rate.loanPurpose)}
          />
          <SectionRow
            label="Repayment type"
            metrics={metrics}
            render={({ result }) => labelFromCode(result.rate.repaymentType)}
          />
          <SectionRow
            label="LVR range"
            metrics={metrics}
            render={(metric) => (
              <span className="tnum font-semibold">
                {formatLvr(metric.result)}
              </span>
            )}
          />
          <SectionRow
            label="Fixed period"
            metrics={metrics}
            render={({ result }) =>
              formatFixedPeriod(result.rate.fixedPeriodMonths)
            }
          />

          <GroupRow count={metrics.length}>Structured fees</GroupRow>
          <SectionRow
            label="Upfront / establishment"
            metrics={metrics}
            render={({ fees }) => (
              <span className="tnum font-semibold">
                {fees.upfront ? formatMoney(fees.upfront) : "$0 listed"}
              </span>
            )}
          />
          <SectionRow
            label="Periodic annualised"
            metrics={metrics}
            render={({ fees }) => (
              <>
                <span className="tnum font-semibold">
                  {fees.annualPeriodic
                    ? `${formatMoney(fees.annualPeriodic)} / year`
                    : "$0 listed"}
                </span>
                {fees.unannualisedPeriodicCount ? (
                  <span className="mt-1 block text-xs text-warn">
                    Plus {fees.unannualisedPeriodicCount} periodic fee
                    {fees.unannualisedPeriodicCount === 1 ? "" : "s"} without a
                    usable frequency
                  </span>
                ) : null}
              </>
            )}
          />
          <SectionRow
            label="Other listed fees"
            metrics={metrics}
            render={({ fees }) => (
              <span className="tnum">
                {fees.otherFeeCount} entr
                {fees.otherFeeCount === 1 ? "y" : "ies"}
              </span>
            )}
          />

          <GroupRow count={metrics.length}>Features and eligibility</GroupRow>
          {[
            ["Offset", "OFFSET"],
            ["Redraw", "REDRAW"],
            ["Extra repayments", "EXTRA_REPAYMENTS"],
            ["Digital banking", "DIGITAL_BANKING"],
          ].map(([label, type]) => (
            <SectionRow
              key={type}
              label={label}
              metrics={metrics}
              render={({ result }) => (
                <FeatureValue value={listedFeature(result, type)} />
              )}
            />
          ))}
          <SectionRow
            label="Borrower eligibility"
            metrics={metrics}
            render={(metric) => <EligibilitySummary metric={metric} />}
          />

          <GroupRow count={metrics.length}>Lender evidence</GroupRow>
          <SectionRow
            label="Lender record updated"
            metrics={metrics}
            render={({ result }) => (
              <span className="tnum text-xs font-semibold">
                {formatDate(result.product.sourceUpdatedAt)}
              </span>
            )}
          />
          <SectionRow
            label="Product source"
            metrics={metrics}
            render={({ result }) => {
              const href = safeExternalHref(result.product.overviewUri);
              return href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:text-brand-strong"
                >
                  Open lender evidence
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ) : (
                <span className="text-faint">Not supplied</span>
              );
            }}
          />
        </tbody>
      </table>
    </div>
  );
}

function MobileComparison({
  metrics,
  filters,
}: {
  metrics: ProductMetrics[];
  filters: SearchFilters;
}) {
  const advertisedMinimum = Math.min(
    ...metrics.map((metric) => metric.result.rate.advertisedRate),
  );
  const comparableEstimate =
    new Set(metrics.map((metric) => metric.estimateKind)).size === 1;
  const estimateMinimum = comparableEstimate
    ? Math.min(...metrics.map((metric) => metric.estimate))
    : null;
  const config = MARKET_VERTICALS[filters.vertical];

  return (
    <div className="market-comparison-mobile divide-y divide-border md:hidden">
      {metrics.map((metric) => {
        const { result, lender, estimate, estimateKind, fees } = metric;
        const lowestRate = result.rate.advertisedRate === advertisedMinimum;
        const lowestEstimate =
          estimateMinimum !== null &&
          Math.abs(estimate - estimateMinimum) < 0.5;
        const sourceHref = safeExternalHref(result.product.overviewUri);

        return (
          <article key={result.product.id} className="bg-surface">
            <header className="bg-panel px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-brand">{lender}</p>
                  <h3 className="mt-1 font-serif text-xl font-semibold leading-snug">
                    {result.product.name}
                  </h3>
                </div>
                <a
                  href={marketSearchHref(
                    filters.vertical,
                    toggleComparisonParamsFor(filters, result.product.id),
                    "#market-comparison",
                  )}
                  className="market-print-hide inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-muted"
                >
                  <X className="size-4" aria-hidden />
                  Remove
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border-strong pt-4">
                <div>
                  <p className="text-xs text-muted">Advertised rate</p>
                  <p className="tnum mt-1 text-2xl font-semibold">
                    {formatRate(result.rate.advertisedRate)}
                  </p>
                  {lowestRate ? <LowestFlag /> : null}
                </div>
                <div>
                  <p className="text-xs text-muted">Comparison rate</p>
                  <p className="tnum mt-1 text-xl font-semibold">
                    {formatRate(result.rate.comparisonRate)}
                  </p>
                </div>
              </div>
              {result.product.source.isOwnBrand ? (
                <p className="market-print-hide mt-4 rounded-lg bg-surface px-3 py-2.5 text-xs leading-5 text-muted">
                  Lender product · available for research only, not competitor
                  evidence.
                </p>
              ) : (
                <Link
                  href={{
                    pathname: config.quotePath,
                    query: { marketId: result.rate.id },
                  }}
                  className={buttonClass(
                    "primary",
                    "md",
                    "market-print-hide mt-4 w-full",
                  )}
                >
                  Use in new quote
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </header>
            <dl className="divide-y divide-border px-4 text-sm">
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-muted">
                  {estimateKind === "annual_interest"
                    ? "Annual interest at full limit"
                    : "Indicative monthly P&I"}
                </dt>
                <dd className="text-right">
                  <span className="tnum block font-semibold">
                    {formatMoney(estimate)}
                  </span>
                  {lowestEstimate ? (
                    <LowestFlag />
                  ) : estimateMinimum !== null ? (
                    <span className="tnum mt-1 block text-xs text-muted">
                      +{formatMoney(estimate - estimateMinimum)} /{" "}
                      {estimateKind === "annual_interest" ? "year" : "month"}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">Rate criteria</dt>
                <dd className="max-w-[58%] text-right font-semibold">
                  {labelFromCode(result.rate.lendingRateType)} ·{" "}
                  {labelFromCode(result.rate.loanPurpose)} · {formatLvr(result)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">Upfront / establishment</dt>
                <dd className="tnum text-right font-semibold">
                  {fees.upfront ? formatMoney(fees.upfront) : "$0 listed"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">Periodic annualised</dt>
                <dd className="tnum text-right font-semibold">
                  {fees.annualPeriodic
                    ? `${formatMoney(fees.annualPeriodic)} / year`
                    : "$0 listed"}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Key features</dt>
                <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  <span>
                    <FeatureValue value={listedFeature(result, "OFFSET")} />{" "}
                    <span className="text-xs text-faint">Offset</span>
                  </span>
                  <span>
                    <FeatureValue value={listedFeature(result, "REDRAW")} />{" "}
                    <span className="text-xs text-faint">Redraw</span>
                  </span>
                </dd>
              </div>
              <div className="py-2">
                <dt className="sr-only">Borrower eligibility</dt>
                <dd>
                  <EligibilitySummary metric={metric} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Lender evidence</dt>
                <dd>
                  {sourceHref ? (
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand"
                    >
                      Open source
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span className="text-faint">Not supplied</span>
                  )}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export function ProductComparison({
  comparison,
  filters,
}: {
  comparison: RankedProduct[];
  filters: SearchFilters;
}) {
  if (comparison.length < 2) return null;

  const config = MARKET_VERTICALS[filters.vertical];
  const metrics: ProductMetrics[] = comparison.map((result) => ({
    result,
    lender: displayLenderName(
      result.product.brandName,
      result.product.source.brandName ?? result.product.source.lenderName,
    ),
    estimate:
      filters.vertical === "commercial" &&
      result.product.productCategory === "OVERDRAFTS"
        ? filters.loanAmount * (result.rate.advertisedRate / 100)
        : monthlyPrincipalAndInterestRepayment(
            filters.loanAmount,
            result.rate.advertisedRate,
            filters.loanTermYears,
          ),
    estimateKind:
      filters.vertical === "commercial" &&
      result.product.productCategory === "OVERDRAFTS"
        ? "annual_interest"
        : "monthly_repayment",
    fees: summariseFees(result.product.fees),
  }));
  const hiddenParams = searchParamsFor(filters, {
    loanAmount: config.defaultAmount,
    loanTermYears: config.defaultTermYears,
  });
  const clearHref = marketSearchHref(
    filters.vertical,
    searchParamsFor(filters, { compareIds: [] }),
    "#results-heading",
  );

  return (
    <section
      id="market-comparison"
      aria-labelledby="market-comparison-heading"
      className="mt-7 scroll-mt-6 overflow-hidden rounded-2xl bg-surface"
    >
      <header className="rail-chrome bg-brand-deep px-4 py-5 text-rail-ink sm:px-5 lg:flex lg:items-start lg:justify-between lg:gap-6 lg:px-6">
        <div>
          <h2
            id="market-comparison-heading"
            className="font-serif text-2xl font-semibold tracking-[-0.01em]"
          >
            Selected product comparison
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-deep-muted">
            <span className="tnum">{comparison.length}</span> products · Search
            context: {searchContext(filters)}
          </p>
          <p className="mt-1 text-xs text-brand-deep-muted">
            Prepared {formatDate(new Date())}
          </p>
        </div>
        <div className="mt-4 lg:mt-0">
          <ComparisonActions clearHref={clearHref} />
        </div>
      </header>

      <form
        method="get"
        action={config.path}
        className="market-print-hide flex flex-col gap-4 bg-brand-tint px-4 py-4 sm:flex-row sm:items-end sm:px-5 lg:px-6"
      >
        {Array.from(hiddenParams.entries()).map(([name, value], index) => (
          <input
            key={`${name}-${value}-${index}`}
            type="hidden"
            name={name}
            value={value}
          />
        ))}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">
            Repayment assumptions
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {filters.vertical === "commercial"
              ? "Business loans use monthly principal-and-interest. Overdrafts use annual interest at the selected full limit."
              : "Monthly principal-and-interest estimate using each advertised rate."}
          </p>
        </div>
        <label className="text-xs font-semibold text-muted">
          <span className="mb-1.5 block">Loan amount</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
              $
            </span>
            <input
              name="amount"
              type="number"
              min="10000"
              max="10000000"
              step="1000"
              required
              defaultValue={filters.loanAmount}
              className="tnum min-h-11 w-full rounded-lg border border-border-strong bg-surface pl-7 pr-3 text-sm text-ink sm:w-40"
            />
          </span>
        </label>
        <label className="text-xs font-semibold text-muted">
          <span className="mb-1.5 block">Loan term</span>
          <span className="relative block">
            <input
              name="term"
              type="number"
              min="1"
              max="40"
              step="1"
              required
              defaultValue={filters.loanTermYears}
              className="tnum min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 pr-14 text-sm text-ink sm:w-32"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
              years
            </span>
          </span>
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          Update estimates
        </button>
      </form>

      <div className="border-y border-warn/30 bg-warn-soft px-4 py-3 text-xs leading-5 text-warn sm:px-5 lg:px-6">
        <p className="flex gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Comparison highlights product differences; it does not determine
            suitability, borrower eligibility, or approval.
          </span>
        </p>
      </div>

      <DesktopComparison metrics={metrics} filters={filters} />
      <MobileComparison metrics={metrics} filters={filters} />

      <footer className="space-y-2 border-t border-border bg-bg px-4 py-4 text-xs leading-5 text-muted sm:px-5 lg:px-6">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Estimates use the selected advertised rate and entered amount.
            Amortising products also use the entered term; overdrafts show
            annual interest at the full selected limit. Estimates exclude fees,
            rate changes, repayment-frequency effects, utilisation assumptions,
            and lender-specific calculations.
          </span>
        </p>
        <p>
          “$0 listed” means no structured amount was identified in that
          category; it does not mean the product is fee-free.
        </p>
        {comparison.some((result) => !result.matchesFilters) ? (
          <p className="font-semibold text-warn">
            One or more products no longer has a rate matching the current
            filters, so its lowest non-discount published rate is shown.
          </p>
        ) : null}
      </footer>
    </section>
  );
}
