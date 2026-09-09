import {
  MARKET_VERTICALS,
  type MarketSearchVertical,
} from "@/lib/market/verticals";

const PURPOSE_VALUES = ["owner_occupied", "investment"] as const;
const RATE_TYPE_VALUES = ["variable", "fixed"] as const;
const REPAYMENT_VALUES = ["principal_and_interest", "interest_only"] as const;
const SORT_VALUES = ["relevance", "rate", "comparison", "name"] as const;
const FACILITY_CATEGORY_VALUES = ["business_loan", "overdraft"] as const;
export const MAX_COMPARE_PRODUCTS = 3;

export type LoanPurposeFilter = (typeof PURPOSE_VALUES)[number];
export type RateTypeFilter = (typeof RATE_TYPE_VALUES)[number];
export type RepaymentFilter = (typeof REPAYMENT_VALUES)[number];
export type FacilityCategoryFilter = (typeof FACILITY_CATEGORY_VALUES)[number];
export type SearchSort = (typeof SORT_VALUES)[number];

interface CommonSearchFilters {
  q: string;
  rateType: RateTypeFilter | null;
  noOngoingFee: boolean;
  sort: SearchSort;
  page: number;
  productId: string | null;
  compareIds: string[];
  loanAmount: number;
  loanTermYears: number;
}

export interface HomeSearchFilters extends CommonSearchFilters {
  vertical: "home";
  purpose: LoanPurposeFilter | null;
  repayment: RepaymentFilter | null;
  lvr: number | null;
  fixedMonths: number | null;
  offset: boolean;
  redraw: boolean;
  extraRepayments: false;
  relationshipManagement: false;
  facilityCategory: null;
}

export interface PersonalSearchFilters extends CommonSearchFilters {
  vertical: "personal";
  purpose: null;
  repayment: null;
  lvr: null;
  fixedMonths: null;
  offset: false;
  redraw: boolean;
  extraRepayments: boolean;
  relationshipManagement: false;
  facilityCategory: null;
}

export interface CommercialSearchFilters extends CommonSearchFilters {
  vertical: "commercial";
  purpose: null;
  repayment: null;
  lvr: null;
  fixedMonths: null;
  offset: false;
  redraw: false;
  extraRepayments: false;
  relationshipManagement: boolean;
  facilityCategory: FacilityCategoryFilter | null;
}

export type SearchFilters =
  HomeSearchFilters | PersonalSearchFilters | CommercialSearchFilters;

type SearchFilterChanges = Partial<CommonSearchFilters> & {
  purpose?: LoanPurposeFilter | null;
  repayment?: RepaymentFilter | null;
  lvr?: number | null;
  fixedMonths?: number | null;
  offset?: boolean;
  redraw?: boolean;
  extraRepayments?: boolean;
  relationshipManagement?: boolean;
  facilityCategory?: FacilityCategoryFilter | null;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function many(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function member<T extends readonly string[]>(
  values: T,
  value: string | undefined,
): T[number] | null {
  return value && values.includes(value) ? value : null;
}

function boundedNumber(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

export function parseSearchParams(
  raw: RawSearchParams,
  vertical: MarketSearchVertical = "home",
): SearchFilters {
  const page = Math.floor(boundedNumber(one(raw.page), 1, 10_000) ?? 1);
  const compareIds = [
    ...new Set(
      many(raw.compare)
        .map((value) => value.trim())
        .filter((value) => /^[a-zA-Z0-9_-]{1,80}$/.test(value)),
    ),
  ].slice(0, MAX_COMPARE_PRODUCTS);
  const common: CommonSearchFilters = {
    q: (one(raw.q) ?? "").trim().slice(0, 160),
    rateType: member(RATE_TYPE_VALUES, one(raw.rateType)),
    noOngoingFee: one(raw.noOngoingFee) === "1",
    sort: member(SORT_VALUES, one(raw.sort)) ?? "relevance",
    page,
    productId: (one(raw.product) ?? "").trim() || null,
    compareIds,
    loanAmount: Math.round(
      boundedNumber(one(raw.amount), 1_000, 100_000_000) ??
        MARKET_VERTICALS[vertical].defaultAmount,
    ),
    loanTermYears: Math.round(
      boundedNumber(one(raw.term), 1, 40) ??
        MARKET_VERTICALS[vertical].defaultTermYears,
    ),
  };
  if (vertical === "personal") {
    return {
      ...common,
      vertical,
      purpose: null,
      repayment: null,
      lvr: null,
      fixedMonths: null,
      offset: false,
      redraw: one(raw.redraw) === "1",
      extraRepayments: one(raw.extraRepayments) === "1",
      relationshipManagement: false,
      facilityCategory: null,
    };
  }
  if (vertical === "commercial") {
    return {
      ...common,
      vertical,
      purpose: null,
      repayment: null,
      lvr: null,
      fixedMonths: null,
      offset: false,
      redraw: false,
      extraRepayments: false,
      relationshipManagement: one(raw.relationshipManagement) === "1",
      facilityCategory: member(
        FACILITY_CATEGORY_VALUES,
        one(raw.facilityCategory),
      ),
    };
  }
  return {
    ...common,
    vertical,
    purpose: member(PURPOSE_VALUES, one(raw.purpose)),
    repayment: member(REPAYMENT_VALUES, one(raw.repayment)),
    lvr: boundedNumber(one(raw.lvr), 1, 100),
    fixedMonths: boundedNumber(one(raw.fixedMonths), 1, 120),
    offset: one(raw.offset) === "1",
    redraw: one(raw.redraw) === "1",
    extraRepayments: false,
    relationshipManagement: false,
    facilityCategory: null,
  };
}

export function searchParamsFor(
  filters: SearchFilters,
  changes: SearchFilterChanges = {},
): URLSearchParams {
  const next = { ...filters, ...changes } as SearchFilters;
  const params = new URLSearchParams();
  if (next.vertical !== "home") params.set("area", next.vertical);
  if (next.q) params.set("q", next.q);
  if (next.purpose) params.set("purpose", next.purpose);
  if (next.rateType) params.set("rateType", next.rateType);
  if (next.repayment) params.set("repayment", next.repayment);
  if (next.lvr !== null) params.set("lvr", String(next.lvr));
  if (next.fixedMonths !== null)
    params.set("fixedMonths", String(next.fixedMonths));
  if (next.offset) params.set("offset", "1");
  if (next.redraw) params.set("redraw", "1");
  if (next.extraRepayments) params.set("extraRepayments", "1");
  if (next.relationshipManagement) params.set("relationshipManagement", "1");
  if (next.facilityCategory)
    params.set("facilityCategory", next.facilityCategory);
  if (next.noOngoingFee) params.set("noOngoingFee", "1");
  if (next.sort !== "relevance") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.productId) params.set("product", next.productId);
  next.compareIds.slice(0, MAX_COMPARE_PRODUCTS).forEach((id) => {
    params.append("compare", id);
  });
  if (next.loanAmount !== MARKET_VERTICALS[next.vertical].defaultAmount) {
    params.set("amount", String(next.loanAmount));
  }
  if (next.loanTermYears !== MARKET_VERTICALS[next.vertical].defaultTermYears) {
    params.set("term", String(next.loanTermYears));
  }
  return params;
}

export function searchResetParamsFor(filters: SearchFilters): URLSearchParams {
  return searchParamsFor(filters, {
    q: "",
    purpose: null,
    rateType: null,
    repayment: null,
    lvr: null,
    fixedMonths: null,
    offset: false,
    redraw: false,
    extraRepayments: false,
    relationshipManagement: false,
    facilityCategory: null,
    noOngoingFee: false,
    sort: "relevance",
    page: 1,
    productId: null,
  });
}

export function toggleComparisonParamsFor(
  filters: SearchFilters,
  productId: string,
): URLSearchParams {
  const selected = filters.compareIds.includes(productId);
  const compareIds = selected
    ? filters.compareIds.filter((id) => id !== productId)
    : [...filters.compareIds, productId].slice(0, MAX_COMPARE_PRODUCTS);
  return searchParamsFor(filters, { compareIds });
}

export function hasActiveSearch(filters: SearchFilters): boolean {
  return Boolean(
    filters.q ||
    filters.purpose ||
    filters.rateType ||
    filters.repayment ||
    filters.lvr !== null ||
    filters.fixedMonths !== null ||
    filters.offset ||
    filters.redraw ||
    filters.extraRepayments ||
    filters.relationshipManagement ||
    filters.facilityCategory ||
    filters.noOngoingFee,
  );
}
