import type React from "react";
import { TONE, type Tone } from "@/lib/tones";

// Quiet status: a small dot + text label with no pill chrome. The second tier
// of the status vocabulary — Badge (soft pill) is reserved for load-bearing
// states (approval level, margin health, handoff), StatusText carries the
// secondary ones (section completion, optional/provided, config notices) so
// screens don't fill up with competing pills.

export function StatusText({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${TONE[tone].text} ${className}`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].bg}`}
      />
      {children}
    </span>
  );
}
