"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

// Ruled form section: a full-bleed band opened by a hairline rule — no tinted
// box, no border box. Structure comes from the rule, the hanging label column
// and space. Multi-open by design — never force one-at-a-time. Collapsed
// sections keep their inputs mounted (hidden) so values and focus behaviour
// are preserved.
//
// Layouts:
// - "stacked"  — header row spans the band, body below (admin add-sections,
//                narrow contexts).
// - "hanging"  — printed-form style: the label hangs in a left margin column
//                beside the fields. Requires an ancestor with `@container`;
//                the hang only engages when the container is ≥42rem (@2xl),
//                so narrow columns fall back to the stacked flow.
//
// Section bodies are containers themselves, so field grids inside use
// container variants (`@md:grid-cols-2`) and adapt to the column they're in,
// not the viewport.

export function CollapsibleSection({
  id,
  title,
  chip,
  layout = "stacked",
  open,
  onToggle,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  /** Quiet status shown with the label (e.g. <StatusText>). */
  chip?: React.ReactNode;
  layout?: "stacked" | "hanging";
  /** Controlled open state; omit to let the section manage itself. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const sectionId = id ?? `collapsible-${generatedId}`;
  const titleId = `${sectionId}-title`;
  const contentId = `${sectionId}-content`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  function toggle() {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onToggle?.(next);
  }

  const chevron = (
    <ChevronDown
      size={15}
      strokeWidth={1.75}
      aria-hidden
      className={`shrink-0 text-faint transition-transform duration-150 group-hover:text-muted ${
        isOpen ? "rotate-180" : ""
      }`}
    />
  );

  if (layout === "hanging") {
    return (
      <section
        id={sectionId}
        aria-labelledby={titleId}
        data-quote-parameter-group={title}
        className="scroll-mt-28 border-t border-border"
      >
        <div className="@2xl:grid @2xl:grid-cols-[11rem_minmax(0,1fr)] @2xl:gap-x-8">
          <h2>
            <button
              id={`${sectionId}-toggle`}
              type="button"
              onClick={toggle}
              aria-labelledby={titleId}
              aria-expanded={isOpen}
              aria-controls={contentId}
              className="group flex min-h-[44px] w-full items-center justify-between gap-3 py-3.5 text-left @2xl:min-h-0 @2xl:flex-col @2xl:items-stretch @2xl:justify-start @2xl:gap-1.5 @2xl:py-5"
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span
                  id={titleId}
                  className="block truncate text-sm font-semibold text-ink"
                >
                  {title}
                </span>
                <span className="hidden @2xl:block">{chevron}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                {chip}
                <span className="@2xl:hidden">{chevron}</span>
              </span>
            </button>
          </h2>
          <div
            id={contentId}
            hidden={!isOpen}
            className="@container pb-6 @2xl:pb-7 @2xl:pt-5"
          >
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      data-quote-parameter-group={title}
      className="scroll-mt-28 border-t border-border"
    >
      <h2>
        <button
          id={`${sectionId}-toggle`}
          type="button"
          onClick={toggle}
          aria-labelledby={titleId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="group flex min-h-[48px] w-full items-center gap-3 py-3 text-left"
        >
          <span
            id={titleId}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-ink"
          >
            {title}
          </span>
          {chip}
          {chevron}
        </button>
      </h2>
      <div id={contentId} hidden={!isOpen} className="@container pb-6">
        {children}
      </div>
    </section>
  );
}
