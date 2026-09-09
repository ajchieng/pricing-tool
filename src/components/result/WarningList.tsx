import type { WarningItem } from "@/lib/pricing/types";
import { SEVERITY_STATUS } from "@/lib/status";
import { TONE } from "@/lib/tones";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// Severity-labelled warning blocks, most severe first. Text label carries the
// meaning; the tint reinforces it.

export function WarningList({
  warnings,
  dense = false,
}: {
  warnings: WarningItem[];
  dense?: boolean;
}) {
  if (warnings.length === 0) return null;
  const sorted = [...warnings].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );
  return (
    <section className={dense ? "space-y-1.5" : "space-y-2"}>
      {sorted.map((w, i) => {
        const s = SEVERITY_STATUS[w.severity] ?? SEVERITY_STATUS.info;
        return (
          <div
            key={i}
            className={`flex gap-2.5 rounded-lg ${
              dense ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
            } ${TONE[s.tone].soft}`}
          >
            <span
              className={`shrink-0 font-semibold ${
                dense ? "" : "text-xs leading-6"
              }`}
            >
              {s.label}
            </span>
            <span className="text-ink/90">{w.message}</span>
          </div>
        );
      })}
    </section>
  );
}
