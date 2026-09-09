import type React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shared page header: title, one-line caption (compliance wording lives here on
// quote pages), optional back link and right-aligned actions.

export function PageHeader({
  title,
  caption,
  actions,
  backHref,
  backLabel = "Back",
  compactMobile = false,
  className = "",
}: {
  title: React.ReactNode;
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  compactMobile?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${compactMobile ? "mb-5 gap-y-2 sm:mb-8 sm:gap-y-3" : "mb-8 gap-y-3"} flex flex-wrap items-end justify-between gap-x-4 ${className}`}
    >
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 -ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-muted transition-colors hover:bg-panel hover:text-brand"
          >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
            {backLabel}
          </Link>
        )}
        <h1
          className={`font-serif font-semibold leading-tight tracking-[-0.01em] text-ink ${compactMobile ? "text-[1.65rem] sm:text-[1.8rem]" : "text-[1.8rem]"}`}
        >
          {title}
        </h1>
        {caption && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            {caption}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
