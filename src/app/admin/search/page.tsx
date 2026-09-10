"use client";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { WorkspaceLoading } from "@/components/demo/DemoProvider";
import {
  ADMIN_CONFIG_AREA_LABELS,
  ADMIN_CONFIG_SEARCH_AREAS,
  ADMIN_CONFIG_SEARCH_KINDS,
  adminConfigSearchHref,
  normalizeAdminConfigSearchText,
  parseAdminConfigSearchParams,
} from "@/lib/admin-config-search-core";
import { searchDemoConfiguration } from "@/lib/demo/configuration-search";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";

const AREA_FILTER_LABELS: Record<
  (typeof ADMIN_CONFIG_SEARCH_AREAS)[number],
  string
> = {
  all: "All areas",
  home: "Home loans",
  personal: "Personal loans",
  commercial: "Commercial loans",
  market: "Market Search",
  global: "Global",
};

const KIND_FILTER_LABELS: Record<
  (typeof ADMIN_CONFIG_SEARCH_KINDS)[number],
  string
> = {
  all: "Pages and settings",
  page: "Pages only",
  setting: "Settings only",
};

export default function AdminConfigSearchPage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <SearchResults />
    </Suspense>
  );
}
function SearchResults() {
  const params = useSearchParams();
  const configuration = useDemoConfiguration();
  const filters = parseAdminConfigSearchParams(
    Object.fromEntries(params.entries()),
  );
  const response = searchDemoConfiguration(configuration, filters);
  const normalizedQuery = normalizeAdminConfigSearchText(filters.q);
  const hasUsableQuery = normalizedQuery.length >= 2;

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Search configuration</h2>
            <p className={adminTableDescription}>
              Find applied configuration pages and settings across the three
              lending areas. Governance, audit and feedback are not included.
            </p>
          </div>
          {hasUsableQuery ? (
            <Badge tone={response.total > 0 ? "info" : "muted"} size="sm">
              {response.total} {response.total === 1 ? "result" : "results"}
            </Badge>
          ) : null}
        </div>

        <form
          action="/admin/search/"
          method="get"
          className="flex flex-wrap items-end gap-3 border-t border-border bg-panel/55 px-4 py-3"
        >
          <input type="hidden" name="q" value={filters.q} />
          <label className="min-w-44 flex-1 text-xs font-medium text-muted sm:flex-none">
            Lending area
            <select
              name="area"
              defaultValue={filters.area}
              className={`${inputClass} mt-1 sm:w-48`}
            >
              {ADMIN_CONFIG_SEARCH_AREAS.map((area) => (
                <option key={area} value={area}>
                  {AREA_FILTER_LABELS[area]}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-44 flex-1 text-xs font-medium text-muted sm:flex-none">
            Result type
            <select
              name="kind"
              defaultValue={filters.kind}
              className={`${inputClass} mt-1 sm:w-48`}
            >
              {ADMIN_CONFIG_SEARCH_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_FILTER_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass("secondary", "md")}>
            Apply filters
          </button>
          {(filters.area !== "all" || filters.kind !== "all") && (
            <Link
              href={adminConfigSearchHref(filters, {
                area: "all",
                kind: "all",
                page: 1,
              })}
              className={buttonClass("ghost", "md")}
            >
              Clear filters
            </Link>
          )}
        </form>
      </section>

      {!filters.q ? (
        <EmptyState
          title="Search applied configuration"
          body={
            <>
              Use the search field above. Try “cost of funds”, “VIP customer”,
              “fixed rate” or “broker commission”.
            </>
          }
        />
      ) : !hasUsableQuery ? (
        <EmptyState
          title="Enter at least two characters"
          body="A slightly longer query keeps the configuration results precise."
        />
      ) : response.results.length === 0 ? (
        <EmptyState
          title={`No configuration matches “${filters.q}”`}
          body="Try a product name, policy term, rate, channel or configuration section. Clearing the area and result-type filters may also help."
          action={
            filters.area !== "all" || filters.kind !== "all" ? (
              <Link
                href={adminConfigSearchHref(filters, {
                  area: "all",
                  kind: "all",
                  page: 1,
                })}
                className={buttonClass("secondary", "md")}
              >
                Search all configuration
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <section
            aria-labelledby="admin-config-search-results-heading"
            className="border-y border-border"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-panel/50 px-4 py-2.5">
              <h2
                id="admin-config-search-results-heading"
                className="text-sm font-semibold text-ink"
              >
                Results for “{filters.q}”
              </h2>
              <p className="text-xs text-muted">
                Page {response.page} of {response.pageCount}
              </p>
            </div>
            <div className="divide-y divide-border">
              {response.results.map((result) => (
                <Link
                  key={result.id}
                  href={result.href}
                  className="group flex min-h-20 items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-panel/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink transition-colors group-hover:text-brand">
                        {result.title}
                      </h3>
                      <Badge
                        tone={result.kind === "page" ? "info" : "muted"}
                        size="sm"
                      >
                        {result.kind === "page" ? "Section" : "Setting"}
                      </Badge>
                      {result.active != null ? (
                        <Badge tone={result.active ? "ok" : "muted"} size="sm">
                          {result.active ? "Active" : "Inactive"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {ADMIN_CONFIG_AREA_LABELS[result.area]} · {result.section}
                      {result.recordId != null ? (
                        <span className="tnum"> · #{result.recordId}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 max-w-[72ch] text-sm text-muted">
                      {result.summary}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden
                    className="shrink-0 text-faint transition-colors group-hover:text-brand"
                  />
                </Link>
              ))}
            </div>
          </section>

          {response.pageCount > 1 ? (
            <nav
              aria-label="Configuration search result pages"
              className="flex items-center justify-between gap-3"
            >
              <Link
                href={adminConfigSearchHref(filters, {
                  page: Math.max(1, response.page - 1),
                })}
                aria-disabled={response.page <= 1}
                className={`${buttonClass("secondary", "sm")} ${
                  response.page <= 1 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Previous
              </Link>
              <span className="tnum text-sm text-muted">
                {response.page} / {response.pageCount}
              </span>
              <Link
                href={adminConfigSearchHref(filters, {
                  page: Math.min(response.pageCount, response.page + 1),
                })}
                aria-disabled={response.page >= response.pageCount}
                className={`${buttonClass("secondary", "sm")} ${
                  response.page >= response.pageCount
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Next
              </Link>
            </nav>
          ) : null}
        </>
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-muted">
        <Search
          size={14}
          strokeWidth={1.75}
          aria-hidden
          className="mt-0.5 shrink-0 text-faint"
        />
        Search reflects the currently applied configuration. Pending and
        scheduled proposals remain in the approval queue.
      </p>
    </div>
  );
}
