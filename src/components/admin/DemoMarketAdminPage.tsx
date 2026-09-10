"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableScroll,
  adminTableShell,
  adminTableTitle,
  btn,
  btnRowSave,
  btnGhost,
  inp,
  rowActions,
  td,
  th,
} from "@/components/adminUi";
import { fmtDateTime, fmtPct } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { KpiTile } from "@/components/ui/KpiTile";
import { expectedConfigurationVersion } from "@/lib/demo/configuration-form-version";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { MarketSourceSelectionMatrix } from "@/components/admin/MarketSourceSelectionMatrix";
import {
  useDemoConfiguration,
  reportConfigurationResult,
} from "@/lib/demo/configuration-react";
import {
  readDemoConfigurationHistory,
  type DemoConfigurationHistory,
} from "@/lib/demo/configuration";
import { SAMPLE_MARKET } from "@/lib/demo/market";
import { isDemoMarketProductEnabled } from "@/lib/demo/market-availability";
import {
  saveDemoMarketSelections,
  setDemoMarketProductActive,
  disableDemoHomeMarketRates,
  restoreDemoMarketCatalogue,
} from "@/lib/demo/market-configuration";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
function rateQueryHref(
  filters: Record<string, string | number>,
  overrides: Record<string, string | number | null>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...overrides }))
    if (value != null && value !== "" && value !== "all")
      params.set(key, String(value));
  return `/admin/market-search${params.size ? `?${params}` : ""}`;
}

export function DemoMarketAdminPage() {
  const configuration = useDemoConfiguration();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [history, setHistory] = useState<DemoConfigurationHistory[]>([]);
  useEffect(() => {
    let active = true;
    readDemoConfigurationHistory()
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch(() => {
        reportConfigurationResult(
          "Catalogue history could not be loaded.",
          "error",
        );
      });
    return () => {
      active = false;
    };
  }, [configuration.version]);
  function run(action: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await action();
        reportConfigurationResult(message, "success");
      } catch (error) {
        reportConfigurationResult(
          error instanceof Error
            ? error.message
            : "Catalogue change could not be saved.",
          "error",
        );
      }
    });
  }
  const filters = {
    lender: search.get("lender") ?? "",
    q: (search.get("q") ?? "").trim(),
    use: search.get("use") ?? "all",
    purpose: search.get("purpose") ?? "",
    rateType: search.get("rateType") ?? "",
    repaymentType: search.get("repaymentType") ?? "",
  };
  const sources = configuration.tables.market_source_setting.map((row) => ({
    id: row.id,
    lenderName: String(row.name),
    brandName: null,
    operationalAvailable: true,
    isOwnBrand: false,
    home: row.enabledHome === true,
    personal: row.enabledPersonal === true,
    commercial: row.enabledCommercial === true,
    active: row.enabledHome === true,
  }));
  const matrixSources = sources;
  const cdrSources = sources;
  const activeCdrSources = sources.filter(
    (source) => source.home || source.personal || source.commercial,
  );
  const enabledProducts = SAMPLE_MARKET.filter((item) =>
    isDemoMarketProductEnabled(item, configuration),
  );
  const verticalCatalogueStats = (
    ["home", "personal", "commercial"] as const
  ).map((vertical) => ({
    vertical,
    count: enabledProducts.filter((item) => item.area === vertical).length,
    oldestFetch: null,
    newestFetch: null,
  }));
  const marketProductCount = SAMPLE_MARKET.length;
  const marketRateCount = enabledProducts.length;
  const allRates = SAMPLE_MARKET.filter((item) => item.area === "home").map(
    (item, index) => ({
      id: index + 1,
      productKey: item.id,
      lenderName: item.lender,
      productName: item.name,
      loanPurpose: "owner_occupied",
      rateType: item.rateType,
      repaymentType: "principal_and_interest",
      fixedPeriodMonths: item.rateType === "fixed" ? 24 : null,
      minLvr: 0,
      maxLvr: item.maxLvr,
      advertisedRate: item.rate,
      comparisonRate: item.comparisonRate,
      fetchedAt: null,
      active:
        configuration.tables.market_product_setting.find(
          (row) => row.productKey === item.id,
        )?.active !== false,
      sourceActive:
        sources.find((source) => source.lenderName === item.lender)?.home ===
        true,
    }),
  );
  const rateCount = allRates.length;
  const filteredRates = allRates.filter(
    (rate) =>
      (!filters.lender || rate.lenderName === filters.lender) &&
      (!filters.q ||
        `${rate.productName} ${rate.lenderName}`
          .toLowerCase()
          .includes(filters.q.toLowerCase())) &&
      (!filters.purpose || rate.loanPurpose === filters.purpose) &&
      (!filters.rateType || rate.rateType === filters.rateType) &&
      (!filters.repaymentType ||
        rate.repaymentType === filters.repaymentType) &&
      (filters.use === "all" ||
        (filters.use === "included"
          ? rate.active && rate.sourceActive
          : filters.use === "disabled"
            ? !rate.active
            : filters.use === "source_disabled"
              ? !rate.sourceActive
              : true)),
  );
  const filteredRateCount = filteredRates.length;
  const requestedSize = Number(search.get("pageSize"));
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedSize
    : 50;
  const totalPages = Math.max(1, Math.ceil(filteredRateCount / pageSize));
  const requestedPage = Number(search.get("page"));
  const page = Math.min(
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const rates = filteredRates.slice((page - 1) * pageSize, page * pageSize);
  const queryState = { ...filters, page, pageSize };
  const currentRateBrowserPath = rateQueryHref(queryState, {});
  const firstRow = filteredRateCount ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, filteredRateCount);
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => Boolean(value) && (key !== "use" || value !== "all"),
  ).length;
  const lenders = sources.map((source) => ({
    lenderName: source.lenderName,
    _count: {
      _all: allRates.filter((rate) => rate.lenderName === source.lenderName)
        .length,
    },
  }));
  const recentRefreshRuns = history
    .filter((item) => item.targetType === "market_catalogue")
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      startedAt: new Date(item.createdAt),
      trigger: "Local fixture restore",
      status: "SUCCEEDED",
      sources: [] as {
        id: string;
        status: string;
        source: { brandName: string | null; lenderName: string };
        errorMessage: string | null;
      }[],
      sourcesPassed: sources.length,
      sourcesFailed: 0,
      sourcesSkipped: 0,
      productsStored: SAMPLE_MARKET.length,
      ratesStored: SAMPLE_MARKET.length,
    }));
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="market-catalogue-status-heading"
        className="border-y border-border bg-panel/60 px-4 py-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="market-catalogue-status-heading"
              className="text-sm font-semibold text-ink"
            >
              Rich market catalogue
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
              Fictional market evidence used by Market Search. The Home
              compatibility table below controls which bundled products are
              available as quote evidence.
            </p>
          </div>
          <Link href="/market-search" className={btnGhost}>
            Open Market Search
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          {verticalCatalogueStats.map(
            ({ vertical, count, oldestFetch, newestFetch }) => (
              <KpiTile
                key={vertical}
                label={`${vertical[0].toUpperCase()}${vertical.slice(1)} products`}
                value={count}
                hint={
                  newestFetch
                    ? `${fmtDateTime(oldestFetch)} to ${fmtDateTime(newestFetch)}`
                    : "Bundled fictional fixture"
                }
              />
            ),
          )}
        </div>
        <p className="mt-3 text-xs text-faint">
          {marketProductCount} retained products · {marketRateCount} active
          lending rates · {activeCdrSources.length} selected lenders
        </p>
      </section>

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Lender selections</h2>
            <p className={adminTableDescription}>
              Choose which fictional lenders are shown in each Market Search
              area. Saved selections apply immediately in this browser; retained
              catalogue rows keep their original fixture date.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {cdrSources.length} fictional lenders
          </Badge>
        </div>
        <MarketSourceSelectionMatrix
          sources={matrixSources}
          configurationVersion={configuration.version}
        />
      </section>

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Recent catalogue restores</h2>
            <p className={adminTableDescription}>
              Browser-local restore history. Restoring re-enables the bundled
              fictional lender selections and products; no external source is
              contacted.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            Last {recentRefreshRuns.length} runs
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          tabIndex={0}
          aria-label="Recent catalogue restores table"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Started</th>
                <th className={th}>Status</th>
                <th className={th}>Sources</th>
                <th className={th}>Products / rates</th>
                <th className={th}>Source issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRefreshRuns.length === 0 ? (
                <tr>
                  <td
                    className={`${td} py-6 text-center text-muted`}
                    colSpan={5}
                  >
                    The bundled catalogue is available. No local restore has run
                    yet.
                  </td>
                </tr>
              ) : null}
              {recentRefreshRuns.map((run) => {
                const failures = run.sources.filter(
                  (sourceRun) => sourceRun.status === "FAILED",
                );
                const tone =
                  run.status === "SUCCEEDED"
                    ? "ok"
                    : run.status === "FAILED"
                      ? "alert"
                      : "warn";
                return (
                  <tr key={run.id} className="align-top">
                    <td className={td}>
                      <span className="tnum">{fmtDateTime(run.startedAt)}</span>
                      <span className="mt-1 block text-xs text-faint">
                        {run.trigger}
                      </span>
                    </td>
                    <td className={td}>
                      <Badge tone={tone} size="sm">
                        {run.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className={td}>
                      <span className="tnum font-medium text-ink">
                        {run.sourcesPassed} passed
                      </span>
                      <span className="mt-1 block text-xs text-faint">
                        {run.sourcesFailed} failed · {run.sourcesSkipped}{" "}
                        skipped
                      </span>
                    </td>
                    <td className={`${td} tnum`}>
                      {run.productsStored} / {run.ratesStored}
                    </td>
                    <td className={`${td} min-w-[280px]`}>
                      {failures.length ? (
                        <ul className="space-y-2 text-xs leading-5 text-alert">
                          {failures.map((failure) => (
                            <li key={failure.id}>
                              <strong className="font-semibold">
                                {failure.source.brandName ??
                                  failure.source.lenderName}
                              </strong>
                              {failure.errorMessage
                                ? ` — ${failure.errorMessage}`
                                : " — refresh failed"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-faint">
                          No source failures recorded
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>
              Advanced catalogue configuration
            </h2>
            <p className={adminTableDescription}>
              Bundled fictional sources and Home compatibility selections.
              Restore the catalogue to re-enable its original lender and product
              selections.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted" size="sm">
              {sources.length} sources
            </Badge>
            <button
              className={btn}
              disabled={pending}
              onClick={() =>
                run(
                  () => restoreDemoMarketCatalogue(configuration.version),
                  "Fictional catalogue restored in this browser.",
                )
              }
            >
              {pending ? "Restoring…" : "Restore fictional catalogue"}
            </button>
          </div>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          tabIndex={0}
          aria-label="Fictional catalogue sources table"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Lender</th>
                <th className={th}>Catalogue source</th>
                <th className={th}>Detail source</th>
                <th className={th}>Fixture date</th>
                <th className={th}>Home compatibility</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr
                  key={source.id}
                  id={adminConfigTargetId("market-source", source.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} min-w-[180px]`}>
                    <span className="font-medium text-ink">
                      {source.lenderName}
                    </span>
                    <div className="mt-2">
                      <Badge tone="muted" size="sm">
                        Fictional fixture
                      </Badge>
                    </div>
                  </td>
                  <td className={`${td} min-w-[240px]`}>
                    <input
                      readOnly
                      value="Bundled fictional products"
                      className={inp}
                      aria-label={`${source.lenderName} catalogue source`}
                    />
                  </td>
                  <td className={`${td} min-w-[240px]`}>
                    <input
                      readOnly
                      value="Bundled fictional product details"
                      className={inp}
                      aria-label={`${source.lenderName} detail source`}
                    />
                  </td>
                  <td className={td}>
                    <div>{fmtDateTime("2026-01-01T00:00:00.000Z")}</div>
                    <div className="text-xs text-faint">No live feed</div>
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`source-${source.id}`}
                      defaultChecked={source.active}
                      aria-label={`${source.lenderName} Home compatibility active`}
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <ConfigurationForm
                      id={`source-${source.id}`}
                      action={async (data) => {
                        const selections = Object.fromEntries(
                          sources.map((item) => [
                            item.id,
                            {
                              home:
                                item.id === source.id
                                  ? data.get("active") === "on"
                                  : item.home,
                              personal: item.personal,
                              commercial: item.commercial,
                            },
                          ]),
                        );
                        await saveDemoMarketSelections(
                          expectedConfigurationVersion(
                            data,
                            configuration.version,
                          ),
                          selections,
                          "Updated Home compatibility source selection",
                        );
                        reportConfigurationResult(
                          "Home compatibility source saved.",
                          "success",
                        );
                      }}
                    >
                      <button type="submit" className={btnRowSave}>
                        Save
                      </button>
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Competitor rates</h2>
            <p className={adminTableDescription}>
              Tick Home rates to include them in Market Search and new quote
              evidence. Disabled rates stay in the fictional catalogue but are
              excluded. A rate is only shown when its lender is also selected
              for Home.
            </p>
          </div>
          <button
            className={btnGhost}
            disabled={pending || !rates.some((rate) => rate.active)}
            onClick={() => {
              if (
                window.confirm(
                  "Disable all fictional Home compatibility rates? They remain stored and can be restored.",
                )
              )
                run(
                  () => disableDemoHomeMarketRates(configuration.version),
                  "Home compatibility rates disabled.",
                );
            }}
          >
            Disable all Home rates
          </button>
        </div>
        <div className="border-b border-border px-4 py-3">
          <form
            method="get"
            action="/admin/market-search"
            className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-[1.15fr_repeat(5,minmax(120px,0.75fr))_auto_auto]"
          >
            <Field label="Search" htmlFor="competitor-filter-search">
              <input
                id="competitor-filter-search"
                name="q"
                defaultValue={filters.q}
                placeholder="Product or lender"
                aria-label="Search competitor rates"
                className={inp}
              />
            </Field>
            <Field label="Lender" htmlFor="competitor-filter-lender">
              <select
                id="competitor-filter-lender"
                name="lender"
                defaultValue={filters.lender}
                className={inp}
              >
                <option value="">All lenders</option>
                {lenders.map((lender) => (
                  <option key={lender.lenderName} value={lender.lenderName}>
                    {lender.lenderName} ({lender._count._all})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Use" htmlFor="competitor-filter-use">
              <select
                id="competitor-filter-use"
                name="use"
                defaultValue={filters.use}
                className={inp}
              >
                <option value="all">All rates</option>
                <option value="included">Included in Market Search</option>
                <option value="disabled">Rate disabled</option>
                <option value="source_disabled">Source disabled</option>
              </select>
            </Field>
            <Field label="Purpose" htmlFor="competitor-filter-purpose">
              <select
                id="competitor-filter-purpose"
                name="purpose"
                defaultValue={filters.purpose}
                className={inp}
              >
                <option value="">Any purpose</option>
                <option value="owner_occupied">Owner occupied</option>
                <option value="investment">Investment</option>
              </select>
            </Field>
            <Field label="Rate type" htmlFor="competitor-filter-rateType">
              <select
                id="competitor-filter-rateType"
                name="rateType"
                defaultValue={filters.rateType}
                className={inp}
              >
                <option value="">Any type</option>
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </Field>
            <Field label="Repayment" htmlFor="competitor-filter-repaymentType">
              <select
                id="competitor-filter-repaymentType"
                name="repaymentType"
                defaultValue={filters.repaymentType}
                className={inp}
              >
                <option value="">Any repayment</option>
                <option value="principal_and_interest">P&I only</option>
              </select>
            </Field>
            <Field label="Rows" htmlFor="competitor-filter-pageSize">
              <select
                id="competitor-filter-pageSize"
                name="pageSize"
                defaultValue={pageSize}
                className={inp}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <button type="submit" className={`${btn} min-h-9`}>
                Apply
              </button>
              {activeFilterCount > 0 && (
                <Link
                  href="/admin/market-search"
                  className={`${btnGhost} min-h-9 px-3`}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs text-muted">
          <span>
            Showing {firstRow}-{lastRow} of {filteredRateCount} filtered rates
            {filteredRateCount !== rateCount
              ? ` (${rateCount} total cached)`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={rateQueryHref(queryState, { page: Math.max(1, page - 1) })}
              aria-disabled={page <= 1}
              className={`${btnGhost} ${
                page <= 1 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <span className="tnum text-ink">
              Page {page} of {totalPages}
            </span>
            <Link
              href={rateQueryHref(queryState, {
                page: Math.min(totalPages, page + 1),
              })}
              aria-disabled={page >= totalPages}
              className={`${btnGhost} ${
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          tabIndex={0}
          aria-label="Competitor rates table"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Use</th>
                <th className={th}>Lender</th>
                <th className={th}>Product</th>
                <th className={th}>Scenario</th>
                <th className={th}>LVR</th>
                <th className={th}>Advertised</th>
                <th className={th}>Comparison</th>
                <th className={th}>Fetched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.length === 0 && (
                <tr>
                  <td
                    className={`${td} py-6 text-center text-muted`}
                    colSpan={8}
                  >
                    No fictional competitor rates match these filters. Clear the
                    filters or restore the bundled catalogue.
                  </td>
                </tr>
              )}
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className={`${td} w-[64px] whitespace-nowrap`}>
                    <ConfigurationForm
                      action={async (data) => {
                        await setDemoMarketProductActive(
                          expectedConfigurationVersion(
                            data,
                            configuration.version,
                          ),
                          rate.productKey,
                          !rate.active,
                        );
                        reportConfigurationResult(
                          "Market product selection saved.",
                          "success",
                        );
                      }}
                      className="inline-flex items-center"
                    >
                      <input type="hidden" name="id" value={rate.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={rate.active ? "false" : "true"}
                      />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={currentRateBrowserPath}
                      />
                      <button
                        type="submit"
                        role="switch"
                        aria-checked={rate.active}
                        aria-label={
                          rate.active
                            ? "Disable rate for market comparison"
                            : "Enable rate for market comparison"
                        }
                        className="group inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full p-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <span
                          aria-hidden="true"
                          className={`relative h-6 w-11 rounded-full border border-border-strong transition-colors group-hover:border-muted/60 ${
                            rate.active ? "bg-brand" : "bg-border-strong"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-[var(--shadow-sm)] transition-transform ${
                              rate.active
                                ? "translate-x-[21px]"
                                : "translate-x-0.5"
                            }`}
                          >
                            {rate.active && (
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] leading-none text-brand">
                                ✓
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </ConfigurationForm>
                  </td>
                  <td className={td}>
                    <span className="block">{rate.lenderName}</span>
                    <Badge tone="muted" size="sm" className="mt-1">
                      Fictional fixture
                    </Badge>
                  </td>
                  <td className={td}>{rate.productName}</td>
                  <td className={td}>
                    {rate.loanPurpose ?? "any"} / {rate.rateType}
                    {rate.fixedPeriodMonths
                      ? ` ${rate.fixedPeriodMonths}m`
                      : ""}
                  </td>
                  <td className={td}>
                    {rate.minLvr ?? "—"}-{rate.maxLvr ?? "—"}
                  </td>
                  <td className={td}>{fmtPct(rate.advertisedRate)}</td>
                  <td className={td}>{fmtPct(rate.comparisonRate)}</td>
                  <td className={td}>{fmtDateTime(rate.fetchedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
