"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Plus,
  Star,
  House,
  Wallet,
  BriefcaseBusiness,
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
  percent,
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

type QuoteRow = { quote: DemoQuote; core: DemoCore };
const icons = { home: House, personal: Wallet, commercial: BriefcaseBusiness };

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

export function ProductTabs({ area }: { area: DemoArea }) {
  const info = AREA_INFO[area];
  return (
    <div className="demo-no-print mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <Link
        href={`${info.path}/`}
        className="flex min-h-11 items-center gap-2 font-serif text-lg font-semibold"
      >
        {info.name}
      </Link>
      <nav
        aria-label={`${info.name} navigation`}
        className="flex flex-wrap gap-1"
      >
        <Link className="demo-button-secondary" href={`${info.path}/`}>
          Quotes
        </Link>
        <Link className="demo-button-secondary" href={`${info.path}/new/`}>
          New quote
        </Link>
        <Link className="demo-button-secondary" href={`${info.path}/guide/`}>
          Guide
        </Link>
      </nav>
    </div>
  );
}

export function OverviewPage() {
  const { rows, error, loaded } = useQuoteRows();
  if (!loaded) return <WorkspaceLoading />;
  return (
    <>
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Lending workspace
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Explore a scenario, follow the pricing, and save a decision record.
          Three distinct lending models share one quote workflow.
        </p>
      </header>
      {error && (
        <p role="alert" className="mb-5 text-alert">
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        {DEMO_AREAS.map((area) => {
          const info = AREA_INFO[area],
            Icon = icons[area],
            saved = rows.filter((row) => row.quote.area === area);
          return (
            <section
              key={area}
              data-product={area}
              className="flex min-w-0 flex-col rounded-2xl bg-brand-soft p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-brand-ink">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h2 className="mt-4 font-serif text-2xl font-semibold">
                    {info.name}
                  </h2>
                  <p className="mt-1 max-w-60 text-xs leading-relaxed text-muted">
                    {info.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="tnum font-serif text-3xl text-brand-strong">
                    {saved.length}
                  </span>
                  <p className="text-[11px] text-muted">saved quotes</p>
                </div>
              </div>
              <ul className="my-6 flex-1 divide-y divide-brand/15 border-y border-brand/15">
                {saved.slice(0, 3).map(({ quote }) => (
                  <li key={quote.id}>
                    <Link
                      className="flex min-h-[72px] items-center justify-between gap-4 py-3"
                      href={quoteHref(area, quote.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {quote.customerName}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          Version {quote.revision} ·{" "}
                          {money(quote.summary.amount)}
                        </span>
                      </span>
                      <span className="tnum shrink-0 font-serif text-lg text-brand-strong">
                        {percent(quote.summary.rate)}
                      </span>
                    </Link>
                  </li>
                ))}
                {!saved.length && (
                  <li className="py-6 text-sm text-muted">
                    No quotes yet. Start with a sample scenario.
                  </li>
                )}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="demo-button"
                  href={`${info.path}/new/`}
                  aria-label={`New ${info.singular.toLowerCase()} quote`}
                >
                  <Plus size={16} aria-hidden />
                  New quote
                </Link>
                <Link className="demo-button-secondary" href={`${info.path}/`}>
                  View quotes
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 border-y border-border py-6">
        <div className="flex items-start gap-4">
          <Search size={22} className="mt-1 text-brand" aria-hidden />
          <div>
            <h2 className="demo-section-heading">
              Compare the fictional market
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Research sample products, compare terms, and bring a rate into a
              quote as evidence.
            </p>
          </div>
        </div>
        <Link className="demo-button-secondary" href="/market-search/">
          Open Market Search
          <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Everything here is illustrative. Your edits belong to this browser and
        can be reset at any time.{" "}
        <Link className="underline underline-offset-4" href="/about/">
          How this project works
        </Link>
      </p>
    </>
  );
}

export function QuotesPage({ area }: { area: DemoArea }) {
  const { rows, error, loaded } = useQuoteRows(area);
  const [search, setSearch] = useState("");
  const [starred, setOnlyStarred] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const info = AREA_INFO[area];
  const filtered = rows.filter(
    (row) =>
      (!starred || row.core.starred) &&
      `${row.quote.customerName} ${row.quote.summary.productName} ${row.quote.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section data-product={area}>
      <ProductTabs area={area} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {info.name} quotes
          </h1>
          <p className="mt-2 text-sm text-muted">
            Saved decision records in your browser workspace.
          </p>
        </div>
        <Link className="demo-button" href={`${info.path}/new/`}>
          <Plus size={16} aria-hidden />
          New quote
        </Link>
      </header>
      <div className="demo-no-print mb-5 flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1">
          <span className="demo-label">Search saved quotes</span>
          <input
            className="demo-field max-w-lg"
            type="search"
            placeholder="Customer, product or quote number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={starred}
            onChange={(event) => setOnlyStarred(event.target.checked)}
          />
          Starred only
        </label>
      </div>
      {(error || actionError) && (
        <p role="alert" className="my-4 text-alert">
          {error || actionError}
        </p>
      )}
      {!loaded ? (
        <WorkspaceLoading />
      ) : !filtered.length ? (
        <div className="border-y border-border py-12">
          <h2 className="demo-section-heading">
            {search || starred
              ? "No matching quotes"
              : "Start your first quote"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {search || starred
              ? "Try a different search or turn off the starred filter."
              : "Use New quote to explore a sample or enter a fictional scenario."}
          </p>
        </div>
      ) : (
        <table className="demo-table">
          <thead>
            <tr>
              <th>Customer / business</th>
              <th>Loan amount</th>
              <th>Suggested / requested rate</th>
              <th>Review level</th>
              <th>Workflow</th>
              <th>
                <span className="sr-only">Star</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ quote, core }) => (
              <tr key={quote.id}>
                <td data-label="Customer">
                  <Link
                    className="block min-h-11 py-1"
                    href={quoteHref(area, quote.id)}
                  >
                    <span className="block font-semibold text-brand-strong">
                      {quote.customerName}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      #{quote.id} · Version {quote.revision} ·{" "}
                      {quote.summary.productName}
                    </span>
                  </Link>
                </td>
                <td data-label="Loan amount" className="tnum">
                  {money(quote.summary.amount)}
                </td>
                <td data-label="Rate" className="tnum font-semibold">
                  {percent(quote.summary.rate)}
                </td>
                <td data-label="Review level">
                  {human(quote.summary.approval)}
                </td>
                <td data-label="Workflow">
                  <span className="rounded-md bg-panel px-2 py-1 text-xs">
                    {human(core.status)}
                  </span>
                </td>
                <td data-label="Star">
                  <button
                    aria-label={`${core.starred ? "Unstar" : "Star"} ${quote.customerName}`}
                    aria-pressed={core.starred}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-brand"
                    onClick={() => {
                      setActionError(null);
                      void setStarred(core.id, !core.starred).catch(
                        (cause: unknown) =>
                          setActionError(
                            cause instanceof Error
                              ? cause.message
                              : "Could not update the star.",
                          ),
                      );
                    }}
                  >
                    <Star
                      size={18}
                      fill={core.starred ? "currentColor" : "none"}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function InputSnapshot({ input }: { input: Record<string, unknown> }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(input)
        .filter(
          ([, value]) => value !== null && value !== "" && value !== undefined,
        )
        .map(([key, value]) => (
          <div key={key} className="border-b border-border py-3">
            <dt className="text-xs text-muted">
              {human(key.replace(/([A-Z])/g, " $1"))}
            </dt>
            <dd className="mt-1 break-words text-sm">
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </dd>
          </div>
        ))}
    </dl>
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
        <Link className="demo-button mt-6" href={`${AREA_INFO[area].path}/`}>
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
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="font-serif text-3xl font-semibold">
              {quote.customerName}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Quote #{quote.id} · Version {quote.revision} · Saved{" "}
              {date(quote.createdAt)} by Demo user
            </p>
          </div>
          <div className="demo-no-print flex flex-wrap gap-2">
            {current ? (
              <Link
                className="demo-button"
                href={`${AREA_INFO[area].path}/revise/?id=${quote.id}`}
              >
                Revise quote
              </Link>
            ) : (
              <Link
                className="demo-button"
                href={quoteHref(area, core.currentQuoteId)}
              >
                Open current version
              </Link>
            )}
            <button
              className="demo-button-secondary"
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
              <Star size={17} fill={core.starred ? "currentColor" : "none"} />
            </button>
            <button
              className="demo-button-secondary"
              onClick={() => setHistoryOpen(!historyOpen)}
              aria-expanded={historyOpen}
            >
              <History size={17} />
              History ({revisions.length})
            </button>
            <details className="relative">
              <summary className="demo-button-secondary cursor-pointer list-none">
                More
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-border bg-surface p-2 shadow-md">
                <button
                  className="flex min-h-11 w-full items-center gap-2 px-2 text-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  Print / save PDF
                </button>
                <button
                  className="flex min-h-11 w-full items-center gap-2 px-2 text-sm"
                  onClick={() => saveJson(quote, core)}
                >
                  <Download size={15} />
                  Download JSON
                </button>
              </div>
            </details>
          </div>
        </div>
        {!current && (
          <p className="mt-4 rounded-lg bg-info-soft p-3 text-sm text-info">
            Historical pricing snapshot. Workflow actions are available on the
            current version.
          </p>
        )}
        <p className="demo-print-title hidden mt-3 text-sm">
          Pricing Tool — fictional portfolio example. Not an offer or credit
          decision.
        </p>
      </header>
      {historyOpen && (
        <section className="demo-no-print mb-7 rounded-2xl bg-panel/60 p-5">
          <h2 className="demo-section-heading">Revision history</h2>
          <ul className="mt-3">
            {revisions.map((revision) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
                key={revision.id}
              >
                <Link
                  className="font-semibold text-brand-strong underline underline-offset-4"
                  href={quoteHref(area, revision.id)}
                >
                  Version {revision.revision}
                  {revision.id === core.currentQuoteId ? " · Current" : ""}
                </Link>
                <span className="text-sm text-muted">
                  {date(revision.createdAt)}
                </span>
                <span className="tnum">
                  {percent(revision.summary.rate)} ·{" "}
                  {money(revision.summary.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav
        className="demo-no-print mb-6 flex flex-wrap gap-4 border-y border-border py-2 text-sm"
        aria-label="Quote sections"
      >
        {["Decision", "Workflow", "Comments", "Inputs"].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase()}`}
            className="flex min-h-11 items-center font-semibold text-brand-strong"
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="decision" className="scroll-mt-24">
        <h2 className="sr-only">Saved pricing decision</h2>
        <DemoSavedResult
          area={area}
          result={quote.result}
          input={quote.input}
        />
      </section>
      <div
        role="status"
        aria-live="polite"
        className="my-4 text-sm text-brand-strong"
      >
        {message}
      </div>
      {error && (
        <p
          role="alert"
          className="my-4 rounded-lg bg-alert-soft p-3 text-sm text-alert"
        >
          {error}
        </p>
      )}
      <section
        id="workflow"
        className="mt-8 scroll-mt-24 rounded-2xl bg-panel/60 p-5 sm:p-6"
      >
        <h2 className="demo-section-heading">
          {current ? "Quote workflow" : "Current series workflow"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {human(core.status)} · Current quote #{core.currentQuoteId}
        </p>
        <p className="mt-1 text-sm text-muted">
          Review requirement for saved version {quote.revision}:{" "}
          {human(quote.summary.approval)}
        </p>
        {core.review && (
          <p className="mt-3 text-sm">
            Review of quote #{core.review.quoteId}:{" "}
            <strong>{human(core.review.decision)}</strong> —{" "}
            {core.review.reason}
          </p>
        )}
        {current && (
          <div className="demo-no-print mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="demo-label">Workflow status</span>
              <select
                className="demo-field"
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
              <span className="demo-label">
                Assign to a fictional colleague
              </span>
              <select
                className="demo-field"
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
            <form
              className="md:col-span-2"
              onSubmit={(event) => {
                event.preventDefault();
                void action(
                  () => reviewQuote(core.id, decision, reason, quote.id),
                  "Review saved.",
                );
              }}
            >
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <label>
                  <span className="demo-label">Review decision</span>
                  <select
                    className="demo-field"
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
                  <span className="demo-label">Review reason (required)</span>
                  <input
                    className="demo-field"
                    required
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain this demonstration decision"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                Acceptance requires complete credit-loss and capital
                calculations. This is a local workflow simulation.
              </p>
              <button
                className="demo-button mt-4"
                disabled={pending || !reason.trim()}
              >
                Save review
              </button>
            </form>
          </div>
        )}
        <details className="mt-5">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
            Activity history ({core.history.length})
          </summary>
          <ol className="mt-2 divide-y divide-border">
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
        className="mt-8 scroll-mt-24 border-y border-border py-6"
      >
        <h2 className="demo-section-heading">Comments</h2>
        <p className="mt-1 text-xs text-muted">
          Shared across this quote’s revisions.
        </p>
        {!core.comments.length && (
          <p className="mt-3 text-sm text-muted">No comments yet.</p>
        )}
        <ol className="divide-y divide-border">
          {core.comments.map((item) => (
            <li className="py-4" key={item.id}>
              <p className="whitespace-pre-wrap text-sm">{item.text}</p>
              <p className="mt-2 text-xs text-muted">
                {item.actor} · {date(item.createdAt)}
              </p>
            </li>
          ))}
        </ol>
        {current && (
          <form
            className="demo-no-print mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                await addComment(core.id, comment);
                setComment("");
              }, "Comment saved.");
            }}
          >
            <label>
              <span className="demo-label">Add a demo comment</span>
              <textarea
                className="demo-field min-h-24"
                maxLength={2000}
                required
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            <button
              className="demo-button-secondary mt-3"
              disabled={pending || !comment.trim()}
            >
              Add comment
            </button>
          </form>
        )}
      </section>
      <section id="inputs" className="mt-8 scroll-mt-24">
        <h2 className="demo-section-heading">Saved inputs</h2>
        <p className="mt-2 mb-4 text-sm text-muted">
          These values and the pricing result are frozen at save time.
        </p>
        <InputSnapshot input={quote.input} />
      </section>
    </article>
  );
}
