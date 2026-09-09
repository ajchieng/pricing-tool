"use client";

import { useSearchParams } from "next/navigation";
import { Clock3, Database } from "lucide-react";
import { ActiveSearchFilters } from "@/components/market-search/ActiveSearchFilters";
import { ComparisonDock } from "@/components/market-search/ComparisonDock";
import { MarketSearchTabs } from "@/components/market-search/MarketSearchTabs";
import { ProductComparison } from "@/components/market-search/ProductComparison";
import { ProductDetail } from "@/components/market-search/ProductDetail";
import { SearchForm } from "@/components/market-search/SearchForm";
import { SearchResults } from "@/components/market-search/SearchResults";
import { SearchShortcut } from "@/components/market-search/SearchShortcut";
import { buttonClass } from "@/components/ui/Button";
import {
  parseSearchParams,
  searchParamsFor,
  type RawSearchParams,
} from "@/lib/market/search/params";
import { MARKET_VERTICALS, marketSearchHref } from "@/lib/market/verticals";
import { searchDemoMarket } from "@/lib/demo/market-search";
import { isDemoArea } from "@/lib/demo/presentation";
import { SAMPLE_MARKET } from "@/lib/demo/market";

export function MarketPage() {
  const params = useSearchParams();
  const queryArea = params.get("area");
  const vertical = isDemoArea(queryArea) ? queryArea : "home";
  const config = MARKET_VERTICALS[vertical];
  const raw: RawSearchParams = {};
  for (const key of params.keys()) raw[key] = params.getAll(key);
  const filters = parseSearchParams(raw, vertical);
  const response = searchDemoMarket(filters);
  const selected = response.selected;
  const preferredRate = response.results.find(
    (item) => item.product.id === selected?.id,
  )?.rate;
  const mobileBackHref = selected
    ? marketSearchHref(
        vertical,
        searchParamsFor(filters, { productId: null }),
        `#market-result-${selected.id}`,
      )
    : null;
  const catalogue = SAMPLE_MARKET.filter((item) => item.area === vertical);

  return (
    <div className={response.comparison.length ? "pb-24" : undefined}>
      <SearchShortcut />
      <header className="market-print-hide mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.8rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
            Market Search
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">
            {config.description} Results are market context, not lender pricing
            policy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <a
            href="#market-data-status"
            className={buttonClass("secondary", "sm")}
          >
            <Clock3 className="size-3.5 text-brand" aria-hidden />
            Fictional catalogue
          </a>
        </div>
      </header>
      <MarketSearchTabs area={vertical} />
      <SearchForm key={`search-${params.toString()}`} filters={filters} />
      <ActiveSearchFilters filters={filters} />
      <ProductComparison
        key={`compare-${params.toString()}`}
        comparison={response.comparison}
        filters={filters}
      />
      <div className="market-print-hide mt-7 grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className={selected ? "hidden xl:block" : undefined}>
          <SearchResults
            response={response}
            filters={filters}
            selectedId={selected?.id ?? null}
          />
        </div>
        <div>
          <ProductDetail
            product={selected}
            preferredRate={preferredRate}
            vertical={vertical}
            mobileBackHref={mobileBackHref}
          />
        </div>
      </div>
      <section
        id="market-data-status"
        aria-labelledby="market-data-status-heading"
        className="market-print-hide mt-8 scroll-mt-20 border-y border-border bg-panel px-4 py-5 sm:px-5"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto] lg:items-center">
          <div>
            <h2
              id="market-data-status-heading"
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <Database className="size-4 text-brand" aria-hidden />
              Catalogue information
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Bundled fictional product examples. No live lender feed or public
              API connection.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Lenders</p>
            <p className="tnum mt-0.5 text-lg font-semibold">
              {new Set(catalogue.map((item) => item.lender)).size}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Products</p>
            <p className="tnum mt-0.5 text-lg font-semibold">
              {catalogue.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Source</p>
            <p className="mt-0.5 text-sm font-semibold">Fictional examples</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Last live fetch</p>
            <p className="mt-0.5 text-sm font-semibold">Not applicable</p>
          </div>
        </div>
      </section>
      <ComparisonDock
        key={`dock-${params.toString()}`}
        comparison={response.comparison.map(({ product }) => ({
          id: product.id,
          name: product.name,
        }))}
        filters={filters}
      />
    </div>
  );
}
