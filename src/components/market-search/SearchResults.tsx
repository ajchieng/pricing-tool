import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Plus,
  SearchX,
} from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { MarketSortControl } from "@/components/market-search/MarketSortControl";
import {
  displayLenderName,
  formatRate,
  labelFromCode,
} from "@/lib/market/search/format";
import {
  hasActiveSearch,
  MAX_COMPARE_PRODUCTS,
  searchParamsFor,
  toggleComparisonParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import type { RankedProduct, SearchResponse } from "@/lib/demo/market-search";
import { marketSearchHref } from "@/lib/market/verticals";

function Attribute({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-panel px-2 py-1 text-[0.7rem] font-semibold text-muted">
      {children}
    </span>
  );
}

function featureLabels(result: RankedProduct): string[] {
  const values = new Set<string>();
  for (const feature of result.product.features) {
    if (feature.featureType === "OFFSET" || feature.featureType === "REDRAW") {
      values.add(labelFromCode(feature.featureType));
    }
  }
  return [...values].slice(0, 3);
}

function ResultRow({
  result,
  filters,
  selected,
}: {
  result: RankedProduct;
  filters: SearchFilters;
  selected: boolean;
}) {
  const { product, rate } = result;
  const lender = displayLenderName(
    product.brandName,
    product.source.brandName ?? product.source.lenderName,
  );
  const detailHref = marketSearchHref(
    filters.vertical,
    searchParamsFor(filters, { productId: product.id }),
    "#product-detail",
  );
  const compared = filters.compareIds.includes(product.id);
  const comparisonFull = filters.compareIds.length >= MAX_COMPARE_PRODUCTS;
  const comparisonHref = marketSearchHref(
    filters.vertical,
    toggleComparisonParamsFor(filters, product.id),
    "#results-heading",
  );

  return (
    <article
      id={`market-result-${product.id}`}
      tabIndex={-1}
      className={`relative grid scroll-mt-24 cursor-pointer gap-5 border-b border-border px-4 py-5 transition-colors sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px] 2xl:grid-cols-[minmax(0,1fr)_150px_184px] ${
        selected ? "bg-brand-tint" : "bg-surface hover:bg-bg"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-brand">{lender}</p>
          {selected ? (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand-strong">
              Viewing
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 font-serif text-[1.15rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {product.name}
        </h3>
        {product.description ? (
          <p className="market-result-description mt-1.5 max-w-2xl text-sm leading-5 text-muted">
            {product.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Attribute>{labelFromCode(rate.lendingRateType)}</Attribute>
          <Attribute>{labelFromCode(rate.loanPurpose)}</Attribute>
          <Attribute>{labelFromCode(rate.repaymentType)}</Attribute>
          {rate.maxLvr ? (
            <Attribute>
              Up to <span className="tnum">{rate.maxLvr}%</span> LVR
            </Attribute>
          ) : null}
          {featureLabels(result).map((feature) => (
            <Attribute key={feature}>{feature}</Attribute>
          ))}
        </div>
      </div>

      <div className="hidden self-center border-l border-border pl-5 2xl:block">
        <p className="text-xs font-medium text-muted">Product fit</p>
        <dl className="mt-2 space-y-1 text-xs text-muted">
          <div className="flex justify-between gap-3">
            <dt>Fixed term</dt>
            <dd className="tnum font-medium text-ink">
              {rate.fixedPeriodMonths
                ? `${rate.fixedPeriodMonths / 12} yr`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Tailored</dt>
            <dd className="font-medium text-ink">
              {product.isTailored ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-border pt-4 sm:border-0 sm:pt-0 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:pl-5">
        <div className="flex gap-6 lg:text-right">
          <div>
            <p className="text-xs font-medium text-muted">Advertised rate</p>
            <p className="tnum mt-0.5 text-2xl font-semibold tracking-tight text-ink">
              {formatRate(rate.advertisedRate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Comparison rate</p>
            <p className="tnum mt-0.5 text-lg font-semibold text-muted">
              {formatRate(rate.comparisonRate)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3">
          {comparisonFull && !compared ? (
            <span
              aria-disabled="true"
              title="Remove a selected product before adding another"
              className="relative z-20 inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-faint"
            >
              <Plus className="size-4" aria-hidden />
              Comparison full
            </span>
          ) : (
            <Link
              href={comparisonHref}
              aria-label={`${compared ? "Remove" : "Add"} ${product.name} ${compared ? "from" : "to"} comparison`}
              className={`relative z-20 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold ${
                compared ? "text-brand-strong" : "text-muted hover:text-ink"
              }`}
            >
              {compared ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              {compared ? "Selected" : "Compare"}
            </Link>
          )}
          <Link
            href={detailHref}
            aria-label={`View details for ${product.name}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand after:absolute after:inset-0 after:content-[''] hover:text-brand-strong"
          >
            Details
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function SearchResults({
  response,
  filters,
  selectedId,
}: {
  response: SearchResponse;
  filters: SearchFilters;
  selectedId: string | null;
}) {
  return (
    <section
      aria-labelledby="results-heading"
      className="market-print-hide min-w-0"
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-y border-border bg-panel px-4 py-2 sm:px-5">
        <div>
          <h2 id="results-heading" className="text-sm font-semibold text-ink">
            <span className="tnum">{response.total}</span> product
            {response.total === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-muted">
            {filters.q
              ? "Ranked by keyword match"
              : "Matches your product filters"}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-faint">
            Select up to three products to compare.
          </p>
          {response.interpretation.length ? (
            <p className="mt-1 text-[0.7rem] font-medium text-brand-strong">
              Interpreted from your search:{" "}
              {response.interpretation.join(" · ")}
            </p>
          ) : null}
        </div>

        <MarketSortControl filters={filters} />
      </div>

      {response.results.length ? (
        <div className="border-b border-border">
          {response.results.map((result) => (
            <ResultRow
              key={result.product.id}
              result={result}
              filters={filters}
              selected={result.product.id === selectedId}
            />
          ))}
        </div>
      ) : (
        <div className="my-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong px-6 text-center">
          <SearchX className="size-7 text-faint" aria-hidden />
          <h3 className="mt-4 font-serif text-xl font-semibold">
            No matching products
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Try removing a filter or using a broader product term. Product
            wording can differ between lenders.
          </p>
          {hasActiveSearch(filters) ? (
            <Link
              href={marketSearchHref(filters.vertical)}
              className={buttonClass("primary", "md", "mt-5")}
            >
              Clear all filters
            </Link>
          ) : null}
        </div>
      )}

      {response.pages > 1 ? (
        <nav
          className="flex items-center justify-between border-b border-border py-4"
          aria-label="Search results pages"
        >
          {response.page > 1 ? (
            <Link
              href={marketSearchHref(
                filters.vertical,
                searchParamsFor(filters, {
                  page: response.page - 1,
                  productId: null,
                }),
              )}
              className={buttonClass("ghost", "sm", "text-brand")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted">
            Page{" "}
            <span className="tnum font-semibold text-ink">{response.page}</span>{" "}
            of{" "}
            <span className="tnum font-semibold text-ink">
              {response.pages}
            </span>
          </p>
          {response.page < response.pages ? (
            <Link
              href={marketSearchHref(
                filters.vertical,
                searchParamsFor(filters, {
                  page: response.page + 1,
                  productId: null,
                }),
              )}
              className={buttonClass("ghost", "sm", "text-brand")}
            >
              Next
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
