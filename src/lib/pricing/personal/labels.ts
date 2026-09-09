import type { Tone } from "@/lib/tones";
import type { RetentionPricingOutcome } from "@/lib/pricing/retention-pricing";
import { PERSONAL_PURPOSE_LABELS, PERSONAL_SECURITY_LABELS } from "./config";

// Legacy risk-tier labels — tiers no longer drive pricing (the customer score
// does) but quotes saved under the old build-up still carry them.
const LEGACY_RISK_TIER_LABELS: Record<string, string> = {
  tier_a: "Tier A — Excellent",
  tier_b: "Tier B — Strong",
  tier_c: "Tier C — Standard",
  tier_d: "Tier D — Marginal",
  tier_e: "Tier E — Weak",
  not_scored: "Not scored",
};

// Display labels for personal-loan enum values persisted as strings. Fall back
// to the raw value so old rows never crash the UI.

export function labelPersonalPurpose(value: string | null | undefined): string {
  if (!value) return "—";
  return (PERSONAL_PURPOSE_LABELS as Record<string, string>)[value] ?? value;
}

export function labelPersonalSecurity(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return (PERSONAL_SECURITY_LABELS as Record<string, string>)[value] ?? value;
}

export function labelPersonalRiskTier(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return LEGACY_RISK_TIER_LABELS[value] ?? value;
}

export function labelPersonalCustomerStream(
  value: string | null | undefined,
): string {
  if (value === "existing_member") return "Existing Member";
  if (value === "retention") return "Retention";
  return "New to Bank";
}

export function labelPersonalChannel(value: string | null | undefined): string {
  if (value === "broker") return "Broker Stream";
  if (value === "online") return "Online";
  return "Direct";
}

const PERSONAL_REQUEST_REASON_LABELS: Record<string, string> = {
  competitor_match: "Competitor match",
  customer_retention: "Customer retention",
  large_loan: "Large loan",
  strong_member_relationship: "Strong member relationship",
  manager_request: "Manager request",
  other: "Other",
};

export function labelPersonalRequestedReason(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return PERSONAL_REQUEST_REASON_LABELS[value] ?? value;
}

export function labelPersonalBrokerRegion(
  value: string | null | undefined,
): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "—";
}

export function labelPersonalBrokerVolume(
  value: string | null | undefined,
): string {
  if (value === "1_3") return "1–3";
  if (value === "4_6") return "4–6";
  if (value === "7_9") return "7–9";
  if (value === "10_plus") return "10+";
  return "—";
}

export function labelPersonalRetentionOutcome(
  value: RetentionPricingOutcome | null | undefined,
): string {
  if (value === "standard") return "Sharper of current and ordinary pricing";
  if (value === "partial_additional_discount")
    return "Half of the available additional discount";
  if (value === "no_further_discount")
    return "No further discount can be provided";
  return "—";
}

export function riskTierTone(value: string | null | undefined): Tone {
  switch (value) {
    case "tier_a":
      return "ok";
    case "tier_b":
      return "ok";
    case "tier_c":
      return "info";
    case "tier_d":
      return "warn";
    case "tier_e":
      return "alert";
    default:
      return "muted";
  }
}

const AFFORDABILITY_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_assessed: { label: "Not assessed", tone: "muted" },
  comfortable: { label: "Comfortable", tone: "ok" },
  adequate: { label: "Adequate", tone: "info" },
  tight: { label: "Tight", tone: "warn" },
  insufficient: { label: "Insufficient", tone: "alert" },
};

export function affordabilityStatus(value: string | null | undefined): {
  label: string;
  tone: Tone;
} {
  return (
    AFFORDABILITY_STATUS[value ?? "not_assessed"] ??
    AFFORDABILITY_STATUS.not_assessed
  );
}
