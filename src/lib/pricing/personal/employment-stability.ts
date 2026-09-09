import type { EmploymentStability } from "@/lib/pricing/types";
import type { PersonalEmploymentStability } from "./types";

export function personalEmploymentPricingValue(
  value: PersonalEmploymentStability | null | undefined,
): EmploymentStability | null {
  if (value == null) return null;
  return value === "government_benefits" ? "review_required" : value;
}

export function personalEmploymentRequiresReview(
  value: PersonalEmploymentStability | null | undefined,
): boolean {
  return personalEmploymentPricingValue(value) === "review_required";
}
