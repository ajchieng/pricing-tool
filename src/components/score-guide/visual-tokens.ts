import type {
  CustomerScoreCategory,
  CustomerScoreResult,
} from "@/lib/pricing/types";

// Shared semantic colours for all three score guides. Status tokens stay
// global while each ProductAreaShell supplies its own brand curve colour.
export const SCORE_CATEGORY_COLORS: Record<
  CustomerScoreCategory,
  { color: string; soft: string }
> = {
  risk: { color: "var(--alert)", soft: "var(--alert-soft)" },
  loan: { color: "var(--info)", soft: "var(--info-soft)" },
  relationship: { color: "var(--ok)", soft: "var(--ok-soft)" },
  strategic: { color: "var(--warn)", soft: "var(--warn-soft)" },
};

export const SCORE_BAND_COLORS: Record<CustomerScoreResult["band"], string> = {
  weak: "var(--alert)",
  watch: "var(--warn)",
  standard: "var(--ink-muted)",
  strong: "var(--info)",
  excellent: "var(--ok)",
};

export const SCORE_CHART_TRACK = "var(--border)";
export const SCORE_CHART_GRID = "var(--border-strong)";

export function scoreSoftFill(color: string): string {
  return `color-mix(in oklch, ${color} 12%, transparent)`;
}
