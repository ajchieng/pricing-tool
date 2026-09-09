import type { DemoArea } from "@/lib/demo/types";

export type MarketSearchVertical = DemoArea;

export const MARKET_VERTICALS = {
  home: {
    label: "Home Loans",
    shortLabel: "Home",
    path: "/market-search/",
    quotePath: "/home-loans/new/",
    categories: ["RESIDENTIAL_MORTGAGES"],
    description:
      "Find fictional home-loan products, compare example rates, and inspect product criteria and eligibility evidence.",
    searchPlaceholder: "e.g. variable loan with an offset account",
    defaultAmount: 500_000,
    defaultTermYears: 30,
  },
  personal: {
    label: "Personal Loans",
    shortLabel: "Personal",
    path: "/market-search/",
    quotePath: "/personal-loans/new/",
    categories: ["PERS_LOANS"],
    description:
      "Compare fictional personal-loan rates, limits, fees, features, and eligibility evidence.",
    searchPlaceholder: "e.g. personal loan with redraw and extra repayments",
    defaultAmount: 25_000,
    defaultTermYears: 5,
  },
  commercial: {
    label: "Commercial Loans",
    shortLabel: "Commercial",
    path: "/market-search/",
    quotePath: "/commercial-loans/new/",
    categories: ["BUSINESS_LOANS", "OVERDRAFTS"],
    description:
      "Research fictional business loans and overdrafts using example rates, limits, fees, and product evidence.",
    searchPlaceholder: "e.g. business overdraft with relationship management",
    defaultAmount: 400_000,
    defaultTermYears: 10,
  },
} as const satisfies Record<
  MarketSearchVertical,
  {
    label: string;
    shortLabel: string;
    path: string;
    quotePath: string;
    categories: readonly string[];
    description: string;
    searchPlaceholder: string;
    defaultAmount: number;
    defaultTermYears: number;
  }
>;

export function marketSearchHref(
  vertical: MarketSearchVertical,
  params?: URLSearchParams,
  anchor = "",
): string {
  const queryParams = new URLSearchParams(params);
  if (vertical !== "home") queryParams.set("area", vertical);
  const query = queryParams.toString();
  return `${MARKET_VERTICALS[vertical].path}${query ? `?${query}` : ""}${anchor}`;
}
