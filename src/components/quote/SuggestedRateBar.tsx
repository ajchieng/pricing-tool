"use client";

import { useId } from "react";
import { ApprovalBadge } from "@/components/ApprovalBadge";

// Mobile-only sticky summary: keeps the Suggested Rate and approval state in
// view while the user is deep in the form or result. Hidden on lg+ (the rail
// is sticky there) and once the full-size save action is visible.

export function SuggestedRateBar({
  visible,
  suggestedRate,
  approvalLevel,
  onViewResult,
  onSave,
  saveLabel = "Save quote",
  saving = false,
  saveDisabled = false,
  saveDisabledReason,
  label = "Suggested rate",
}: {
  visible: boolean;
  suggestedRate: number | null;
  approvalLevel: string | null;
  onViewResult: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  saveDisabledReason?: string | null;
  label?: string;
}) {
  const reasonId = useId();
  if (!visible) return null;
  return (
    <div className="rail-chrome fixed inset-x-0 bottom-0 z-30 bg-brand-deep px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-rail-ink shadow-[var(--shadow-lg)] lg:hidden">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] leading-tight text-brand-deep-muted">
            {label}
          </div>
          <div className="tnum font-serif text-lg font-semibold leading-tight text-brand-glow">
            {suggestedRate != null ? `${suggestedRate.toFixed(2)}%` : "—"}
          </div>
          {saveDisabledReason ? (
            <p
              id={reasonId}
              className="max-w-40 truncate text-[10px] leading-tight text-brand-deep-muted"
            >
              {saveDisabledReason}
            </p>
          ) : null}
        </div>
        <div className="hidden min-w-0 sm:block">
          <ApprovalBadge level={approvalLevel} size="sm" short />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onViewResult}
            className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg bg-rail-raised px-2.5 py-2 text-sm font-medium text-rail-ink transition-colors hover:bg-rail-active"
          >
            Result
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saveDisabled}
            aria-describedby={saveDisabledReason ? reasonId : undefined}
            className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg bg-brand-glow px-2.5 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-glow/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
