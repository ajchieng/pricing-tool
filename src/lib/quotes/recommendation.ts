import type { ApprovalLevel, WarningItem } from "@/lib/pricing/types";

const REVIEW_LABEL: Record<Exclude<ApprovalLevel, "none">, string> = {
  manager: "manager pricing review",
  senior: "senior pricing review",
  review: "credit and pricing review",
  exception: "pricing exception review",
};

export function quoteRecommendation(input: {
  approvalRequired: boolean;
  approvalLevel: ApprovalLevel;
  warnings: WarningItem[];
}): string {
  if (input.warnings.some((warning) => warning.severity === "critical")) {
    return "Resolve the critical pricing inputs before handing this quote off for review.";
  }
  if (input.approvalRequired && input.approvalLevel !== "none") {
    return `Route this quote for ${REVIEW_LABEL[input.approvalLevel]} before discussing a customer rate.`;
  }
  if (input.warnings.some((warning) => warning.severity === "warning")) {
    return "Review the flagged information and confirm the inputs before discussing the indicative result.";
  }
  return "No pricing review is indicated by this result. Confirm the inputs before discussing the indicative rate.";
}
