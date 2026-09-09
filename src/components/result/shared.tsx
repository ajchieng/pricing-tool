import type React from "react";
import { ChevronDown } from "lucide-react";

// Label/value row used across result panels. Figures always tabular.

export function Line({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  hint?: string;
}) {
  return (
    <div
      data-quote-parameter-label={label}
      className="flex items-baseline justify-between gap-4 py-1 text-sm"
    >
      <span className="text-muted" title={hint}>
        {label}
      </span>
      <span data-quote-parameter-value className={`tnum ${tone ?? "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

// Flush segment of the result rail's instrument column: a micro-header and
// content, separated from its neighbours by the parent's hairline dividers —
// never its own box. Pass `bare` when an outer surface (e.g. a detail
// disclosure row) already provides the framing and title.

export function RailSegment({
  title,
  action,
  bare = false,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  bare?: boolean;
  children: React.ReactNode;
}) {
  if (bare) return <section>{children}</section>;
  return (
    <section className="py-4" data-quote-parameter-group={title}>
      {title && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Bordered container for a quote detail page region ("Pricing & customer
// detail", "Quote inputs"): a header band, then children separated by the
// container's hairline dividers. Shared by all three lending verticals so
// their detail pages read identically.

export function DetailSectionGroup({
  title,
  description,
  aside,
  action,
  children,
}: {
  title: string;
  description?: string;
  aside?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden border-y border-border"
      aria-label={title}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {(aside || action) && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {aside && <p className="text-xs text-faint">{aside}</p>}
              {action}
            </div>
          )}
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

// A flat, always-open section inside a DetailSectionGroup: title, optional
// description and the full working directly below — deliberately not a
// disclosure, so nothing on the decision surface hides behind a click.

export function DetailSection({
  title,
  description,
  action,
  className = "",
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`px-4 py-4 sm:px-5 ${className}`}
      data-quote-parameter-group={title}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Long engine narration stays available but tucked away, identically on all
// three verticals.

export function PricingExplanationDisclosure({ text }: { text: string }) {
  return (
    <div className="border-y border-border">
      <details className="group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-3 text-[13px] font-semibold text-ink transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
          Pricing explanation
          <ChevronDown
            size={15}
            strokeWidth={1.75}
            aria-hidden
            className="shrink-0 text-faint transition-transform duration-150 group-open:rotate-180"
          />
        </summary>
        <pre className="whitespace-pre-wrap pb-4 font-sans text-xs leading-relaxed text-muted">
          {text}
        </pre>
      </details>
    </div>
  );
}
