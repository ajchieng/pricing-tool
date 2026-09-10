import { FeedbackDetail } from "./FeedbackDetail";
import { FeedbackFilters } from "./FeedbackFilters";
import { FeedbackList } from "./FeedbackList";
import type {
  FeedbackDetail as Detail,
  FeedbackFilters as Filters,
  FeedbackPage,
  FeedbackSummary,
} from "@/lib/feedback-review";

export function FeedbackWorkspace({
  filters,
  page,
  summary,
  detail,
  selectedId,
}: {
  filters: Filters;
  page: FeedbackPage;
  summary: FeedbackSummary;
  detail: Detail | null;
  selectedId: number | null;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-[1.75rem] font-semibold tracking-[-0.01em] text-ink">
            Feedback inbox
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Find local demo reports, inspect their context and supporting files,
            then record a clear triage outcome in this browser.
          </p>
        </div>
        <dl className="grid grid-cols-3 border-y border-border sm:min-w-[390px]">
          <div className="py-2 pr-4">
            <dt className="text-xs font-medium text-muted">Open</dt>
            <dd className="tnum mt-0.5 text-xl font-semibold text-ink">
              {summary.open}
            </dd>
          </div>
          <div className="border-l border-border px-4 py-2">
            <dt className="text-xs font-medium text-muted">High priority</dt>
            <dd className="tnum mt-0.5 text-xl font-semibold text-high">
              {summary.highOpen}
            </dd>
          </div>
          <div className="border-l border-border py-2 pl-4">
            <dt className="text-xs font-medium text-muted">Last 30 days</dt>
            <dd className="tnum mt-0.5 text-xl font-semibold text-ink">
              {summary.recent}
            </dd>
          </div>
        </dl>
      </header>

      <FeedbackFilters filters={filters} summary={summary} />

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
        <FeedbackList page={page} filters={filters} selectedId={selectedId} />
        <FeedbackDetail
          key={detail?.id ?? "empty"}
          feedback={detail}
          filters={filters}
          explicitSelection={selectedId !== null}
        />
      </div>
    </div>
  );
}
