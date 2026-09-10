import Link from "next/link";
import { Search } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import {
  feedbackHref,
  hasActiveFeedbackFilters,
  type FeedbackFilters as Filters,
  type FeedbackSummary,
} from "@/lib/feedback-review";

const statusLinks = [
  { value: "all", label: "All", count: "total" },
  { value: "open", label: "Open", count: "open" },
  { value: "reviewed", label: "Reviewed", count: "reviewed" },
  { value: "closed", label: "Closed", count: "closed" },
] as const;

export function FeedbackFilters({
  filters,
  summary,
}: {
  filters: Filters;
  summary: FeedbackSummary;
}) {
  return (
    <section
      aria-label="Search and filter feedback"
      className="border-y border-border bg-panel/55 px-4 py-4"
    >
      <nav aria-label="Feedback status" className="mb-4 overflow-x-auto">
        <div className="flex w-max gap-1 rounded-lg bg-surface p-1">
          {statusLinks.map((item) => {
            const active = filters.status === item.value;
            return (
              <Link
                key={item.value}
                href={feedbackHref(filters, {
                  overrides: { status: item.value, page: 1 },
                })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-brand-ink"
                    : "text-muted hover:bg-panel hover:text-ink"
                }`}
              >
                {item.label}
                <span className="tnum text-xs">{summary[item.count]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <form method="get" action="/admin/feedback" className="space-y-3">
        {filters.status !== "all" ? (
          <input type="hidden" name="status" value={filters.status} />
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search feedback</span>
            <Search
              size={16}
              strokeWidth={1.8}
              aria-hidden
              className="pointer-events-none absolute left-3 top-3.5 text-faint"
            />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              maxLength={160}
              placeholder="Search message, context or submitter"
              className={`${inputClass} pl-9`}
            />
          </label>
          <button
            type="submit"
            className={buttonClass("secondary", "md", "shrink-0")}
          >
            Apply filters
          </button>
          {hasActiveFeedbackFilters(filters) ? (
            <Link
              href="/admin/feedback"
              className={buttonClass("ghost", "md", "shrink-0")}
            >
              Clear
            </Link>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-medium text-muted">
            Category
            <select
              name="category"
              defaultValue={filters.category}
              className={`${inputClass} mt-1`}
            >
              <option value="all">All categories</option>
              <option value="bug">Bug or error</option>
              <option value="pricing_logic">Pricing logic</option>
              <option value="usability">Usability</option>
              <option value="data">Data or rates</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Severity
            <select
              name="severity"
              defaultValue={filters.severity}
              className={`${inputClass} mt-1`}
            >
              <option value="all">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Submitted
            <select
              name="period"
              defaultValue={filters.period}
              className={`${inputClass} mt-1`}
            >
              <option value="all">Any time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Attachments
            <select
              name="attachments"
              defaultValue={filters.attachments}
              className={`${inputClass} mt-1`}
            >
              <option value="all">Any attachment</option>
              <option value="with">Has attachment</option>
              <option value="without">No attachment</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Sort
            <select
              name="sort"
              defaultValue={filters.sort}
              className={`${inputClass} mt-1`}
            >
              <option value="priority">Priority</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </form>
    </section>
  );
}
