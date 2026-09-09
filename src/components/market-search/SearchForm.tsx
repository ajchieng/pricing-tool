"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { FormEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import {
  hasActiveSearch,
  searchResetParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import { MARKET_VERTICALS, marketSearchHref } from "@/lib/market/verticals";

const inputClass =
  "min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink transition-colors placeholder:text-faint hover:border-brand focus:border-brand focus:outline-none";
const commonFixedPeriods = [12, 24, 36, 48, 60] as const;

function fixedPeriodLabel(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} months`;
}

export function SearchForm({ filters }: { filters: SearchFilters }) {
  const router = useRouter();
  const config = MARKET_VERTICALS[filters.vertical];
  const home = filters.vertical === "home";
  const refineCount = home
    ? [
        filters.offset,
        filters.redraw,
        filters.repayment != null,
        filters.fixedMonths != null,
        filters.noOngoingFee,
      ].filter(Boolean).length
    : filters.vertical === "personal"
      ? [filters.extraRepayments, filters.redraw, filters.noOngoingFee].filter(
          Boolean,
        ).length
      : [filters.relationshipManagement, filters.noOngoingFee].filter(Boolean)
          .length;
  const resetHref = marketSearchHref(
    filters.vertical,
    searchResetParamsFor(filters),
  );
  const showReset = hasActiveSearch(filters) || filters.sort !== "relevance";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string" || value.trim() === "") continue;
      params.append(name, value);
    }
    router.push(marketSearchHref(filters.vertical, params));
  }

  return (
    <section
      aria-labelledby="market-search-form-heading"
      className="market-print-hide rounded-2xl bg-brand-tint p-4 sm:p-5 lg:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2
            id="market-search-form-heading"
            className="text-sm font-semibold text-ink"
          >
            Search product data
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Search a lender or feature, or describe the borrower need in plain
            language.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[0.7rem] text-faint sm:flex">
          Press <kbd className="font-semibold text-muted">/</kbd> to focus
        </span>
      </div>

      <form
        action={config.path}
        method="get"
        id="market-search-form"
        onSubmit={submitSearch}
      >
        <input type="hidden" name="area" value={filters.vertical} />
        {filters.compareIds.map((id) => (
          <input key={id} type="hidden" name="compare" value={id} />
        ))}
        {home ? (
          <input type="hidden" name="amount" value={filters.loanAmount} />
        ) : null}
        <input type="hidden" name="term" value={filters.loanTermYears} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="market-loan-search">
            Search {config.label.toLowerCase()} products
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <input
              id="market-loan-search"
              name="q"
              type="search"
              defaultValue={filters.q}
              maxLength={160}
              placeholder={config.searchPlaceholder}
              className={`${inputClass} market-search-field pl-10 pr-12 text-base`}
            />
          </div>
          <button
            type="submit"
            data-loading-bar
            className={buttonClass("primary", "md", "sm:px-5")}
          >
            <Search className="size-4" aria-hidden />
            Search
          </button>
          {showReset ? (
            <Link href={resetHref} className={buttonClass("ghost", "md")}>
              <X className="size-4" aria-hidden />
              Reset
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {home ? (
            <label className="block text-xs font-semibold text-muted">
              <span className="mb-1.5 block">Loan purpose</span>
              <select
                name="purpose"
                defaultValue={filters.purpose ?? ""}
                className={inputClass}
              >
                <option value="">Any purpose</option>
                <option value="owner_occupied">Owner occupied</option>
                <option value="investment">Investment</option>
              </select>
            </label>
          ) : filters.vertical === "commercial" ? (
            <label className="block text-xs font-semibold text-muted">
              <span className="mb-1.5 block">Facility category</span>
              <select
                name="facilityCategory"
                defaultValue={filters.facilityCategory ?? ""}
                className={inputClass}
              >
                <option value="">Business loans and overdrafts</option>
                <option value="business_loan">Business loans</option>
                <option value="overdraft">Overdrafts</option>
              </select>
            </label>
          ) : (
            <label className="block text-xs font-semibold text-muted">
              <span className="mb-1.5 block">Requested amount</span>
              <input
                name="amount"
                type="number"
                min="1000"
                max="100000000"
                step="1000"
                defaultValue={filters.loanAmount}
                className={`${inputClass} tnum`}
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-muted">
            <span className="mb-1.5 block">Rate type</span>
            <select
              name="rateType"
              defaultValue={filters.rateType ?? ""}
              className={inputClass}
            >
              <option value="">Any rate type</option>
              <option value="variable">Variable</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>
          {home ? (
            <label className="block text-xs font-semibold text-muted">
              <span className="mb-1.5 block">Target LVR</span>
              <span className="relative block">
                <input
                  name="lvr"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  defaultValue={filters.lvr ?? ""}
                  placeholder="e.g. 80"
                  className={`${inputClass} tnum pr-9`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">
                  %
                </span>
              </span>
            </label>
          ) : filters.vertical === "commercial" ? (
            <label className="block text-xs font-semibold text-muted">
              <span className="mb-1.5 block">Facility amount / limit</span>
              <input
                name="amount"
                type="number"
                min="1000"
                max="100000000"
                step="1000"
                defaultValue={filters.loanAmount}
                className={`${inputClass} tnum`}
              />
            </label>
          ) : null}
        </div>

        <details className="group mt-3" open={refineCount > 0 || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" aria-hidden />
            Refine results{refineCount > 0 ? ` (${refineCount})` : ""}
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:max-w-3xl">
            {home ? (
              <>
                <label className="block text-xs font-semibold text-muted">
                  <span className="mb-1.5 block">Repayment type</span>
                  <select
                    name="repayment"
                    defaultValue={filters.repayment ?? ""}
                    className={inputClass}
                  >
                    <option value="">Any repayment type</option>
                    <option value="principal_and_interest">
                      Principal &amp; interest
                    </option>
                    <option value="interest_only">Interest only</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  <span className="mb-1.5 block">Fixed period</span>
                  <select
                    name="fixedMonths"
                    defaultValue={filters.fixedMonths ?? ""}
                    className={inputClass}
                  >
                    <option value="">Any term</option>
                    {filters.fixedMonths !== null &&
                    !commonFixedPeriods.includes(
                      filters.fixedMonths as (typeof commonFixedPeriods)[number],
                    ) ? (
                      <option value={filters.fixedMonths}>
                        {fixedPeriodLabel(filters.fixedMonths)}
                      </option>
                    ) : null}
                    {commonFixedPeriods.map((months) => (
                      <option key={months} value={months}>
                        {fixedPeriodLabel(months)}
                      </option>
                    ))}
                  </select>
                </label>
                <FeatureFilter
                  name="offset"
                  label="Offset"
                  checked={filters.offset}
                />
                <FeatureFilter
                  name="redraw"
                  label="Redraw"
                  checked={filters.redraw}
                />
                <FeatureFilter
                  name="noOngoingFee"
                  label="No periodic fee listed"
                  checked={filters.noOngoingFee}
                />
              </>
            ) : filters.vertical === "personal" ? (
              <>
                <FeatureFilter
                  name="extraRepayments"
                  label="Extra repayments"
                  checked={filters.extraRepayments}
                />
                <FeatureFilter
                  name="redraw"
                  label="Redraw"
                  checked={filters.redraw}
                />
                <FeatureFilter
                  name="noOngoingFee"
                  label="No periodic fee listed"
                  checked={filters.noOngoingFee}
                />
              </>
            ) : (
              <>
                <FeatureFilter
                  name="relationshipManagement"
                  label="Relationship management"
                  checked={filters.relationshipManagement}
                />
                <FeatureFilter
                  name="noOngoingFee"
                  label="No periodic fee listed"
                  checked={filters.noOngoingFee}
                />
              </>
            )}
          </div>
        </details>
      </form>
    </section>
  );
}

function FeatureFilter({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink hover:bg-brand-soft">
      <input
        name={name}
        type="checkbox"
        value="1"
        defaultChecked={checked}
        className="size-4"
      />
      {label}
    </label>
  );
}
