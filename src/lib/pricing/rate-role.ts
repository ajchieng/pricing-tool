export const PUBLISHED_RATE_ROLES = [
  "carded_pricing_anchor",
  "minimum_customer_rate",
  "representative_starting_rate",
] as const;

export type PublishedRateRole = (typeof PUBLISHED_RATE_ROLES)[number];

export const PUBLISHED_RATE_ROLE_LABELS: Record<PublishedRateRole, string> = {
  carded_pricing_anchor: "Carded pricing anchor",
  minimum_customer_rate: "Minimum customer rate",
  representative_starting_rate: "Representative / starting rate",
};

export function publishedRateRole(
  value: string | null | undefined,
): PublishedRateRole {
  return PUBLISHED_RATE_ROLES.includes(value as PublishedRateRole)
    ? (value as PublishedRateRole)
    : "carded_pricing_anchor";
}

export function isMinimumCustomerRate(
  value: string | null | undefined,
): boolean {
  return publishedRateRole(value) === "minimum_customer_rate";
}
