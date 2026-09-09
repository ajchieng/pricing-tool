import type React from "react";
import { ChevronDown } from "lucide-react";

// Shared "Quote inputs" primitives for the three vertical quote detail pages.
// Each group is a disclosure that echoes the raw source values behind the
// pricing result; derived figures belong in the result panel, not here.

export function DetailGroup({
  title,
  description,
  icon,
  summary,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  summary?: string[];
  children: React.ReactNode;
}) {
  return (
    <details className="group" data-quote-parameter-group={title}>
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 transition-colors hover:bg-panel/40 sm:px-5 lg:grid-cols-[minmax(13rem,0.32fr)_minmax(0,1fr)_auto] lg:items-center [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 shrink-0 text-faint">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
          </div>
        </div>
        {summary && summary.length > 0 && (
          <p
            className="tnum min-w-0 truncate text-xs text-faint lg:text-right"
            title={summary.join(" · ")}
          >
            {summary.join(" · ")}
          </p>
        )}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 justify-self-end text-faint transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <dl className="grid min-w-0 gap-x-6 gap-y-0 border-t border-border px-4 pb-4 pt-1 text-sm sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
        {children}
      </dl>
    </details>
  );
}

export function Item({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      data-quote-parameter-label={label}
      className="density-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/70 py-2 last:border-b-0"
    >
      <dt className="text-muted">{label}</dt>
      <dd
        data-quote-parameter-value
        className="tnum min-w-0 text-right text-[calc(0.875rem*var(--numeric-scale,1))] font-medium text-ink"
      >
        {value}
      </dd>
    </div>
  );
}

export function Note({ label, value }: { label: string; value: string }) {
  return (
    <div
      data-quote-parameter-label={label}
      className="min-w-0 border-b border-border/70 py-2 text-sm text-muted sm:col-span-2 xl:col-span-3"
    >
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="font-medium text-ink">{label}: </span>
        <span data-quote-parameter-value className="whitespace-pre-wrap">
          {value}
        </span>
      </dd>
    </div>
  );
}
