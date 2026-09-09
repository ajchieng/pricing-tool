import type { Tone } from "@/lib/tones";
import {
  COMMERCIAL_SECURITY_LABELS,
  FACILITY_TYPE_LABELS,
  FINANCIALS_QUALITY_LABELS,
  INDUSTRY_LABELS,
  PROFIT_TREND_LABELS,
  REVENUE_TREND_LABELS,
  RISK_GRADE_LABELS,
  TAX_STATUS_LABELS,
} from "./config";

// Display labels for commercial-loan enum values persisted as strings. Fall
// back to the raw value so old rows never crash the UI.

export function labelFacilityType(value: string | null | undefined): string {
  if (!value) return "—";
  return (FACILITY_TYPE_LABELS as Record<string, string>)[value] ?? value;
}

export const COMMERCIAL_LOAN_TYPE_LABELS = {
  standard: "Standard",
  non_standard: "Non-Standard",
} as const;

export function labelCommercialLoanType(
  value: string | null | undefined,
): string {
  if (!value) return "Not recorded";
  return (
    COMMERCIAL_LOAN_TYPE_LABELS[
      value as keyof typeof COMMERCIAL_LOAN_TYPE_LABELS
    ] ?? value
  );
}

export function labelIndustry(value: string | null | undefined): string {
  if (!value) return "—";
  return (INDUSTRY_LABELS as Record<string, string>)[value] ?? value;
}

export function labelRiskGrade(value: string | null | undefined): string {
  if (!value) return "—";
  return (RISK_GRADE_LABELS as Record<string, string>)[value] ?? value;
}

export function labelFinancialsQuality(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return (FINANCIALS_QUALITY_LABELS as Record<string, string>)[value] ?? value;
}

export function labelRevenueTrend(value: string | null | undefined): string {
  if (!value) return "—";
  return (REVENUE_TREND_LABELS as Record<string, string>)[value] ?? value;
}

export function labelProfitTrend(value: string | null | undefined): string {
  if (!value) return "—";
  return (PROFIT_TREND_LABELS as Record<string, string>)[value] ?? value;
}

export function labelTaxStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return (TAX_STATUS_LABELS as Record<string, string>)[value] ?? value;
}

export function riskGradeTone(value: string | null | undefined): Tone {
  switch (value) {
    case "grade_1":
    case "grade_2":
      return "ok";
    case "grade_3":
      return "info";
    case "grade_4":
      return "warn";
    case "grade_5":
      return "alert";
    default:
      return "muted";
  }
}

export function labelCommercialSecurity(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return (COMMERCIAL_SECURITY_LABELS as Record<string, string>)[value] ?? value;
}

const COMMERCIAL_REPAYMENT_LABELS: Record<string, string> = {
  principal_and_interest: "Principal & interest",
  interest_only: "Interest only",
  revolving: "Revolving",
};

export function labelCommercialRepayment(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return COMMERCIAL_REPAYMENT_LABELS[value] ?? value;
}

const COMMERCIAL_REQUEST_REASON_LABELS: Record<string, string> = {
  competitor_match: "Competitor match",
  customer_retention: "Customer retention",
  relationship_pricing: "Relationship pricing",
  relationship_value: "Relationship value",
  strategic_growth: "Strategic growth",
  manager_request: "Manager request",
  other: "Other",
};

export function labelCommercialRequestedReason(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return COMMERCIAL_REQUEST_REASON_LABELS[value] ?? value;
}

export function labelCommercialChannel(
  value: string | null | undefined,
): string {
  if (value === "broker") return "Broker";
  if (value === "online") return "Online";
  return "Direct";
}

const DSCR_BAND_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_assessed: { label: "Not assessed", tone: "muted" },
  strong: { label: "Strong cover", tone: "ok" },
  acceptable: { label: "Acceptable cover", tone: "info" },
  marginal: { label: "Marginal cover", tone: "warn" },
  insufficient: { label: "Insufficient cover", tone: "alert" },
};

export function dscrBandStatus(value: string | null | undefined): {
  label: string;
  tone: Tone;
} {
  return (
    DSCR_BAND_STATUS[value ?? "not_assessed"] ?? DSCR_BAND_STATUS.not_assessed
  );
}
