import Link from "next/link";
import { Paperclip } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  displayFeedbackSubmitter,
  feedbackHref,
  hasActiveFeedbackFilters,
  type FeedbackFilters,
  type FeedbackPage,
} from "@/lib/feedback-review";
import { fmtRelativeTime } from "@/lib/format";
import {
  FeedbackCategoryBadge,
  FeedbackSeverityBadge,
  FeedbackStatusBadge,
} from "./FeedbackBadges";

export function FeedbackList({
  page,
  filters,
  selectedId,
}: {
  page: FeedbackPage;
  filters: FeedbackFilters;
  selectedId: number | null;
}) {
  return (
    <section
      aria-labelledby="feedback-list-heading"
      className={`${selectedId !== null ? "hidden lg:block" : "block"} min-w-0`}
    >
      <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2
            id="feedback-list-heading"
            className="text-sm font-semibold text-ink"
          >
            Feedback queue
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            <span className="tnum">{page.filteredCount}</span>{" "}
            {page.filteredCount === 1 ? "item" : "items"}
          </p>
        </div>
        {page.pageCount > 1 ? (
          <span className="text-xs text-muted">
            Page <span className="tnum">{page.page}</span> of{" "}
            <span className="tnum">{page.pageCount}</span>
          </span>
        ) : null}
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={
            hasActiveFeedbackFilters(filters)
              ? "No feedback matches"
              : "No feedback yet"
          }
          body={
            hasActiveFeedbackFilters(filters)
              ? "Try broader filters or clear the current search."
              : "New staff feedback will appear here after it is submitted."
          }
        />
      ) : (
        <ol className="divide-y divide-border border-b border-border">
          {page.items.map((item) => {
            const active = item.id === selectedId;
            return (
              <li key={item.id}>
                <Link
                  href={feedbackHref(filters, { id: item.id })}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`block px-3 py-4 transition-colors ${
                    active
                      ? "bg-brand-tint"
                      : "hover:bg-panel/65 focus-visible:bg-panel/65"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {displayFeedbackSubmitter(item)}
                      </p>
                      <p className="mt-0.5 text-xs text-faint">
                        <span className="tnum">#{item.id}</span> ·{" "}
                        <time dateTime={item.createdAt.toISOString()}>
                          {fmtRelativeTime(item.createdAt)}
                        </time>
                      </p>
                    </div>
                    {item.attachmentCount > 0 ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted"
                        aria-label={`${item.attachmentCount} attachments`}
                      >
                        <Paperclip size={14} strokeWidth={1.8} aria-hidden />
                        <span className="tnum">{item.attachmentCount}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
                    {item.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <FeedbackStatusBadge status={item.status} />
                    <FeedbackSeverityBadge severity={item.severity} />
                    <FeedbackCategoryBadge category={item.category} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {page.pageCount > 1 ? (
        <nav
          aria-label="Feedback pagination"
          className="mt-4 flex items-center justify-between gap-3"
        >
          {page.page > 1 ? (
            <Link
              href={feedbackHref(filters, {
                overrides: { page: page.page - 1 },
              })}
              className={buttonClass("secondary", "sm")}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {page.page < page.pageCount ? (
            <Link
              href={feedbackHref(filters, {
                overrides: { page: page.page + 1 },
              })}
              className={buttonClass("secondary", "sm")}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
