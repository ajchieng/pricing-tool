import type { ReactNode, Ref } from "react";

// Shared quote-workspace frame for all three lending verticals. Pricing logic
// and fields stay vertical-specific; this component owns the responsive form /
// decision-rail structure, error placement, live region and sticky action area.
export function QuoteWorkspaceLayout({
  children,
  mobileSummary,
}: {
  children: ReactNode;
  mobileSummary?: ReactNode;
}) {
  return (
    <>
      <div
        className={`grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:pb-0 xl:grid-cols-[minmax(0,1fr)_420px] ${
          mobileSummary ? "pb-24" : ""
        }`}
      >
        {children}
      </div>
      {mobileSummary}
    </>
  );
}

export function QuoteWorkspaceForm({
  children,
  onDirty,
}: {
  children: ReactNode;
  onDirty?: () => void;
}) {
  return (
    <div
      data-quote-parameter-scope="input"
      className="@container min-w-0 border-b border-border"
      onInputCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("[data-quote-navigation]")
        ) {
          return;
        }
        onDirty?.();
      }}
      onChangeCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("[data-quote-navigation]")
        ) {
          return;
        }
        onDirty?.();
      }}
      onClickCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("[data-form-mutation]")
        ) {
          onDirty?.();
        }
      }}
    >
      {children}
    </div>
  );
}

export function QuoteWorkspaceRail({
  children,
  id = "pricing-result",
  railRef,
  actionRef,
  resultLabel = "Live pricing result",
  liveSummary,
  busy = false,
  resultError,
  resultIsStale = false,
  onRetry,
  actionError,
  actions,
  actionHint,
  actionHintId,
}: {
  children: ReactNode;
  id?: string;
  railRef?: Ref<HTMLDivElement>;
  actionRef?: Ref<HTMLDivElement>;
  resultLabel?: string;
  liveSummary?: string;
  busy?: boolean;
  resultError?: string | null;
  resultIsStale?: boolean;
  onRetry?: () => void;
  actionError?: string | null;
  actions: ReactNode;
  actionHint: ReactNode;
  actionHintId?: string;
}) {
  return (
    <div
      id={id}
      ref={railRef}
      className="scroll-mt-24 min-w-0 space-y-4 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:space-y-0 lg:border-l lg:border-border lg:pl-8"
    >
      {liveSummary ? (
        <p className="sr-only" role="status" aria-live="polite">
          {liveSummary}
        </p>
      ) : null}

      <div
        data-pricing-result-region
        data-quote-parameter-scope="result"
        role="region"
        tabIndex={0}
        aria-label={resultLabel}
        className="space-y-3 lg:-mr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-1 lg:pr-1"
      >
        {resultError ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"
          >
            <span>
              {resultError}
              {resultIsStale ? " Showing the last successful result." : ""}
            </span>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[44px] shrink-0 rounded-md px-2.5 text-xs font-semibold text-warn transition-colors hover:bg-warn/10 active:translate-y-px"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        <div aria-busy={busy ? "true" : "false"}>{children}</div>
      </div>

      <div
        ref={actionRef}
        className="space-y-2 lg:shrink-0 lg:border-t lg:border-border lg:pt-3"
      >
        {actionError ? (
          <div
            role="alert"
            className="rounded-lg bg-alert-soft px-3 py-2 text-sm text-alert"
          >
            {actionError}
          </div>
        ) : null}
        {actions}
        <p
          id={actionHintId}
          className="text-center text-xs leading-relaxed text-faint"
        >
          {actionHint}
        </p>
      </div>
    </div>
  );
}
