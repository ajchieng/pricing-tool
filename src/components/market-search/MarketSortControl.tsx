"use client";

import {
  searchParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import { marketSearchHref } from "@/lib/market/verticals";

export function MarketSortControl({ filters }: { filters: SearchFilters }) {
  const retainedParams = Array.from(
    searchParamsFor(filters, {
      sort: "relevance",
      page: 1,
      productId: null,
    }).entries(),
  ).filter(([name]) => name !== "sort");

  return (
    <form
      method="get"
      action={marketSearchHref(filters.vertical)}
      className="flex items-center gap-2"
      data-loading-bar
    >
      {retainedParams.map(([name, value], index) => (
        <input
          key={`${name}-${value}-${index}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))}
      <label htmlFor="market-sort" className="text-xs font-semibold text-muted">
        Sort
      </label>
      <select
        id="market-sort"
        name="sort"
        defaultValue={filters.sort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-[44px] min-h-[44px] rounded-lg border border-border-strong bg-surface px-2.5 text-sm text-ink"
      >
        <option value="relevance">Relevance</option>
        <option value="rate">Advertised rate</option>
        <option value="comparison">Comparison rate</option>
        <option value="name">Product name</option>
      </select>
      <button type="submit" className="sr-only focus:not-sr-only">
        Apply sort
      </button>
    </form>
  );
}
