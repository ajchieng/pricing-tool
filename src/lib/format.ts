export function fmtPct(value: number | null | undefined, dp = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(dp)}%`;
}

export function fmtSignedPct(value: number | null | undefined, dp = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(dp)}%`;
}

export function fmtMoney(value: number | null | undefined, dp = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(value);
}

export function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

export const LOAN_PURPOSE_LABELS: Record<string, string> = {
  owner_occupied: "Owner Occupied",
  investment: "Investment",
};

export const RATE_TYPE_LABELS: Record<string, string> = {
  variable: "Variable",
  fixed: "Fixed",
};

// Compact "time ago" for dashboard rows; pair with a full fmtDateTime in the
// title attribute. Falls back to a plain date beyond a week.
export function fmtRelativeTime(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const d = new Date(value);
  const diffMinutes = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- Customer risk + relationship context labels/options ---

export const EMPLOYMENT_OPTIONS = [
  { value: "not_assessed", label: "Not assessed" },
  { value: "stable_payg", label: "Stable PAYG" },
  { value: "self_employed", label: "Self-employed" },
  { value: "contractor_casual", label: "Contractor / casual" },
  { value: "government_benefits", label: "Government Benefits" },
  { value: "review_required", label: "Review required" },
];
const SERVICEABILITY_OPTIONS = [
  { value: "not_assessed", label: "Not assessed" },
  { value: "appears_acceptable", label: "Appears acceptable" },
  { value: "borderline", label: "Borderline" },
  { value: "review_required", label: "Review required" },
];
export const YES_NO_UNKNOWN_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function labelFrom(
  options: Array<{ value: string; label: string }>,
  value: string | null | undefined,
): string {
  if (value == null) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export const labelEmployment = (v?: string | null) =>
  labelFrom(EMPLOYMENT_OPTIONS, v);
export const labelServiceability = (v?: string | null) =>
  labelFrom(SERVICEABILITY_OPTIONS, v);
export const labelYesNoUnknown = (v?: string | null) =>
  labelFrom(YES_NO_UNKNOWN_OPTIONS, v);

export const REQUESTED_REASONS: Array<{ value: string; label: string }> = [
  { value: "competitor_match", label: "Competitor match" },
  { value: "customer_retention", label: "Customer retention" },
  { value: "large_loan", label: "Large loan" },
  { value: "strong_member_relationship", label: "Strong member relationship" },
  { value: "strategic_growth", label: "Strategic growth" },
  { value: "manager_request", label: "Manager request" },
  { value: "other", label: "Other" },
];
