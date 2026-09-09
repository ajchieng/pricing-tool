export const CAPITAL_REGULATORY_SOURCE = "APS_112_2025_07_01" as const;

export type CapitalRegulatorySource = typeof CAPITAL_REGULATORY_SOURCE;
export type CapitalClassificationBasis = "derived" | "provisional" | "override";

export interface CapitalClassification {
  drawnExposure: number;
  undrawnExposure: number;
  creditConversionFactorPct: number;
  riskWeightPct: number;
  derivedRiskWeightPct: number;
  classificationCode: string;
  classificationLabel: string;
  classificationBasis: CapitalClassificationBasis;
  classificationConfirmed: boolean;
  overrideReason: string | null;
  /** Browser-local simulated author; never a claim of external authorization. */
  overrideByName?: string;
  overrideByRole?: "demo";
  regulatorySource: CapitalRegulatorySource;
  warnings: string[];
}

export interface CapitalAllocationInput extends CapitalClassification {
  capitalRatioPct: number;
}

export interface CapitalAllocationResult extends CapitalAllocationInput {
  regulatoryExposure: number;
  riskWeightedAssets: number;
  allocatedCapital: number;
  returnOnEquity: number | null;
}

export type CapitalStandardStatus =
  "confirmed_standard" | "non_standard" | "unconfirmed";

export type CommercialCapitalExposureClass =
  | "sme_retail"
  | "sme_corporate"
  | "general_corporate"
  | "commercial_property_dependent"
  | "specialised_project_finance"
  | "specialised_object_or_commodities_finance";
