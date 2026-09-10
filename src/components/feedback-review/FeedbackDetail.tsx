"use client";

/* eslint-disable @next/next/no-img-element -- browser Blob previews are local attachments */
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  displayFeedbackSubmitter,
  feedbackHref,
  safeFeedbackContextPath,
  type FeedbackDetail as Detail,
  type FeedbackFilters,
} from "@/lib/feedback-review";
import { fmtDateTime } from "@/lib/format";
import { CopyFeedbackLinkButton } from "./CopyFeedbackLinkButton";
import {
  FeedbackCategoryBadge,
  FeedbackSeverityBadge,
  FeedbackStatusBadge,
} from "./FeedbackBadges";
import { FeedbackTriageForm } from "./FeedbackTriageForm";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  return `${(kib / 1024).toFixed(1)} MB`;
}

function attachmentIcon(contentType: string) {
  const props = { size: 19, strokeWidth: 1.8, "aria-hidden": true } as const;
  if (contentType.startsWith("image/")) return <ImageIcon {...props} />;
  if (contentType === "application/pdf" || contentType === "text/plain") {
    return <FileText {...props} />;
  }
  if (contentType.includes("spreadsheetml") || contentType === "text/csv") {
    return <FileSpreadsheet {...props} />;
  }
  return <File {...props} />;
}

function attachmentTypeLabel(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType === "text/csv") return "CSV";
  if (contentType === "text/plain") return "Text";
  if (contentType.startsWith("image/")) {
    return contentType.split("/")[1]?.toUpperCase() ?? "Image";
  }
  if (contentType.includes("wordprocessingml")) return "Word";
  if (contentType.includes("spreadsheetml")) return "Excel";
  return "File";
}

function localAttachmentRef(blob: Blob | undefined) {
  return (node: HTMLAnchorElement | HTMLImageElement | null) => {
    if (!node || !blob) return;
    const url = URL.createObjectURL(blob);
    if ("href" in node) node.href = url;
    else node.src = url;
    return () => URL.revokeObjectURL(url);
  };
}

export function FeedbackDetail({
  feedback,
  filters,
  explicitSelection,
}: {
  feedback: Detail | null;
  filters: FeedbackFilters;
  explicitSelection: boolean;
}) {
  const visibility = explicitSelection ? "block" : "hidden lg:block";
  const inboxHref = feedbackHref(filters, {
    overrides: { page: filters.page },
  });

  if (!feedback) {
    return (
      <section
        aria-labelledby="feedback-detail-heading"
        className={`${visibility} min-w-0 border-y border-border bg-surface lg:rounded-xl lg:border`}
      >
        <div className="p-4 lg:hidden">
          <Link href={inboxHref} className={buttonClass("ghost", "sm")}>
            <ArrowLeft size={15} strokeWidth={1.8} aria-hidden />
            Back to inbox
          </Link>
        </div>
        <h2 id="feedback-detail-heading" className="sr-only">
          Feedback detail
        </h2>
        <EmptyState
          className="m-4 border-0"
          title={explicitSelection ? "Feedback not found" : "No feedback yet"}
          body={
            explicitSelection
              ? "This record may have been removed, or the link is no longer valid."
              : "Select a feedback item to review its context and attachments."
          }
          action={
            explicitSelection ? (
              <Link href={inboxHref} className={buttonClass("secondary", "md")}>
                Return to inbox
              </Link>
            ) : undefined
          }
        />
      </section>
    );
  }

  const contextPath = safeFeedbackContextPath(feedback.pageContext);

  return (
    <article
      aria-labelledby="feedback-detail-heading"
      className={`${visibility} min-w-0 border-y border-border bg-surface lg:rounded-xl lg:border`}
    >
      <header className="border-b border-border px-5 py-4 sm:px-6">
        <Link
          href={inboxHref}
          className={`${buttonClass("ghost", "sm", "mb-2 -ml-2 lg:hidden")}`}
        >
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden />
          Back to inbox
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              id="feedback-detail-heading"
              className="font-serif text-[1.55rem] font-semibold tracking-[-0.01em] text-ink"
            >
              Feedback <span className="tnum">#{feedback.id}</span>
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <FeedbackStatusBadge status={feedback.status} />
              <FeedbackSeverityBadge severity={feedback.severity} />
              <FeedbackCategoryBadge category={feedback.category} />
            </div>
          </div>
          <CopyFeedbackLinkButton />
        </div>
      </header>

      <div className="px-5 py-6 sm:px-6">
        <section aria-labelledby="feedback-message-heading">
          <h3
            id="feedback-message-heading"
            className="text-sm font-semibold text-muted"
          >
            Staff feedback
          </h3>
          <p className="mt-3 max-w-[72ch] whitespace-pre-wrap text-[1.05rem] leading-7 text-ink">
            {feedback.message}
          </p>
        </section>

        <section
          aria-labelledby="feedback-context-heading"
          className="mt-7 border-t border-border pt-6"
        >
          <h3
            id="feedback-context-heading"
            className="text-sm font-semibold text-ink"
          >
            Context
          </h3>
          <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-muted">Submitted by</dt>
              <dd className="mt-1 text-sm text-ink">
                {displayFeedbackSubmitter(feedback)}
              </dd>
              {feedback.submitter?.email ? (
                <dd className="mt-0.5 break-all text-sm text-muted">
                  {feedback.submitter.email}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted">Submitted</dt>
              <dd className="mt-1 text-sm text-ink">
                <time dateTime={feedback.createdAt.toISOString()}>
                  {fmtDateTime(feedback.createdAt)}
                </time>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted">
                Page or workflow context
              </dt>
              <dd className="mt-1 break-words text-sm text-ink">
                {feedback.pageContext || "No page context supplied"}
              </dd>
              {contextPath ? (
                <dd className="mt-2">
                  <Link
                    href={contextPath}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass("ghost", "sm", "-ml-2 text-brand")}
                  >
                    Open in pricing tool
                    <ExternalLink size={14} strokeWidth={1.8} aria-hidden />
                  </Link>
                </dd>
              ) : null}
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="feedback-attachments-heading"
          className="mt-7 border-t border-border pt-6"
        >
          <div className="flex items-center gap-2">
            <Paperclip
              size={17}
              strokeWidth={1.8}
              aria-hidden
              className="text-muted"
            />
            <h3
              id="feedback-attachments-heading"
              className="text-sm font-semibold text-ink"
            >
              Attachments
            </h3>
            <span className="tnum text-xs text-muted">
              {feedback.attachments.length}
            </span>
          </div>
          {feedback.attachments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No supporting files were attached.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border border-y border-border">
              {feedback.attachments.map((attachment) => {
                const blob = attachment.blob;
                const canPreview =
                  Boolean(blob) &&
                  attachment.downloadAllowed &&
                  attachment.contentType.startsWith("image/");
                return (
                  <div key={attachment.id} className="py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-panel text-muted">
                          {attachmentIcon(attachment.contentType)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {attachment.filename}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {attachmentTypeLabel(attachment.contentType)} ·{" "}
                            {formatFileSize(attachment.sizeBytes)}
                          </p>
                          {!attachment.downloadAllowed ? (
                            <p className="mt-1 max-w-[58ch] text-xs text-alert">
                              {attachment.blockedReason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {canPreview ? (
                          <a
                            ref={localAttachmentRef(blob)}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonClass("secondary", "sm")}
                          >
                            Preview
                            <ExternalLink
                              size={14}
                              strokeWidth={1.8}
                              aria-hidden
                            />
                          </a>
                        ) : null}
                        {attachment.downloadAllowed ? (
                          <a
                            ref={localAttachmentRef(blob)}
                            download={attachment.filename}
                            className={buttonClass("ghost", "sm")}
                          >
                            Download
                          </a>
                        ) : (
                          <span className="rounded-full border border-alert/30 bg-alert/5 px-2.5 py-1 text-xs font-semibold text-alert">
                            Blocked legacy attachment
                          </span>
                        )}
                      </div>
                    </div>
                    {canPreview ? (
                      <a
                        ref={localAttachmentRef(blob)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block overflow-hidden rounded-xl bg-panel p-2"
                      >
                        <img
                          ref={localAttachmentRef(blob)}
                          alt={`Preview of ${attachment.filename}`}
                          loading="lazy"
                          className="mx-auto max-h-[360px] w-auto max-w-full rounded-lg object-contain"
                        />
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          aria-labelledby="feedback-triage-heading"
          className="mt-7 border-t border-border pt-6"
        >
          <h3
            id="feedback-triage-heading"
            className="text-sm font-semibold text-ink"
          >
            Triage
          </h3>
          <p className="mt-1 text-sm text-muted">
            {feedback.reviewer && feedback.reviewedAt ? (
              <>
                Last saved by {feedback.reviewer.name} on{" "}
                <time dateTime={feedback.reviewedAt.toISOString()}>
                  {fmtDateTime(feedback.reviewedAt)}
                </time>
                .
              </>
            ) : (
              "No triage decision has been recorded."
            )}
          </p>
          <FeedbackTriageForm key={feedback.id} feedback={feedback} />
        </section>
      </div>
    </article>
  );
}
