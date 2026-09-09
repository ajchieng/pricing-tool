import type { ApprovalReason } from "@/lib/pricing/types";
import { approvalStatus } from "@/lib/status";
import { TONE } from "@/lib/tones";

// Why approval is (or isn't) needed, in plain English, plus the next step.
// Sits directly under the hero — never below the fold. Flush segment: the
// hero's badge carries the pill weight, so this stays a quiet, tone-labelled
// explanation rather than a second tinted block.

export function ApprovalStatusCard({
  approvalLevel,
  reasons,
  nextAction,
  className = "",
}: {
  approvalLevel: string | null;
  reasons: ApprovalReason[];
  nextAction: string;
  className?: string;
}) {
  const approval = approvalStatus(approvalLevel);
  return (
    <section className={`py-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-ink">Approval</h4>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${TONE[approval.tone].text}`}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${TONE[approval.tone].bg}`}
          />
          {approval.label}
        </span>
      </div>
      {reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="select-none text-faint">
                •
              </span>
              <span>{r.message}</span>
            </li>
          ))}
        </ul>
      )}
      {nextAction && (
        <p className="mt-2 text-sm font-medium text-ink">
          Next step: {nextAction}
        </p>
      )}
    </section>
  );
}
