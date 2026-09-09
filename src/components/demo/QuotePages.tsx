"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  ArrowUpDown,
  GitBranch,
  X,
  ChevronDown,
  Workflow,
  UserRoundCheck,
  Landmark,
  ShieldCheck,
  Users,
  Calculator,
  FileText,
  Star,
  Search,
  History,
  Download,
  Printer,
} from "lucide-react";
import { useDemo, WorkspaceLoading } from "./DemoProvider";
import {
  AREA_INFO,
  date,
  human,
  money,
  quoteHref,
} from "@/lib/demo/presentation";
import {
  DEMO_AREAS,
  DEMO_WORKFLOW_STATUSES,
  type DemoArea,
  type DemoCore,
  type DemoQuote,
  type DemoReviewDecision,
  type DemoWorkflowStatus,
} from "@/lib/demo/types";
import {
  addComment,
  assignQuote,
  getCore,
  getHistory,
  getQuote,
  listQuotes,
  reviewQuote,
  setStarred,
  updateWorkflow,
} from "@/lib/demo/store";
import { DemoSavedResult } from "@/components/DemoSavedResult";

import { ProductTabs } from "./WorkspacePages";
import { buttonClass } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiTile } from "@/components/ui/KpiTile";
import { inputClass } from "@/components/ui/Field";
import { QuoteParameterFinder } from "@/components/quotes/QuoteParameterFinder";
import { DetailGroup, Item, Note } from "@/components/quotes/QuoteDetailInputs";
import { QuoteDetailDisclosureToggle } from "@/components/quotes/QuoteDetailDisclosureToggle";
import { DetailSectionGroup } from "@/components/result/shared";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { DemoQuoteRowMenu } from "./DemoQuoteRowMenu";
import {
  labelRiskGrade,
  riskGradeTone,
  labelFacilityType,
  labelIndustry,
} from "@/lib/pricing/commercial/labels";
import { fmtPct as percent, fmtRelativeTime, fmtDateTime } from "@/lib/format";

type QuoteRow = { quote: DemoQuote; core: DemoCore };

function useQuoteRows(area?: DemoArea) {
  const { ready, version } = useDemo();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void Promise.all(
      (area ? [area] : DEMO_AREAS).map((item) => listQuotes(item)),
    )
      .then(async (lists) => {
        const all = lists.flat();
        const entries = await Promise.all(
          all.map(async (quote) => ({
            quote,
            core: await getCore(quote.coreId),
          })),
        );
        if (active) {
          setRows(
            entries.filter(
              (entry): entry is QuoteRow =>
                !!entry.core && entry.core.currentQuoteId === entry.quote.id,
            ),
          );
          setLoaded(true);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load saved quotes.",
          );
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [ready, version, area]);
  return { rows, error, loaded: ready && loaded };
}

const LIST_COPY = {
  home: {
    title: "Home Loan Quotes",
    caption:
      "Saved quotes with Suggested Rates — indicative pricing, not approvals.",
    scope: "product",
    all: "All products",
  },
  personal: {
    title: "Personal Loan Quotes",
    caption:
      "Score-priced secured and unsecured consumer lending quotes — indicative pricing, not approvals.",
    scope: "security",
    all: "All security types",
  },
  commercial: {
    title: "Commercial Loan Quotes",
    caption:
      "Tailored pricing for business lending facilities — indicative pricing, not approvals.",
    scope: "facility",
    all: "All facility types",
  },
} as const;

function savedResult(quote: DemoQuote): Record<string, unknown> {
  return quote.result && typeof quote.result === "object"
    ? (quote.result as Record<string, unknown>)
    : {};
}
function nested(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function appliedDiscount(quote: DemoQuote) {
  const result = savedResult(quote);
  const starting = finite(result.startingRate),
    suggested = finite(result.suggestedRate);
  return result.pricingBasis === "discount_entitlement_v1" &&
    starting !== null &&
    suggested !== null
    ? Math.max(0, Number((starting - suggested).toFixed(6)))
    : null;
}
function scopeValue(quote: DemoQuote) {
  return quote.area === "home"
    ? quote.summary.productName
    : String(
        quote.input[
          quote.area === "personal" ? "securityType" : "facilityType"
        ] ?? "",
      );
}
function WorkflowBadge({ status }: { status: DemoWorkflowStatus }) {
  return (
    <Badge
      size="sm"
      tone={
        status === "reviewed"
          ? "ok"
          : status.startsWith("needs_")
            ? "warn"
            : status === "ready_for_review"
              ? "info"
              : "muted"
      }
    >
      {human(status)}
    </Badge>
  );
}

function RowActions({
  quote,
  core,
  onError,
}: QuoteRow & { onError: (message: string) => void }) {
  return (
    <div className="flex shrink-0 items-center justify-end">
      <button
        type="button"
        aria-label={`${core.starred ? "Unstar" : "Star"} ${quote.customerName}`}
        aria-pressed={core.starred}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors hover:bg-panel ${core.starred ? "text-brand" : "text-muted hover:text-brand"}`}
        onClick={() => {
          void setStarred(core.id, !core.starred).catch((cause: unknown) =>
            onError(
              cause instanceof Error
                ? cause.message
                : "Could not update the star.",
            ),
          );
        }}
      >
        <Star
          size={17}
          strokeWidth={1.75}
          fill={core.starred ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
      <DemoQuoteRowMenu quoteId={quote.id} area={quote.area} />
    </div>
  );
}

export function QuotesPage({ area }: { area: DemoArea }) {
  const { rows, error, loaded } = useQuoteRows(area);
  const params = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const info = AREA_INFO[area],
    copy = LIST_COPY[area];
  const search = params.get("q") ?? "",
    scope = params.get(copy.scope) ?? "",
    approval = params.get("approval") ?? "",
    workflow = params.get("workflow") ?? "",
    range = params.get("range") ?? "",
    starred = params.get("starred") === "1";
  const sort = params.get("sort") ?? "created",
    dir = params.get("dir") === "asc" ? "asc" : "desc";
  const pageSize = 25;
  const [filterClock] = useState(() => Date.now());
  function update(updates: Record<string, string>) {
    // Read the browser URL so consecutive controls also merge changes made
    // before Next has committed its transition to the new search params.
    const next = new URLSearchParams(window.location.search);
    if (!("page" in updates)) next.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Next owns its private history state. Passing it back marks this as an
    // internal router write and skips synchronising useSearchParams.
    window.history.replaceState(
      null,
      "",
      `${info.path}/${next.size ? `?${next}` : ""}`,
    );
  }
  const filtered = rows
    .filter(
      ({ quote, core }) =>
        (!starred || core.starred) &&
        (!scope || scopeValue(quote) === scope) &&
        (!approval || quote.summary.approval === approval) &&
        (!workflow || core.status === workflow) &&
        (!range ||
          Date.parse(quote.createdAt) >=
            filterClock - Number(range) * 86400000) &&
        `${quote.customerName} ${quote.summary.productName} ${quote.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const value = (row: QuoteRow) =>
        sort === "loan"
          ? row.quote.summary.amount
          : sort === "suggested"
            ? finite(savedResult(row.quote).suggestedRate)
            : Date.parse(row.quote.createdAt);
      const av = value(a),
        bv = value(b);
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * (dir === "asc" ? 1 : -1);
    });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)),
    page = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(
    search || scope || approval || workflow || range || starred,
  );
  const flags = visible.filter(({ quote }) =>
    area === "home"
      ? ["review", "exception"].includes(quote.summary.approval)
      : area === "personal"
        ? ["tight", "insufficient", "not_assessed"].includes(
            String(nested(savedResult(quote), "affordability").status),
          )
        : ["marginal", "insufficient"].includes(
            String(nested(savedResult(quote), "cashFlow").band),
          ),
  ).length;
  const chips = [
    ["q", search ? `Search: “${search}”` : ""],
    [copy.scope, scope ? human(scope) : ""],
    ["approval", approval ? human(approval) : ""],
    ["workflow", workflow ? human(workflow) : ""],
    ["range", range ? `Last ${range} days` : ""],
    ["starred", starred ? "Starred only" : ""],
  ].filter(([, label]) => label);
  const sortButton = (column: string, label: string) => (
    <button
      className="inline-flex min-h-11 items-center gap-1 font-medium hover:text-ink"
      onClick={() =>
        update({
          sort: column,
          dir: sort === column && dir === "desc" ? "asc" : "desc",
        })
      }
    >
      {label}
      <ArrowUpDown size={12} aria-hidden />
    </button>
  );
  return (
    <section data-product={area}>
      <ProductTabs area={area} />
      <PageHeader
        title={copy.title}
        caption={copy.caption}
        actions={
          <Link href={`${info.path}/new/`} className={buttonClass("primary")}>
            <Plus size={15} strokeWidth={2} aria-hidden />
            New quote
          </Link>
        }
      />
      <div className="mb-4 grid grid-cols-6 gap-3 lg:grid-cols-5">
        <KpiTile
          className="col-span-3 lg:col-span-1"
          label="Quotes"
          value={filtered.length}
          hint={hasFilters ? "Matching filters" : "All saved quotes"}
        />
        <KpiTile
          className="col-span-3 lg:col-span-1"
          label="Approval required"
          value={
            visible.filter(({ quote }) => quote.summary.approval !== "none")
              .length
          }
          hint="On this page"
        />
        <KpiTile
          className="col-span-2 lg:col-span-1"
          label={
            area === "home"
              ? "Review / exception"
              : area === "personal"
                ? "Affordability flags"
                : "Cover below benchmark"
          }
          value={flags}
          tone={flags ? "warn" : undefined}
          hint="On this page"
        />
        <KpiTile
          className="col-span-2 lg:col-span-1"
          label={
            area === "commercial" ? "Needs risk info" : "Needs credit risk"
          }
          value={
            visible.filter(({ core }) => core.status === "needs_risk_info")
              .length
          }
          hint="On this page · handoff queue"
        />
        <KpiTile
          className="col-span-2 lg:col-span-1"
          label="Ready for review"
          value={
            visible.filter(({ core }) => core.status === "ready_for_review")
              .length
          }
          hint="On this page · handoff queue"
        />
      </div>
      <div className="demo-no-print mb-5">
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              size={16}
              aria-hidden
            />
            <input
              className={`${inputClass} pl-9`}
              type="search"
              aria-label="Search saved quotes"
              placeholder={
                area === "commercial"
                  ? "Search business name..."
                  : "Search customer / reference..."
              }
              value={search}
              onChange={(event) => update({ q: event.target.value })}
            />
          </div>
          <select
            aria-label={`Filter by ${copy.scope}`}
            className={inputClass}
            value={scope}
            onChange={(event) => update({ [copy.scope]: event.target.value })}
          >
            <option value="">{copy.all}</option>
            {[...new Set(rows.map(({ quote }) => scopeValue(quote)))]
              .filter(Boolean)
              .map((value) => (
                <option key={value} value={value}>
                  {area === "home" ? value : human(value)}
                </option>
              ))}
          </select>
          <select
            aria-label="Filter by approval level"
            className={inputClass}
            value={approval}
            onChange={(event) => update({ approval: event.target.value })}
          >
            <option value="">All approval levels</option>
            {["none", "manager", "senior", "review", "exception"].map(
              (value) => (
                <option key={value} value={value}>
                  {human(value)}
                </option>
              ),
            )}
          </select>
          <select
            aria-label="Filter by handoff status"
            className={inputClass}
            value={workflow}
            onChange={(event) => update({ workflow: event.target.value })}
          >
            <option value="">All handoff statuses</option>
            {DEMO_WORKFLOW_STATUSES.map((value) => (
              <option key={value} value={value}>
                {human(value)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by created date"
            className={inputClass}
            value={range}
            onChange={(event) => update({ range: event.target.value })}
          >
            <option value="">All time</option>
            {[7, 30, 90].map((value) => (
              <option key={value} value={value}>
                Last {value} days
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={starred}
            onClick={() => update({ starred: starred ? "" : "1" })}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors ${starred ? "border-brand/30 bg-brand-soft text-brand-strong hover:border-brand/45" : "border-border bg-surface text-muted hover:border-border-strong hover:bg-panel hover:text-ink"}`}
          >
            <Star
              size={15}
              strokeWidth={1.75}
              fill={starred ? "currentColor" : "none"}
              aria-hidden
            />
            Starred only
          </button>
        </div>
        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ [key]: "" })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink hover:border-border-strong"
              >
                {label}
                <X size={12} aria-hidden />
              </button>
            ))}
            <Link
              href={`${info.path}/`}
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-muted hover:bg-panel hover:text-ink"
            >
              Clear all
            </Link>
          </div>
        )}
      </div>
      {(error || actionError) && (
        <p
          role="alert"
          className="my-4 rounded-lg bg-alert-soft p-3 text-sm text-alert"
        >
          {error || actionError}
        </p>
      )}
      {!loaded ? (
        <WorkspaceLoading />
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
          <h2 className="text-base font-semibold">
            {hasFilters ? "No quotes match these filters" : "No quotes yet"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {hasFilters
              ? "Try widening the date range or clearing a filter."
              : "Create the first quote to see a Suggested Rate, Indicative Repayments and the approval requirement."}
          </p>
          <Link
            className={buttonClass("secondary", "sm", "mt-5")}
            href={hasFilters ? `${info.path}/` : `${info.path}/new/`}
          >
            {hasFilters ? "Clear filters" : "New quote"}
          </Link>
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex flex-1 items-center gap-2 text-xs text-muted">
                Sort by
                <select
                  className={`${inputClass} flex-1`}
                  value={sort}
                  onChange={(event) => update({ sort: event.target.value })}
                >
                  <option value="created">Created</option>
                  <option value="loan">Loan</option>
                  <option value="suggested">Suggested rate</option>
                </select>
              </label>
              <button
                className={buttonClass("secondary", "sm")}
                onClick={() => update({ dir: dir === "desc" ? "asc" : "desc" })}
              >
                <ArrowUpDown size={14} aria-hidden />
                {dir === "desc" ? "Descending" : "Ascending"}
              </button>
            </div>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {visible.map(({ quote, core }) => {
                const result = savedResult(quote);
                const metrics = [
                  ["Discount", percent(appliedDiscount(quote))],
                  ["Suggested rate", percent(finite(result.suggestedRate))],
                  [
                    area === "commercial" ? "Facility" : "Loan",
                    money(quote.summary.amount),
                  ],
                  [
                    area === "home"
                      ? "LVR"
                      : area === "personal"
                        ? "Customer score"
                        : "DSCR",
                    area === "home"
                      ? percent(finite(result.lvr))
                      : area === "personal"
                        ? String(nested(result, "customerScore").score ?? "—")
                        : `${finite(nested(result, "cashFlow").debtServiceCoverRatio)?.toFixed(2) ?? "—"}x`,
                  ],
                  ["Requested", percent(finite(result.requestedRate))],
                ].slice(0, area === "home" ? 5 : 3);
                return (
                  <li className="py-3.5" key={quote.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          className="flex min-h-11 items-center rounded-md font-semibold text-ink underline-offset-2 hover:text-brand"
                          href={quoteHref(area, quote.id)}
                        >
                          <span className="block truncate">
                            {quote.customerName}
                          </span>
                        </Link>
                        <div className="-mt-1 text-xs text-faint">
                          <span className="tnum">
                            #{quote.id} · v{quote.revision}
                          </span>{" "}
                          · {fmtRelativeTime(quote.createdAt)}
                        </div>
                      </div>
                      <RowActions
                        quote={quote}
                        core={core}
                        onError={setActionError}
                      />
                    </div>
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                      {metrics.map(([label, value]) => (
                        <div
                          className="flex items-baseline justify-between gap-3"
                          key={label}
                        >
                          <dt className="text-xs text-muted">{label}</dt>
                          <dd className="tnum text-base font-semibold text-ink">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {area === "commercial" && (
                        <Badge
                          tone={riskGradeTone(
                            String(quote.input.businessRiskGrade ?? ""),
                          )}
                          size="sm"
                        >
                          {labelRiskGrade(
                            String(quote.input.businessRiskGrade ?? ""),
                          )}
                        </Badge>
                      )}
                      {area === "personal" && (
                        <Badge tone="muted" size="sm">
                          {String(nested(result, "customerScore").score ?? "—")}{" "}
                          ·{" "}
                          {human(
                            String(
                              nested(result, "customerScore").band ??
                                "Not assessed",
                            ),
                          )}
                        </Badge>
                      )}
                      <ApprovalBadge
                        level={quote.summary.approval}
                        size="sm"
                        short
                      />
                      <WorkflowBadge status={core.status} />
                      <span className="text-xs text-muted">
                        {quote.summary.productName}
                        {area !== "home"
                          ? ` · ${human(scopeValue(quote))}`
                          : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden overflow-x-auto border-y border-border lg:block">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border-strong">
                  <th className="px-3 py-2.5 font-medium">
                    {area === "commercial" ? "Business" : "Customer"}
                  </th>
                  {area === "commercial" && (
                    <th className="px-3 py-2.5 font-medium">Facility</th>
                  )}
                  <th className="px-3 py-0 text-right font-medium">
                    {sortButton(
                      "loan",
                      area === "commercial" ? "Amount" : "Loan",
                    )}
                  </th>
                  {area === "personal" && (
                    <>
                      <th className="px-3 py-2.5 font-medium">Security</th>
                      <th className="px-3 py-2.5 font-medium">
                        Customer score
                      </th>
                    </>
                  )}
                  {area === "commercial" && (
                    <th className="px-3 py-2.5 font-medium">Risk grade</th>
                  )}
                  <th className="px-3 py-2.5 text-right font-medium">
                    Discount
                  </th>
                  <th className="px-3 py-0 text-right font-medium">
                    {sortButton("suggested", "Suggested rate")}
                  </th>
                  {area === "home" && (
                    <th className="hidden px-3 py-2.5 text-right font-medium xl:table-cell">
                      Requested
                    </th>
                  )}
                  {area === "commercial" && (
                    <th className="px-3 py-2.5 text-right font-medium">DSCR</th>
                  )}
                  <th className="px-3 py-2.5 font-medium">Approval</th>
                  <th className="px-3 py-2.5 font-medium">Handoff</th>
                  <th className="px-3 py-2.5 font-medium">Assigned</th>
                  <th className="px-3 py-0 font-medium">
                    {sortButton("created", "Created")}
                  </th>
                  <th className="w-20 px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map(({ quote, core }) => {
                  const result = savedResult(quote),
                    score = nested(result, "customerScore");
                  return (
                    <tr
                      key={quote.id}
                      className="group cursor-pointer transition-colors hover:bg-panel/40"
                      onClick={(event) => {
                        if (
                          !(event.target as HTMLElement).closest(
                            "a,button,details",
                          )
                        )
                          window.location.assign(quoteHref(area, quote.id));
                      }}
                    >
                      <td className="px-3 py-3">
                        <Link
                          className="font-medium text-ink underline-offset-2 group-hover:text-brand"
                          href={quoteHref(area, quote.id)}
                        >
                          {quote.customerName}
                        </Link>
                        <div className="mt-0.5 text-xs text-faint">
                          <span className="tnum">
                            #{quote.id} · v{quote.revision}
                          </span>{" "}
                          ·{" "}
                          {area === "commercial"
                            ? labelIndustry(
                                String(quote.input.industryCategory ?? ""),
                              )
                            : quote.summary.productName}
                        </div>
                      </td>
                      {area === "commercial" && (
                        <td className="px-3 py-3 text-muted">
                          {labelFacilityType(scopeValue(quote))}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <div className="tnum text-ink">
                          {money(quote.summary.amount)}
                        </div>
                        {area === "home" && (
                          <div className="tnum mt-0.5 text-xs text-faint">
                            {percent(finite(result.lvr))} LVR
                          </div>
                        )}
                      </td>
                      {area === "personal" && (
                        <>
                          <td className="px-3 py-3 text-muted">
                            {human(scopeValue(quote))}
                          </td>
                          <td className="px-3 py-3">
                            <span className="tnum">
                              {String(score.score ?? "—")}
                            </span>
                            <div className="text-xs text-faint">
                              {human(String(score.band ?? ""))}
                            </div>
                          </td>
                        </>
                      )}
                      {area === "commercial" && (
                        <td className="px-3 py-3">
                          <Badge
                            tone={riskGradeTone(
                              String(quote.input.businessRiskGrade ?? ""),
                            )}
                            size="sm"
                          >
                            {labelRiskGrade(
                              String(quote.input.businessRiskGrade ?? ""),
                            )}
                          </Badge>
                        </td>
                      )}
                      <td className="tnum px-3 py-3 text-right text-muted">
                        {percent(appliedDiscount(quote))}
                      </td>
                      <td className="tnum px-3 py-3 text-right font-semibold text-ink">
                        {percent(finite(result.suggestedRate))}
                      </td>
                      {area === "home" && (
                        <td className="tnum hidden px-3 py-3 text-right text-muted xl:table-cell">
                          {percent(finite(result.requestedRate))}
                        </td>
                      )}
                      {area === "commercial" && (
                        <td className="tnum px-3 py-3 text-right">
                          {finite(
                            nested(result, "cashFlow").debtServiceCoverRatio,
                          ) === null
                            ? "—"
                            : `${finite(nested(result, "cashFlow").debtServiceCoverRatio)?.toFixed(2)}x`}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <ApprovalBadge
                          level={quote.summary.approval}
                          size="sm"
                          short
                        />
                      </td>
                      <td className="px-3 py-3">
                        <WorkflowBadge status={core.status} />
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {core.assignee || "—"}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-3 text-muted"
                        title={fmtDateTime(quote.createdAt)}
                      >
                        {fmtRelativeTime(quote.createdAt)}
                      </td>
                      <td className="px-2 py-3">
                        <RowActions
                          quote={quote}
                          core={core}
                          onError={setActionError}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              <span className="tnum">
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="tnum">{filtered.length}</span> quotes
            </p>
            <div className="flex items-center gap-2">
              <button
                className={buttonClass("secondary", "sm")}
                disabled={page === 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span className="tnum px-2">
                {page} / {pageCount}
              </span>
              <button
                className={buttonClass("secondary", "sm")}
                disabled={page === pageCount}
                onClick={() => update({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function saveJson(quote: DemoQuote, core: DemoCore) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          format: "pricing-tool-demo/v1",
          notice: "Fictional portfolio demonstration",
          quote,
          workflow: core,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pricing-tool-${quote.area}-${quote.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const INPUT_LABELS: Record<string, string> = {
  customerReference: "Customer reference",
  customerName: "Customer",
  businessName: "Business name",
  productId: "Product",
  loanAmount: "Loan amount",
  securityValue: "Security value",
  loanTermYears: "Term",
  loanPurpose: "Loan purpose",
  rateType: "Rate type",
  repaymentType: "Repayments",
  interestOnlyPeriodYears: "Interest-only period",
  customerStream: "Stream",
  channel: "Channel",
  securityType: "Security",
  facilityType: "Facility",
  loanType: "Loan type",
  propertyTransactionType: "Transaction type",
  purchasePrice: "Purchase price",
  customerEquityContribution: "Customer Equity Contribution",
  businessRiskGrade: "Risk grade",
  abn: "ABN",
  industryCategory: "Industry",
  ebitda: "EBITDA",
  annualRevenue: "Annual revenue",
  existingAnnualDebtService: "Existing annual debt service",
  financialsQuality: "Financials quality",
  financialsAgeMonths: "Financials age",
  revenueTrend: "Revenue trend",
  profitTrend: "Profit trend",
  taxStatus: "ATO tax status",
  yearsTrading: "Years trading",
  netMonthlyIncome: "Net monthly income",
  livingExpenses: "Living expenses",
  monthlyLivingExpenses: "Living expenses",
  existingMonthlyDebtRepayments: "Existing debt repayments",
  existingDebtRepayments: "Existing debt repayments",
  creditScore: "Credit score",
  creditScores: "Individual credit scores",
  numberOfBorrowers: "Number of borrowers",
  employmentType: "Employment / income",
  yearsWithLender: "Years as member",
  yearsAsMember: "Years as member",
  vipCustomer: "VIP customer",
  livesInServiceRegion: "Living in Region",
  operatingInRegion: "Operating / based in Region",
  existingRelationship: "Relationship",
  otherLenderExposure: "Other lender exposure",
  lenderProducts: "Lender products",
  costOfFunds: "Cost of funds",
  commissions: "Commission cost",
  otherIncome: "Other income",
  expenses: "Operating expenses",
  expectedUtilisationPct: "Expected utilisation",
  competitorLender: "Competitor lender",
  competitorRate: "Competitor rate",
  requestedRate: "Requested rate",
  requestedReason: "Requested reason",
  requestedReasonNotes: "Request notes",
  competitorNotes: "Competitor evidence",
  brokerName: "Broker name",
  brokerCompany: "Broker company",
  brokerInRegion: "Broker in our region",
  notes: "Quote notes",
  apsExposureClass: "APS exposure class",
  capitalClassificationConfirmed: "Capital classification confirmed",
  capitalPropertyStandardStatus: "Property standard status",
  riskWeightOverridePct: "Risk weight override",
  taxRateOverridePct: "Tax rate override",
  creditConversionFactorOverridePct: "Credit conversion factor override",
  capitalOverrideReason: "Capital override reason",
  expectedCreditLossOverrideAmount: "Expected credit loss override",
  expectedCreditLossOverrideEnabled: "Expected credit loss override enabled",
  expectedCreditLossOverrideReason: "Expected credit loss override reason",
  lvr: "LVR",
};
const INPUT_GROUPS = {
  home: [
    {
      title: "Loan scenario",
      description: "Product, security and term details.",
      keys: [
        "customerReference",
        "customerName",
        "customerStream",
        "channel",
        "productId",
        "loanAmount",
        "securityValue",
        "loanPurpose",
        "rateType",
        "repaymentType",
        "loanTermYears",
        "interestOnlyPeriodYears",
      ],
      icon: Landmark,
    },
    {
      title: "Retention pricing",
      description: "Existing pricing and retention context.",
      keys: [
        "retentionScenario",
        "existingRate",
        "retentionCurrentRate",
        "retentionPricingMode",
        "retentionDiscountMode",
        "retentionReason",
      ],
      icon: Calculator,
    },
    {
      title: "Customer risk",
      description: "Borrower credit and risk information.",
      keys: [
        "creditScore",
        "creditScores",
        "numberOfBorrowers",
        "employmentType",
        "employmentStatus",
        "incomeType",
        "incomeDocumentation",
        "netMonthlyIncome",
        "annualIncome",
        "creditHistory",
        "arrearsHistory",
        "bankruptcyHistory",
        "dependants",
      ],
      icon: ShieldCheck,
    },
    {
      title: "Relationship",
      description: "Membership and relationship context.",
      keys: [
        "existingMember",
        "existingRelationship",
        "yearsWithLender",
        "yearsAsMember",
        "lenderProducts",
        "relationshipDepth",
        "salaryCredit",
        "vipCustomer",
        "livesInServiceRegion",
      ],
      icon: Users,
    },
    {
      title: "Strategic",
      description: "Requested pricing and relationship opportunities.",
      keys: [
        "newToBankGrowthOpportunity",
        "competitorLender",
        "competitorRate",
        "competitorNotes",
        "requestedRate",
        "requestedReason",
        "requestedReasonNotes",
        "marketEvidence",
        "marketRateId",
      ],
      icon: Calculator,
    },
  ],
  personal: [
    {
      title: "Loan scenario",
      description: "Loan, security and repayment details.",
      keys: [
        "customerReference",
        "customerName",
        "customerStream",
        "channel",
        "productId",
        "loanAmount",
        "loanPurpose",
        "loanTermYears",
        "repaymentType",
        "securityType",
        "securityValue",
        "vehicleAgeYears",
        "vehicleType",
      ],
      icon: Landmark,
    },
    {
      title: "Customer risk",
      description: "Borrower credit and employment profile.",
      keys: [
        "creditScore",
        "creditScores",
        "numberOfBorrowers",
        "employmentType",
        "employmentStatus",
        "employmentTenureMonths",
        "housingStatus",
        "incomeType",
        "creditHistory",
      ],
      icon: ShieldCheck,
    },
    {
      title: "Relationship",
      description: "Membership and relationship context.",
      keys: [
        "existingMember",
        "existingRelationship",
        "yearsWithLender",
        "yearsAsMember",
        "lenderProducts",
        "vipCustomer",
        "livesInServiceRegion",
      ],
      icon: Users,
    },
    {
      title: "Affordability inputs",
      description: "Income, living costs and existing repayments.",
      keys: [
        "netMonthlyIncome",
        "livingExpenses",
        "monthlyLivingExpenses",
        "existingMonthlyDebtRepayments",
        "existingDebtRepayments",
        "dependants",
      ],
      icon: Calculator,
    },
    {
      title: "Requested pricing",
      description: "Market evidence and rate request.",
      keys: [
        "competitorLender",
        "competitorRate",
        "competitorNotes",
        "requestedRate",
        "requestedReason",
        "requestedReasonNotes",
        "marketEvidence",
        "marketRateId",
      ],
      icon: Calculator,
    },
  ],
  commercial: [
    {
      title: "Facility",
      description: "Facility, term, security and requested pricing.",
      keys: [
        "customerReference",
        "businessName",
        "facilityType",
        "loanType",
        "propertyTransactionType",
        "purchasePrice",
        "customerEquityContribution",
        "equipmentPurchasePrice",
        "equipmentCustomerContribution",
        "loanAmount",
        "loanTermYears",
        "repaymentType",
        "securityType",
        "securityValue",
        "securities",
        "competitorLender",
        "competitorRate",
        "competitorNotes",
        "requestedRate",
        "requestedReason",
        "requestedReasonNotes",
        "marketEvidence",
        "marketRateId",
        "loanPurposeNotes",
      ],
      icon: Landmark,
    },
    {
      title: "Business",
      description: "Business profile, financials and risk information.",
      keys: [
        "abn",
        "industryCategory",
        "businessRiskGrade",
        "yearsTrading",
        "annualRevenue",
        "ebitda",
        "existingAnnualDebtService",
        "financialsQuality",
        "financialsAgeMonths",
        "revenueTrend",
        "profitTrend",
        "taxStatus",
        "largestCustomerRevenueAboveThreshold",
        "customerConcentrationPct",
      ],
      icon: ShieldCheck,
    },
    {
      title: "Relationship",
      description: "Membership and wider lending relationship.",
      keys: [
        "customerStream",
        "existingRelationship",
        "yearsWithLender",
        "lenderProducts",
        "vipCustomer",
        "operatingInRegion",
        "otherLenderExposure",
      ],
      icon: Users,
    },
  ],
};
function displayInput(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (
      /Amount|Income|Revenue|Expenses|expenses|Repayments|DebtService|securityValue|SecurityValue|Price|Contribution|commissions|Exposure|ebitda|Balance|Fee/.test(
        key,
      )
    )
      return money(value);
    if (/Rate|Pct|costOfFunds/.test(key)) return percent(value);
    if (/Years$/.test(key)) return `${value} years`;
    if (/Months$/.test(key)) return `${value} months`;
    return new Intl.NumberFormat("en-AU").format(value);
  }
  if (Array.isArray(value))
    return value
      .map((item) =>
        typeof item === "object" && item
          ? Object.entries(item)
              .map(
                ([name, entry]) =>
                  `${INPUT_LABELS[name] ?? human(name)}: ${displayInput(name, entry)}`,
              )
              .join(" · ")
          : displayInput(key, item),
      )
      .join("; ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(
        ([name, entry]) =>
          `${INPUT_LABELS[name] ?? human(name)}: ${displayInput(name, entry)}`,
      )
      .join(" · ");
  return String(value).includes("_") ? human(String(value)) : String(value);
}
function InputSnapshot({ quote }: { quote: DemoQuote }) {
  const available = new Set(
    Object.keys(quote.input).filter(
      (key) =>
        quote.input[key] !== null &&
        quote.input[key] !== "" &&
        quote.input[key] !== undefined,
    ),
  );
  const groups = [
    ...INPUT_GROUPS[quote.area],
    {
      title: "Profitability inputs",
      description: "Channel, income and operating costs.",
      keys: [
        "channel",
        "expectedUtilisationPct",
        "costOfFunds",
        "commissions",
        "otherIncome",
        "expenses",
        "upfrontFeeOverride",
        "monthlyFeeOverride",
      ],
      icon: Calculator,
    },
    {
      title: "Capital and expected loss",
      description: "Saved classification facts and reasoned overrides.",
      keys: [
        "apsExposureClass",
        "capitalClassificationConfirmed",
        "capitalPropertyStandardStatus",
        "capitalPropertyCashFlowDependent",
        "riskWeightOverridePct",
        "taxRateOverridePct",
        "creditConversionFactorOverridePct",
        "capitalOverrideReason",
        "currentDrawnBalance",
        "expectedCreditLossOverrideAmount",
        "expectedCreditLossOverrideEnabled",
        "expectedCreditLossOverrideReason",
      ],
      icon: ShieldCheck,
    },
    {
      title: "Broker details",
      description: "Broker and introducer context.",
      keys: [
        "brokerName",
        "brokerCompany",
        "brokerInRegion",
        "brokerLoansLast12Months",
        "brokerLoansWithDiscretion",
      ],
      icon: Users,
    },
    {
      title: "Notes",
      description: "Additional context saved with this quote.",
      keys: ["notes"],
      icon: FileText,
    },
  ];
  const assigned = new Set<string>();
  const populated = groups
    .map((group) => ({
      ...group,
      keys: group.keys.filter((key) => {
        if (!available.has(key) || assigned.has(key)) return false;
        assigned.add(key);
        return true;
      }),
    }))
    .filter((group) => group.keys.length);
  const remaining = [...available].filter((key) => !assigned.has(key));
  if (remaining.length)
    populated.push({
      title: "Additional saved inputs",
      description: "Further details retained in the immutable quote snapshot.",
      keys: remaining,
      icon: FileText,
    });
  return populated.map((group) => (
    <DetailGroup
      key={group.title}
      title={group.title}
      description={group.description}
      icon={<group.icon size={17} strokeWidth={1.8} aria-hidden />}
      summary={group.keys
        .slice(0, 3)
        .map((key) =>
          key === "productId"
            ? quote.summary.productName
            : displayInput(key, quote.input[key]),
        )}
    >
      {group.keys.map((key) => {
        const label =
          INPUT_LABELS[key] ??
          key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (letter) => letter.toUpperCase());
        const value =
          key === "productId"
            ? quote.summary.productName
            : displayInput(key, quote.input[key]);
        return value.length > 85 || key.toLowerCase().includes("notes") ? (
          <Note key={key} label={label} value={value} />
        ) : (
          <Item key={key} label={label} value={value} />
        );
      })}
    </DetailGroup>
  ));
}

function DemoHistoryPanel({
  quote,
  core,
  revisions,
  open,
  onClose,
}: QuoteRow & { revisions: DemoQuote[]; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="quote-history-title"
      aria-describedby="quote-history-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="demo-no-print quote-history-dialog fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-none overflow-hidden border-0 border-l border-border bg-surface p-0 text-ink shadow-[var(--shadow-lg)] sm:w-[min(92vw,32rem)]"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2
              id="quote-history-title"
              className="font-serif text-[1.6rem] font-semibold tracking-[-0.01em] text-ink"
            >
              Quote history
            </h2>
            <p
              id="quote-history-description"
              className="mt-1 text-sm leading-6 text-muted"
            >
              {revisions.length} immutable saved versions. Pricing is shown as
              it was saved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className={buttonClass("ghost", "sm", "shrink-0 px-3")}
            aria-label="Close quote history"
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>
        <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {revisions.map((revision) => (
            <li className="px-5 py-5 sm:px-6" key={revision.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="tnum text-lg font-semibold text-ink">
                      Version {revision.revision}
                    </h3>
                    {revision.id === core.currentQuoteId && (
                      <Badge tone="ok" size="sm">
                        Current
                      </Badge>
                    )}
                    {revision.id === quote.id &&
                      revision.id !== core.currentQuoteId && (
                        <Badge tone="info" size="sm">
                          Viewing
                        </Badge>
                      )}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Saved {fmtDateTime(revision.createdAt)} by Demo user
                  </p>
                </div>
                <span className="tnum shrink-0 text-xs text-faint">
                  #{revision.id}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Amount</dt>
                  <dd className="tnum mt-0.5 font-medium text-ink">
                    {money(revision.summary.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Quoted rate</dt>
                  <dd className="tnum mt-0.5 font-medium text-ink">
                    {percent(revision.summary.rate)}
                  </dd>
                </div>
                {quote.area === "commercial" &&
                  finite(savedResult(revision).totalMargin) !== null && (
                    <div>
                      <dt className="text-xs text-muted">Margin</dt>
                      <dd className="tnum mt-0.5 font-medium text-ink">
                        {percent(finite(savedResult(revision).totalMargin))}
                      </dd>
                    </div>
                  )}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <ApprovalBadge level={revision.summary.approval} size="sm" />
                {revision.id === core.currentQuoteId && (
                  <WorkflowBadge status={core.status} />
                )}
              </div>
              <div className="mt-4">
                {revision.id === quote.id ? (
                  <span
                    className="inline-flex min-h-11 items-center text-sm font-medium text-muted"
                    aria-current="page"
                  >
                    Viewing this version
                  </span>
                ) : (
                  <Link
                    className={buttonClass("secondary", "sm")}
                    href={quoteHref(quote.area, revision.id)}
                  >
                    View this version
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}

export function QuoteDetailPage({ area }: { area: DemoArea }) {
  const params = useSearchParams();
  const rawId = params.get("id");
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
  return (
    <QuoteDetailContent key={`${area}:${rawId ?? ""}`} area={area} id={id} />
  );
}

function QuoteDetailContent({ area, id }: { area: DemoArea; id: number }) {
  const { ready, version } = useDemo();
  const [quote, setQuote] = useState<DemoQuote>();
  const [core, setCore] = useState<DemoCore>();
  const [revisions, setRevisions] = useState<DemoQuote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<DemoReviewDecision>("accepted");
  const [historyOpen, setHistoryOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("history") === "1",
  );
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void (async () => {
      if (!Number.isSafeInteger(id) || id < 1) {
        if (active) {
          setQuote(undefined);
          setCore(undefined);
          setLoaded(true);
        }
        return;
      }
      const saved = await getQuote(area, id);
      const envelope = saved ? await getCore(saved.coreId) : undefined;
      const versions = saved ? await getHistory(area, saved.coreId) : [];
      if (active) {
        setQuote(saved);
        setCore(envelope);
        setRevisions(versions);
        setError(null);
        setLoaded(true);
      }
    })().catch((cause: unknown) => {
      if (active) {
        setError(
          cause instanceof Error ? cause.message : "Could not open the quote.",
        );
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [ready, version, id, area]);
  const action = useCallback(
    async (operation: () => Promise<unknown>, success: string) => {
      setPending(true);
      setError(null);
      setMessage("");
      try {
        await operation();
        setMessage(success);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Your change could not be saved. Please retry.",
        );
      } finally {
        setPending(false);
      }
    },
    [],
  );
  if (!ready || !loaded) return <WorkspaceLoading />;
  if (!quote || !core)
    return (
      <section data-product={area}>
        <ProductTabs area={area} />
        <h1 className="font-serif text-3xl">Quote not found in this browser</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Saved quotes stay in the browser where they were created. This link
          may refer to another browser’s quote, or to a quote removed by Reset
          demo.
        </p>
        <Link
          className={buttonClass("primary", "md", "mt-6")}
          href={`${AREA_INFO[area].path}/`}
        >
          View saved quotes
        </Link>
        {error && (
          <p className="mt-4 text-alert" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  const current = core.currentQuoteId === quote.id;
  return (
    <article data-product={area}>
      <ProductTabs area={area} />
      <div className="space-y-6">
        <header className="border-b border-border pb-5">
          <Link
            href={`${AREA_INFO[area].path}/`}
            className="-ml-0.5 inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-brand"
          >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
            {AREA_INFO[area].singular} quotes
          </Link>
          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-balance font-serif text-[1.8rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
                {quote.customerName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span className="tnum font-medium text-ink">
                  Quote #{quote.id}
                </span>
                <span aria-hidden>·</span>
                <span
                  className="tnum"
                  aria-label={`Revision ${quote.revision}`}
                >
                  v{quote.revision}
                </span>
                <span aria-hidden>·</span>
                <span>Saved {fmtDateTime(quote.createdAt)}</span>
                <span aria-hidden>·</span>
                <span>by Demo user</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-faint">
                Suggested rate and indicative estimates only; this is not an
                approval.
              </p>
              {revisions.length > 1 && (
                <button
                  type="button"
                  className="demo-no-print inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-brand underline-offset-2 hover:underline"
                  onClick={() => setHistoryOpen(true)}
                  aria-haspopup="dialog"
                >
                  <History size={15} strokeWidth={1.8} aria-hidden />
                  History ({revisions.length})
                </button>
              )}
              {!current && (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-info-soft px-3 py-2 text-sm text-ink">
                  <span>
                    Viewing v{quote.revision}; current is v
                    {revisions.find((item) => item.id === core.currentQuoteId)
                      ?.revision ?? "—"}
                    .
                  </span>
                  <Link
                    className="font-medium text-brand hover:underline"
                    href={quoteHref(area, core.currentQuoteId)}
                  >
                    Open current version
                  </Link>
                  <p className="w-full text-xs text-muted">
                    Historical pricing snapshot. Workflow actions are available
                    on the current version.
                  </p>
                </div>
              )}
            </div>
            <div className="demo-no-print flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
              <button
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-55 ${core.starred ? "border-brand/30 bg-brand-soft text-brand-strong hover:border-brand/45" : "border-border-strong bg-surface/80 text-muted hover:bg-panel hover:text-ink"}`}
                aria-pressed={core.starred}
                aria-label={core.starred ? "Unstar quote" : "Star quote"}
                disabled={pending}
                onClick={() => {
                  void action(
                    () => setStarred(core.id, !core.starred),
                    core.starred ? "Star removed." : "Quote starred.",
                  );
                }}
              >
                <Star
                  size={16}
                  strokeWidth={1.75}
                  fill={core.starred ? "currentColor" : "none"}
                  aria-hidden
                />
                {core.starred ? "Unstar" : "Star"}
              </button>
              <details className="relative">
                <summary
                  className={`${buttonClass("secondary", "sm")} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                >
                  More
                  <ChevronDown size={14} strokeWidth={1.9} aria-hidden />
                </summary>
                <div className="absolute right-0 z-30 mt-1 w-[200px] rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-md)]">
                  <button
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-panel"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} aria-hidden />
                    Print / save PDF
                  </button>
                  <button
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-panel"
                    onClick={() => saveJson(quote, core)}
                  >
                    <Download size={15} aria-hidden />
                    Download JSON
                  </button>
                </div>
              </details>
              {current && (
                <Link
                  className={buttonClass(
                    "primary",
                    "sm",
                    "min-w-0 flex-1 sm:flex-none",
                  )}
                  href={`${AREA_INFO[area].path}/revise/?id=${quote.id}`}
                >
                  <GitBranch size={15} strokeWidth={1.75} aria-hidden />
                  Revise quote
                </Link>
              )}
            </div>
          </div>
          <p className="demo-print-title hidden mt-3 text-sm">
            Pricing Tool — fictional portfolio example. Not an offer or credit
            decision.
          </p>
        </header>
        <DemoHistoryPanel
          quote={quote}
          core={core}
          revisions={revisions}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
        <nav
          aria-label="Quote record sections"
          className="demo-no-print sticky top-14 z-20 -mx-4 overflow-x-auto border-y border-border bg-bg px-4 lg:static lg:mx-0 lg:border-y-0 lg:border-b lg:px-0"
        >
          <div className="flex min-w-max items-center gap-1 py-2">
            {["Decision", "Workflow", "Comments", "Inputs"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-ink focus-visible:border-brand focus-visible:text-brand"
              >
                {label}
              </a>
            ))}
            <div className="ml-2 border-l border-border pl-3">
              <QuoteParameterFinder />
            </div>
          </div>
        </nav>
        <section
          id="decision"
          data-quote-parameter-scope="result"
          className="scroll-mt-28"
        >
          <h2 className="sr-only">Saved pricing decision</h2>
          <DemoSavedResult
            area={area}
            result={quote.result}
            input={quote.input}
          />
        </section>
        {message && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-brand-strong"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-alert-soft p-3 text-sm text-alert"
          >
            {error}
          </p>
        )}
        <section
          id="workflow"
          className="scroll-mt-28 overflow-hidden rounded-2xl bg-panel/60"
          aria-labelledby="quote-workflow-heading"
        >
          <header className="flex items-start gap-3 px-4 py-4 sm:px-5">
            <Workflow
              size={19}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-brand"
              aria-hidden
            />
            <h2
              id="quote-workflow-heading"
              className="text-lg font-semibold text-ink"
            >
              Workflow
            </h2>
          </header>
          <div className="grid border-t border-border lg:grid-cols-2 lg:divide-x lg:divide-border">
            <section
              className="px-4 py-5 sm:px-5"
              aria-labelledby="handoff-summary-heading"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="handoff-summary-heading"
                  className="text-sm font-semibold text-ink"
                >
                  Handoff
                </h3>
                <WorkflowBadge status={core.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {core.status === "draft"
                  ? "Quote saved as a draft for further work."
                  : core.status === "ready_for_review"
                    ? "Ready for the next review and lending decision."
                    : core.status === "needs_risk_info"
                      ? "Credit risk information is needed before review."
                      : core.status === "needs_profitability_info"
                        ? "Profitability information is needed before review."
                        : core.status === "reviewed"
                          ? "A review outcome has been recorded."
                          : "This quote has been archived."}
              </p>
              <p className="mt-3 text-sm text-muted">
                Assigned to{" "}
                <span className="font-medium text-ink">
                  {core.assignee || "Unassigned"}
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-faint">
                Current quote #{core.currentQuoteId}
              </p>
              {!current && (
                <p className="mt-3 text-xs leading-5 text-muted">
                  Current series workflow. Open the current version to update
                  handoff.
                </p>
              )}
            </section>
            <section
              className="border-t border-border px-4 py-5 sm:px-5 lg:border-t-0"
              aria-labelledby="review-summary-heading"
            >
              <div className="flex items-start gap-2.5">
                <UserRoundCheck
                  size={17}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-brand"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3
                    id="review-summary-heading"
                    className="text-sm font-semibold text-ink"
                  >
                    Review
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Calculated:{" "}
                    <ApprovalBadge level={quote.summary.approval} size="sm" />
                  </p>
                  {core.review ? (
                    <>
                      <div className="mt-3">
                        <Badge
                          tone={
                            core.review.decision === "accepted"
                              ? "ok"
                              : core.review.decision === "declined"
                                ? "alert"
                                : "warn"
                          }
                        >
                          {human(core.review.decision)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Review of quote #{core.review.quoteId} ·{" "}
                        {fmtDateTime(core.review.createdAt)} by{" "}
                        {core.review.actor}
                      </p>
                      <p className="mt-3 rounded-lg bg-surface/80 px-3 py-2 text-sm leading-6 text-ink">
                        {core.review.reason}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      No review outcome has been recorded.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
          {current && (
            <>
              <details className="demo-no-print group border-t border-border">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface/55 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Workflow size={17} className="text-muted" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        Update handoff
                      </span>
                      <span className="block text-xs leading-5 text-muted">
                        Change status or assign the next action.
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className="shrink-0 text-faint group-open:rotate-180"
                  />
                </summary>
                <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-ink">
                      Workflow status
                    </span>
                    <select
                      className={inputClass}
                      disabled={pending}
                      value={core.status}
                      onChange={(event) => {
                        const status = event.target.value as DemoWorkflowStatus;
                        void action(
                          () => updateWorkflow(core.id, status, quote.id),
                          "Workflow updated.",
                        );
                      }}
                    >
                      {DEMO_WORKFLOW_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {human(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-ink">
                      Assign to a fictional colleague
                    </span>
                    <select
                      className={inputClass}
                      disabled={pending}
                      value={core.assignee}
                      onChange={(event) => {
                        const assignee = event.target.value;
                        void action(
                          () => assignQuote(core.id, assignee),
                          "Assignment updated.",
                        );
                      }}
                    >
                      <option value="">Unassigned</option>
                      <option>Demo user</option>
                      <option>Sample adviser</option>
                      <option>Sample reviewer</option>
                    </select>
                  </label>
                </div>
              </details>
              <form
                className="demo-no-print border-t border-border px-4 py-4 sm:px-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void action(
                    () => reviewQuote(core.id, decision, reason, quote.id),
                    "Review saved.",
                  );
                }}
              >
                <h3 className="text-sm font-semibold text-ink">
                  Record review decision
                </h3>
                <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
                  <label>
                    <span className="mb-1 block text-sm font-medium text-ink">
                      Review decision
                    </span>
                    <select
                      className={inputClass}
                      value={decision}
                      onChange={(event) =>
                        setDecision(event.target.value as DemoReviewDecision)
                      }
                    >
                      <option value="accepted">Accept demo quote</option>
                      <option value="changes_requested">Request changes</option>
                      <option value="declined">Decline demo quote</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium text-ink">
                      Review reason (required)
                    </span>
                    <input
                      className={inputClass}
                      required
                      maxLength={2000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Explain this demonstration decision"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-muted">
                    Acceptance requires complete credit-loss and capital
                    calculations. This is a local workflow simulation.
                  </p>
                  <button
                    className={buttonClass("secondary", "sm")}
                    disabled={pending || !reason.trim()}
                  >
                    Save review
                  </button>
                </div>
              </form>
            </>
          )}
          <details className="group border-t border-border">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface/55 sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <History size={17} className="text-muted" aria-hidden />
                <span className="text-sm font-semibold text-ink">
                  Activity history ({core.history.length})
                </span>
              </span>
              <ChevronDown
                size={16}
                className="text-faint group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ol className="divide-y divide-border border-t border-border px-4 sm:px-5">
              {[...core.history].reverse().map((event) => (
                <li className="py-3" key={event.id}>
                  <p className="text-sm">{event.detail}</p>
                  <p className="mt-1 text-xs text-muted">
                    {event.actor} · {date(event.createdAt)} · Quote #
                    {event.quoteId}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        </section>
        <section
          id="comments"
          className="scroll-mt-28 overflow-hidden border-y border-border"
        >
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">Comments</h2>
                <p className="text-sm text-muted">
                  {core.comments.length
                    ? `${core.comments.length} comment${core.comments.length === 1 ? "" : "s"}`
                    : "No comments have been added."}
                </p>
              </div>
              <span className="text-xs font-medium text-faint">
                Append-only
              </span>
            </div>
          </div>
          <div className="grid gap-6 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
            <div className="min-w-0">
              {!core.comments.length ? (
                <div className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
                  Add the first comment to capture decision context for this
                  quote.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {core.comments.map((item) => (
                    <article className="py-3.5 first:pt-0" key={item.id}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <h3 className="truncate text-sm font-semibold text-ink">
                          {item.actor}
                        </h3>
                        <time
                          dateTime={item.createdAt}
                          className="shrink-0 text-xs text-faint"
                        >
                          {fmtDateTime(item.createdAt)}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                        {item.text}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
              {current ? (
                <form
                  className="demo-no-print space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action(async () => {
                      await addComment(core.id, comment);
                      setComment("");
                    }, "Comment saved.");
                  }}
                >
                  <label>
                    <span className="text-sm font-medium text-ink">
                      Add a demo comment
                    </span>
                    <textarea
                      className="mt-1.5 block min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                      placeholder="Add decision context, follow-up notes or pricing discussion."
                      maxLength={2000}
                      required
                      rows={3}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-end">
                    <button
                      className={buttonClass("primary")}
                      disabled={pending || !comment.trim()}
                    >
                      Add comment
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted">
                  Comments are shared across revisions. Open the current version
                  to add a comment.
                </p>
              )}
            </div>
          </div>
        </section>
        <section
          id="inputs"
          data-quote-detail-disclosures
          data-quote-parameter-scope="input"
          className="scroll-mt-28"
        >
          <DetailSectionGroup
            title="Quote inputs"
            aside="These values are frozen at save time. Fees are context only."
            action={<QuoteDetailDisclosureToggle scopeId="inputs" />}
          >
            <InputSnapshot quote={quote} />
          </DetailSectionGroup>
        </section>
      </div>
    </article>
  );
}
