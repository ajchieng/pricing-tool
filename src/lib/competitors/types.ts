import type { LoanPurpose, RateType, RepaymentType } from "@/lib/pricing/types";

export interface CompetitorRateScenario {
  loanPurpose: LoanPurpose;
  rateType: RateType;
  fixedPeriodMonths: number | null;
  repaymentType: RepaymentType;
  loanAmount: number;
  propertyValue: number;
}

export interface CompetitorRate {
  lenderName: string;
  productName: string;
  cdrProductId: string | null;
  loanPurpose: LoanPurpose | null;
  rateType: RateType;
  fixedPeriodMonths: number | null;
  repaymentType: RepaymentType | null;
  minLvr: number | null;
  maxLvr: number | null;
  advertisedRate: number;
  comparisonRate: number | null;
  sourceUrl: string | null;
  sourceUpdatedAt?: string | null;
  fetchedAt: string;
  origin?: "cdr" | "manual";
}

export interface CompetitorRateMatch extends CompetitorRate {
  lvr: number;
  rateGap: number;
  matchCount: number;
}

export interface CdrLendingRate {
  lendingRateType?: string;
  rate?: string | number;
  comparisonRate?: string | number | null;
  loanPurpose?: string | null;
  repaymentType?: string | null;
  additionalInfo?: string | null;
  additionalInfoUri?: string | null;
  tiers?: Array<{
    name?: string | null;
    unitOfMeasure?: string | null;
    minimumValue?: number | string | null;
    maximumValue?: number | string | null;
  }> | null;
}

export interface CdrProductDetail {
  productId?: string;
  name?: string;
  displayName?: string;
  brandName?: string;
  productCategory?: string;
  lastUpdated?: string | null;
  additionalInformation?: {
    overviewUri?: string | null;
    termsUri?: string | null;
  } | null;
  lendingRates?: CdrLendingRate[] | null;
}
