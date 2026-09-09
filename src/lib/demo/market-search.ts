import { SAMPLE_MARKET, type SampleMarketProduct } from "./market";
import type { SearchFilters } from "@/lib/market/search/params";

export interface SearchRate {
  id: string;
  advertisedRate: number;
  comparisonRate: number | null;
  lendingRateType: string;
  loanPurpose: string | null;
  repaymentType: string;
  minLvr: number | null;
  maxLvr: number | null;
  fixedPeriodMonths: number | null;
}
interface DetailItem {
  id: string;
  additionalInfo: string | null;
  additionalValue: string | null;
}
export interface SearchProduct {
  id: string;
  name: string;
  brandName: string;
  description: string;
  productCategory: string;
  isTailored: boolean;
  source: { brandName: string; lenderName: string; isOwnBrand: boolean };
  lendingRates: SearchRate[];
  features: Array<DetailItem & { featureType: string }>;
  eligibility: Array<DetailItem & { eligibilityType: string }>;
  constraints: Array<
    DetailItem & { constraintType: string; numericValue: number | null }
  >;
  fees: Array<
    DetailItem & {
      feeType: string;
      name: string;
      amount: number | null;
      frequency: string | null;
    }
  >;
  sourceUpdatedAt: Date | null;
  fetchedAt: Date | null;
  overviewUri: string | null;
  termsUri: string | null;
  eligibilityUri: string | null;
  feesAndPricingUri: string | null;
}
export interface RankedProduct {
  product: SearchProduct;
  rate: SearchRate;
  matchesFilters: boolean;
}
export interface SearchResponse {
  results: RankedProduct[];
  total: number;
  page: number;
  pages: number;
  selected: SearchProduct | null;
  comparison: RankedProduct[];
  ranking: { mode: "keyword"; fallback: boolean };
  interpretation: string[];
}

/** Project the bundled fictional catalogue onto the original market presentation. */
function productFor(item: SampleMarketProduct): SearchProduct {
  const overdraft = item.id === "commercial-summit";
  return {
    id: item.id,
    name: item.name,
    brandName: item.lender,
    description: item.description,
    productCategory: overdraft
      ? "OVERDRAFTS"
      : item.area === "home"
        ? "RESIDENTIAL_MORTGAGES"
        : item.area === "personal"
          ? "PERS_LOANS"
          : "BUSINESS_LOANS",
    isTailored: false,
    source: {
      brandName: item.lender,
      lenderName: item.lender,
      isOwnBrand: false,
    },
    lendingRates: [
      {
        id: item.id,
        advertisedRate: item.rate,
        comparisonRate: item.comparisonRate,
        lendingRateType: item.rateType.toUpperCase(),
        loanPurpose: item.area === "home" ? "OWNER_OCCUPIED" : null,
        repaymentType: overdraft ? "REVOLVING" : "PRINCIPAL_AND_INTEREST",
        minLvr: item.maxLvr == null ? null : 0,
        maxLvr: item.maxLvr,
        fixedPeriodMonths:
          item.rateType === "fixed" ? (item.area === "home" ? 24 : 60) : null,
      },
    ],
    features: item.features.map((feature, index) => ({
      id: `${item.id}-feature-${index}`,
      featureType: feature.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_"),
      additionalInfo: null,
      additionalValue: null,
    })),
    eligibility: [],
    constraints:
      item.maxLvr == null
        ? []
        : [
            {
              id: `${item.id}-lvr`,
              constraintType: "MAXIMUM_LVR",
              numericValue: item.maxLvr,
              additionalInfo: null,
              additionalValue: null,
            },
          ],
    fees: [
      {
        id: `${item.id}-fee`,
        feeType: "PERIODIC",
        name: "Annual fee",
        amount: item.annualFee,
        frequency: "P1Y",
        additionalInfo: null,
        additionalValue: null,
      },
    ],
    sourceUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
    fetchedAt: null,
    overviewUri: null,
    termsUri: null,
    eligibilityUri: null,
    feesAndPricingUri: null,
  };
}

function matches(item: SampleMarketProduct, filters: SearchFilters): boolean {
  const words =
    `${item.name} ${item.lender} ${item.rateType} ${item.description} ${item.features.join(" ")} ${item.id === "commercial-summit" ? "overdraft revolving" : "principal interest"}`.toLowerCase();
  const feature = (name: string) =>
    item.features.some((value) => value.toLowerCase() === name);
  const searchTerms = filters.q
    .toLowerCase()
    .split(/\W+/)
    .filter(
      (word) =>
        word &&
        ![
          "a",
          "an",
          "the",
          "with",
          "and",
          "for",
          "loan",
          "loans",
          "product",
          "products",
          "account",
        ].includes(word),
    );
  if (!searchTerms.every((word) => words.includes(word))) return false;
  if (filters.rateType && item.rateType !== filters.rateType) return false;
  if (filters.noOngoingFee && item.annualFee !== 0) return false;
  if (filters.purpose && filters.purpose !== "owner_occupied") return false;
  if (filters.repayment && filters.repayment !== "principal_and_interest")
    return false;
  if (filters.lvr != null && (item.maxLvr == null || item.maxLvr < filters.lvr))
    return false;
  if (
    filters.fixedMonths != null &&
    (item.rateType !== "fixed" || filters.fixedMonths !== 24)
  )
    return false;
  if (filters.offset && !feature("offset")) return false;
  if (filters.redraw && !feature("redraw")) return false;
  if (filters.extraRepayments && !feature("extra repayments")) return false;
  if (filters.relationshipManagement && !feature("relationship management"))
    return false;
  if (
    filters.facilityCategory &&
    (filters.facilityCategory === "overdraft") !==
      (item.id === "commercial-summit")
  )
    return false;
  return true;
}

export function searchDemoMarket(filters: SearchFilters): SearchResponse {
  const catalogue = SAMPLE_MARKET.filter(
    (item) => item.area === filters.vertical,
  );
  const ranked = catalogue.map((item) => {
    const product = productFor(item);
    return {
      product,
      rate: product.lendingRates[0],
      matchesFilters: matches(item, filters),
    };
  });
  const results = ranked
    .filter((item) => item.matchesFilters)
    .sort((a, b) => {
      if (filters.sort === "name")
        return a.product.name.localeCompare(b.product.name);
      if (filters.sort === "comparison")
        return (
          (a.rate.comparisonRate ?? Infinity) -
          (b.rate.comparisonRate ?? Infinity)
        );
      if (filters.sort === "rate")
        return a.rate.advertisedRate - b.rate.advertisedRate;
      return 0;
    });
  return {
    results,
    total: results.length,
    page: 1,
    pages: 1,
    selected:
      ranked.find((item) => item.product.id === filters.productId)?.product ??
      null,
    comparison: ranked.filter((item) =>
      filters.compareIds.includes(item.product.id),
    ),
    ranking: { mode: "keyword", fallback: false },
    interpretation: [],
  };
}
