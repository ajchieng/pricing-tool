// Single source of truth for status presentation: approval levels, margin
// states, and warning severities. Every state carries a text label so meaning
// never depends on colour alone (WCAG, colour-blind safety). Classes are
// resolved through the tone map in src/lib/tones.ts.
//
// Wording is compliance-bound: approval labels describe a *pricing* approval
// requirement and must never imply the loan itself is approved.

import type { Tone } from "@/lib/tones";

export interface StatusStyle {
  label: string;
  tone: Tone;
}

const APPROVAL_STATUS: Record<string, StatusStyle> = {
  none: { label: "No Approval Required", tone: "ok" },
  manager: { label: "Approval Required — Manager", tone: "warn" },
  senior: { label: "Approval Required — Senior", tone: "high" },
  review: { label: "Pricing Review", tone: "info" },
  exception: { label: "Pricing Exception", tone: "alert" },
};

/** Short forms for dense surfaces (tables, chips) — same meaning, less width. */
export const APPROVAL_STATUS_SHORT: Record<string, string> = {
  none: "No Approval Required",
  manager: "Manager Approval",
  senior: "Senior Approval",
  review: "Pricing Review",
  exception: "Pricing Exception",
};

export const MARGIN_STATUS: Record<string, StatusStyle> = {
  healthy: { label: "Healthy", tone: "ok" },
  below_target: { label: "Below target", tone: "warn" },
  below_hard_minimum: { label: "Below hard minimum", tone: "alert" },
  unavailable: { label: "Unavailable", tone: "muted" },
};

export const SEVERITY_STATUS: Record<string, StatusStyle> = {
  info: { label: "Info", tone: "info" },
  warning: { label: "Warning", tone: "warn" },
  critical: { label: "Critical", tone: "alert" },
};

export function approvalStatus(level: string | null | undefined): StatusStyle {
  return APPROVAL_STATUS[level ?? "none"] ?? APPROVAL_STATUS.none;
}
