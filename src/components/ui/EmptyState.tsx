import type React from "react";

// Empty states teach the interface: what this area is for and the one action
// that fills it. Callers distinguish "nothing yet" from "nothing matches".

export function EmptyState({
  title,
  body,
  action,
  className = "",
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center ${className}`}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-prose text-sm text-muted">{body}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
