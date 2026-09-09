import type { MarginResult } from "@/lib/pricing/types";

type VisualTone = "ok" | "warn" | "alert" | "info" | "muted";

export interface CustomerScoreVisual {
  label: string;
  range: string;
  helper: string;
  position: number;
  tone: VisualTone;
}

export interface MarginVisual {
  label: string;
  helper: string;
  tone: VisualTone;
}

export function percentPosition(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function customerScoreVisual(
  score: number | null | undefined,
): CustomerScoreVisual {
  if (score == null || Number.isNaN(score)) {
    return {
      label: "Not scored",
      range: "No score",
      helper: "Quote is missing the customer score breakdown.",
      position: 50,
      tone: "muted",
    };
  }

  const position = percentPosition(score);
  if (score >= 80) {
    return {
      label: "Excellent",
      range: "80-100",
      helper: "Strong automatic pricing support.",
      position,
      tone: "ok",
    };
  }
  if (score >= 72) {
    return {
      label: "Strong",
      range: "72-79",
      helper: "Good pricing support, subject to margin and approvals.",
      position,
      tone: "ok",
    };
  }
  if (score >= 52) {
    return {
      label: "Standard",
      range: "52-71",
      helper: "Neutral-to-moderate support for discounting.",
      position,
      tone: "info",
    };
  }
  if (score >= 45) {
    return {
      label: "Watch",
      range: "45-51",
      helper: "Limited support; check the risk and margin drivers.",
      position,
      tone: "warn",
    };
  }
  return {
    label: "Weak",
    range: "0-44",
    helper: "Little automatic support; expect review pressure.",
    position,
    tone: "alert",
  };
}

export function marginVisual(
  margin: Pick<
    MarginResult,
    "estimatedMargin" | "targetMargin" | "hardMinimumMargin" | "status"
  >,
): MarginVisual {
  if (margin.status === "healthy") {
    return {
      label: "Healthy",
      helper: "At or above target margin",
      tone: "ok",
    };
  }
  if (margin.status === "below_target") {
    return {
      label: "Below target",
      helper: "Manager attention may be needed",
      tone: "warn",
    };
  }
  if (margin.status === "below_hard_minimum") {
    return {
      label: "Below hard minimum",
      helper: "Exception territory",
      tone: "alert",
    };
  }
  return {
    label: "Unavailable",
    helper: "Cost of funds or margin thresholds are missing",
    tone: "muted",
  };
}
