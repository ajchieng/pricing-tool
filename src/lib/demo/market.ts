import type { MarketQuoteEvidenceV2 } from "@/lib/market/quote-evidence-values";

export type MarketArea = "home" | "personal" | "commercial";
export interface SampleMarketProduct {
  id: string;
  area: MarketArea;
  lender: string;
  name: string;
  rate: number;
  comparisonRate: number;
  annualFee: number;
  maxLvr: number | null;
  rateType: "variable" | "fixed";
  features: string[];
  description: string;
}

export const SAMPLE_MARKET: SampleMarketProduct[] = [
  {
    id: "home-river",
    area: "home",
    lender: "Riverbank Demo",
    name: "Everyday Home",
    rate: 6.12,
    comparisonRate: 6.31,
    annualFee: 180,
    maxLvr: 80,
    rateType: "variable",
    features: ["Offset", "Redraw"],
    description:
      "A fictional owner-occupied mortgage with an offset account and flexible repayments.",
  },
  {
    id: "home-horizon",
    area: "home",
    lender: "Horizon Demo",
    name: "Simple Home",
    rate: 6.28,
    comparisonRate: 6.35,
    annualFee: 0,
    maxLvr: 90,
    rateType: "variable",
    features: ["Redraw", "Extra repayments"],
    description: "A fictional basic mortgage with no annual package fee.",
  },
  {
    id: "home-summit",
    area: "home",
    lender: "Summit Demo",
    name: "Two Year Home",
    rate: 6.05,
    comparisonRate: 6.48,
    annualFee: 220,
    maxLvr: 80,
    rateType: "fixed",
    features: ["Two-year fixed period"],
    description:
      "An illustrative fixed-rate mortgage for comparing repayment certainty.",
  },
  {
    id: "personal-river",
    area: "personal",
    lender: "Riverbank Demo",
    name: "Everyday Personal",
    rate: 10.4,
    comparisonRate: 11.2,
    annualFee: 60,
    maxLvr: null,
    rateType: "variable",
    features: ["Unsecured", "Extra repayments"],
    description: "A fictional unsecured loan for personal purchases.",
  },
  {
    id: "personal-horizon",
    area: "personal",
    lender: "Horizon Demo",
    name: "Vehicle Finance",
    rate: 8.25,
    comparisonRate: 8.91,
    annualFee: 90,
    maxLvr: null,
    rateType: "fixed",
    features: ["Vehicle security", "Fixed repayments"],
    description:
      "An illustrative secured vehicle loan with a five-year example term.",
  },
  {
    id: "personal-summit",
    area: "personal",
    lender: "Summit Demo",
    name: "Flexible Personal",
    rate: 11.1,
    comparisonRate: 11.65,
    annualFee: 0,
    maxLvr: null,
    rateType: "variable",
    features: ["Unsecured", "No annual fee"],
    description:
      "A fictional personal loan for comparing flexibility and fees.",
  },
  {
    id: "commercial-river",
    area: "commercial",
    lender: "Riverbank Demo",
    name: "Business Term",
    rate: 7.85,
    comparisonRate: 8.2,
    annualFee: 300,
    maxLvr: 70,
    rateType: "variable",
    features: ["Property security", "Monthly repayments"],
    description: "A fictional secured business term facility.",
  },
  {
    id: "commercial-horizon",
    area: "commercial",
    lender: "Horizon Demo",
    name: "Equipment Facility",
    rate: 8.35,
    comparisonRate: 8.72,
    annualFee: 240,
    maxLvr: null,
    rateType: "fixed",
    features: ["Equipment security", "Fixed repayments"],
    description: "An illustrative facility for business equipment purchases.",
  },
  {
    id: "commercial-summit",
    area: "commercial",
    lender: "Summit Demo",
    name: "Working Capital",
    rate: 9.15,
    comparisonRate: 9.8,
    annualFee: 480,
    maxLvr: null,
    rateType: "variable",
    features: ["Revolving facility", "Flexible drawdown"],
    description: "A fictional revolving facility for seasonal working capital.",
  },
];

export function getMarketEvidence(id: string): MarketQuoteEvidenceV2 | null {
  const product = SAMPLE_MARKET.find((item) => item.id === id);
  if (!product) return null;
  return {
    version: 2,
    vertical: product.area,
    productCategory:
      product.area === "home"
        ? "RESIDENTIAL_MORTGAGES"
        : product.area === "personal"
          ? "PERSONAL_LOANS"
          : "BUSINESS_LOANS",
    marketRateId: product.id,
    marketProductId: product.id,
    lender: product.lender,
    productName: product.name,
    cdrProductId: `fictional-${product.id}`,
    rateCriteria: {
      lendingRateType: product.rateType.toUpperCase(),
      loanPurpose: product.area === "home" ? "OWNER_OCCUPIED" : null,
      repaymentType:
        product.id === "commercial-summit"
          ? "REVOLVING"
          : "PRINCIPAL_AND_INTEREST",
      fixedPeriodMonths:
        product.rateType === "fixed"
          ? product.area === "home"
            ? 24
            : 60
          : null,
      minLvr: product.maxLvr ? 0 : null,
      maxLvr: product.maxLvr,
    },
    advertisedRate: product.rate,
    comparisonRate: product.comparisonRate,
    evidenceUrl: null,
    sourceUpdatedAt: "2026-01-01T00:00:00.000Z",
    fetchedAt: "2026-01-01T00:00:00.000Z",
    capturedAt: new Date().toISOString(),
  };
}

export function marketPrefill(id: string): Record<string, unknown> {
  const evidence = getMarketEvidence(id);
  if (!evidence) return {};
  const context = {
    competitorLender: evidence.lender,
    competitorRate: evidence.advertisedRate,
    competitorNotes:
      "Fictional catalogue evidence for portfolio demonstration.",
    marketRateId: evidence.marketRateId,
  };
  // Prefill an equivalent demo scenario; the competitor rate never becomes a
  // lender product rate, fee setting or requested-rate instruction.
  if (evidence.vertical === "home") {
    const fixed = evidence.rateCriteria.lendingRateType === "FIXED";
    return {
      ...context,
      productId: fixed ? 102 : 101,
      loanPurpose: "owner_occupied",
      rateType: fixed ? "fixed" : "variable",
      fixedPeriodMonths: fixed ? 24 : null,
    };
  }
  if (evidence.vertical === "personal") {
    const secured = id === "personal-horizon";
    return {
      ...context,
      productId: secured ? 201 : 202,
      securityType: secured ? "secured_vehicle" : "unsecured",
      loanPurpose: secured ? "car_purchase" : "other",
      loanTermMonths: 60,
      costOfFunds: null,
      otherIncome: null,
      expenses: null,
    };
  }
  if (id === "commercial-horizon") {
    return {
      ...context,
      facilityType: "equipment_finance",
      loanAmount: 500000,
      purchasePrice: 600000,
      customerEquityContribution: 100000,
      loanTermYears: 5,
      repaymentType: "principal_and_interest",
      securities: [
        {
          type: "business_assets",
          value: 600000,
          description: "Fictional equipment purchase",
          isPrimary: true,
        },
      ],
      securityType: "business_assets",
      securityValue: 600000,
      costOfFunds: null,
      otherIncome: null,
      expenses: null,
    };
  }
  if (id === "commercial-summit") {
    return {
      ...context,
      facilityType: "overdraft",
      loanTermYears: null,
      repaymentType: "revolving",
      expectedUtilisationPct: 65,
      currentDrawnBalance: 300000,
      costOfFunds: null,
      otherIncome: null,
      expenses: null,
    };
  }
  return {
    ...context,
    facilityType: "term_loan",
    repaymentType: "principal_and_interest",
  };
}

export function demoMarketHandoff(
  area: MarketArea,
  id?: string,
): {
  evidence: MarketQuoteEvidenceV2 | null;
  values: Record<string, unknown>;
  warning: string | null;
} {
  if (!id) return { evidence: null, values: {}, warning: null };
  const evidence = getMarketEvidence(id);
  if (!evidence)
    return {
      evidence: null,
      values: {},
      warning:
        "The selected fictional market product could not be found. Choose another product in Market Search or start a fresh scenario.",
    };
  if (evidence.vertical !== area)
    return {
      evidence: null,
      values: {},
      warning: `This market product belongs to ${evidence.vertical} lending. No evidence has been attached to this ${area} quote; choose a matching product in Market Search.`,
    };
  return { evidence, values: marketPrefill(id), warning: null };
}
