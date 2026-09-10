"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, MessageSquare } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { ProductAreaShell } from "@/components/ProductAreaShell";
import { PRODUCT_AREA_LIST, type ProductArea } from "@/lib/product-areas";
import { fmtMoney, fmtPct, fmtRelativeTime } from "@/lib/format";
import { useDemo, WorkspaceLoading } from "./DemoProvider";
import { quoteHref } from "@/lib/demo/presentation";
import {
  DEMO_AREAS,
  type DemoArea,
  type DemoCore,
  type DemoQuote,
} from "@/lib/demo/types";
import { getCore, listQuotes } from "@/lib/demo/store";

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

interface RecentQuoteRow {
  id: number;
  label: string;
  amount: number;
  rate: number | null;
  createdAt: string;
}

function ProductAreaPanel({
  area,
  count,
  recent,
}: {
  area: ProductArea;
  count: number;
  recent: RecentQuoteRow[];
}) {
  const Icon = area.icon;
  const singularAreaName = area.shortName.replace(/s$/, "");
  return (
    <section
      data-product={area.key}
      className="flex min-w-0 flex-col rounded-2xl bg-brand-soft p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-ink"
          >
            <Icon size={17} strokeWidth={1.9} />
          </span>
          <h2 className="mt-3.5 font-serif text-[1.3rem] font-semibold tracking-[-0.005em] text-ink">
            {area.shortName}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{area.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <div
            data-testid={`hub-${area.key}-quote-count`}
            className="tnum font-serif text-[2rem] font-semibold leading-none text-brand-strong"
          >
            {count}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {count === 1 ? "saved quote" : "saved quotes"}
          </div>
        </div>
      </div>

      <div data-testid={`hub-${area.key}-recent`} className="mt-5 flex-1">
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand/25 px-3 py-3.5 text-xs leading-relaxed text-muted">
            No quotes yet — create the first {area.shortName.toLowerCase()}{" "}
            quote to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-brand/10 border-y border-brand/10">
            {recent.map((q) => (
              <li key={q.id}>
                <Link
                  href={quoteHref(area.key, q.id)}
                  className="-mx-1.5 flex items-center justify-between gap-3 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-surface/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {q.label}
                    </span>
                    <span className="block text-[11px] text-muted">
                      <span className="tnum">#{q.id}</span> ·{" "}
                      {fmtRelativeTime(q.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-sm font-semibold text-ink">
                      {fmtPct(q.rate)}
                    </span>
                    <span className="tnum block text-[11px] text-muted">
                      {fmtMoney(q.amount)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`${area.newQuotePath}/`}
          aria-label={`New ${singularAreaName} quote`}
          className={buttonClass("primary", "sm")}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          New quote
        </Link>
        <Link
          href={`${area.basePath}/`}
          aria-label={`View ${area.shortName} quotes`}
          className={buttonClass("ghost", "sm", "text-ink hover:bg-surface/70")}
        >
          View quotes
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export function ProductTabs({ area }: { area: DemoArea }) {
  return (
    <div className="demo-no-print">
      <ProductAreaShell area={area} canCreateQuote>
        {null}
      </ProductAreaShell>
    </div>
  );
}

export function OverviewPage() {
  const { rows, error, loaded } = useQuoteRows();
  if (!loaded) return <WorkspaceLoading />;
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const totalQuotes = rows.length;
  return (
    <div>
      <header className="mb-9 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-faint">
            <time>{today}</time> · Demo user
          </p>
          <h1 className="mt-2 font-serif text-[2.4rem] font-semibold leading-tight tracking-[-0.01em] text-ink">
            Lending pricing
          </h1>
          <p className="mt-2.5 max-w-[62ch] text-sm leading-relaxed text-muted">
            <span
              data-testid="hub-total-quote-count"
              className="tnum font-medium text-ink"
            >
              {totalQuotes}
            </span>{" "}
            saved {totalQuotes === 1 ? "quote" : "quotes"} across three product
            areas — each with its own pricing logic and workflow. Outputs
            everywhere are indicative pricing, not approvals.
          </p>
        </div>
        <Link
          href="/admin/feedback/"
          className={buttonClass(
            "secondary",
            "md",
            "shrink-0 self-start sm:self-auto",
          )}
        >
          Review feedback
          <MessageSquare size={15} strokeWidth={2} aria-hidden />
        </Link>
      </header>
      {error && (
        <p role="alert" className="mb-5 text-alert">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        {PRODUCT_AREA_LIST.map((area) => {
          const saved = rows.filter((row) => row.quote.area === area.key);
          return (
            <ProductAreaPanel
              key={area.key}
              area={area}
              count={saved.length}
              recent={saved.slice(0, 3).map(({ quote }) => ({
                id: quote.id,
                label: quote.customerName,
                amount: quote.summary.amount,
                rate: quote.summary.rate,
                createdAt: quote.createdAt,
              }))}
            />
          );
        })}
      </div>
      <section
        aria-labelledby="market-research-heading"
        className="mt-7 flex flex-col gap-4 border-y border-border bg-panel/60 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-brand-ink"
          >
            <Search size={18} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2
              id="market-research-heading"
              className="text-sm font-semibold text-ink"
            >
              Research lending products
            </h2>
            <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted">
              Search fictional lender product data, compare up to three
              products, and carry market evidence into a new quote. Market data
              remains separate from demonstration pricing policy.
            </p>
          </div>
        </div>
        <Link
          href="/market-search/"
          className={buttonClass("primary", "md", "shrink-0")}
        >
          Open Market Search
          <ArrowRight size={15} strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </div>
  );
}

export { QuotesPage, QuoteDetailPage } from "./QuotePages";
