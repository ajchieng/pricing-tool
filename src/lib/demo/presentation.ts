import type { DemoArea, DemoQuoteDraft } from "./types";

export const AREA_INFO = {
  home: {
    name: "Home loans",
    singular: "Home loan",
    path: "/home-loans",
    description: "Owner occupied and investment mortgage pricing",
  },
  personal: {
    name: "Personal loans",
    singular: "Personal loan",
    path: "/personal-loans",
    description: "Secured and unsecured consumer lending",
  },
  commercial: {
    name: "Commercial loans",
    singular: "Commercial loan",
    path: "/commercial-loans",
    description: "Business facilities, cash flow and security",
  },
} as const;

export function isDemoArea(value: string | null): value is DemoArea {
  return value === "home" || value === "personal" || value === "commercial";
}
export const money = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "Unavailable"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      }).format(value);
export const percent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "Unavailable"
    : `${value.toFixed(2)}%`;
export const human = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export function date(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function quoteHref(area: DemoArea, id: number) {
  return `${AREA_INFO[area].path}/quote/?id=${id}`;
}

export function draftFromCalculation(
  area: DemoArea,
  input: Record<string, unknown>,
  result: unknown,
): DemoQuoteDraft {
  const r = result as Record<string, unknown>;
  const finite = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    area,
    customerName: String(
      input.customerReference ||
        input.customerName ||
        input.businessName ||
        "Sample customer",
    ),
    input: structuredClone(input),
    result: structuredClone(result),
    summary: {
      productName: String(r.productName || AREA_INFO[area].singular),
      amount: finite(input.loanAmount) ?? finite(input.facilityAmount) ?? 0,
      rate: finite(r.finalDisplayRate) ?? finite(r.suggestedRate),
      repayment: finite(r.monthlyRepayment),
      approval: String(r.approvalLevel ?? "standard"),
    },
  };
}
