import type { CustomerScoreCategory, CustomerScoreProductArea } from "../types";
import type { ScoreFactValue } from "../score-engine";

export type CreditRiskStatus =
  "calculated" | "incomplete_inputs" | "not_configured" | "incompatible_policy";

export interface CreditRiskFactorContribution {
  key: string;
  field: string;
  label: string;
  category: CustomerScoreCategory;
  rawValue: ScoreFactValue;
  rawWeight: number;
  normalisedRiskWeightPct: number;
  factorScore: number;
  weightedRiskPoints: number;
  reason: string;
}

export interface RiskOnlyAssessment {
  status: Exclude<CreditRiskStatus, "incompatible_policy">;
  riskScore: number | null;
  riskDefinitionHash: string;
  sourceModelArea: CustomerScoreProductArea;
  sourceModelId: number | null;
  sourceModelVersion: number;
  sourceModelName: string;
  riskRawWeightTotal: number;
  contributions: CreditRiskFactorContribution[];
  missingCriticalFacts: string[];
  technicalReason: string | null;
}
