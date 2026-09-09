import {
  round,
  scoreFactor,
  selectedScoreFactorField,
  type ScoreFacts,
} from "../score-engine";
import type {
  CustomerScoreModelConfig,
  CustomerScoreProductArea,
} from "../types";
import {
  eligibleRiskFactors,
  riskDefinitionHash,
} from "./risk-definition-hash";
import type { RiskOnlyAssessment } from "./types";

function factIsMissing(value: unknown): boolean {
  return value == null || value === "";
}

export function calculateRiskOnlyAssessment(input: {
  facts: ScoreFacts;
  model: CustomerScoreModelConfig;
  productArea: CustomerScoreProductArea;
  eligibleFields: ReadonlySet<string>;
  hashEligibleFields?: ReadonlySet<string>;
  requiredFactFields?: ReadonlySet<string>;
  factDerivationVersion: string;
  factDerivationConfig?: unknown;
}): RiskOnlyAssessment {
  const definitionHash = riskDefinitionHash({
    ...input,
    eligibleFields: input.hashEligibleFields ?? input.eligibleFields,
  });
  const factors = eligibleRiskFactors(input.model, input.eligibleFields);
  const riskRawWeightTotal = factors.reduce(
    (sum, factor) => sum + factor.weight,
    0,
  );
  const base = {
    riskDefinitionHash: definitionHash,
    sourceModelArea: input.productArea,
    sourceModelId: input.model.id ?? null,
    sourceModelVersion: input.model.version,
    sourceModelName: input.model.name,
    riskRawWeightTotal,
  };

  if (riskRawWeightTotal <= 0) {
    return {
      ...base,
      status: "not_configured",
      riskScore: null,
      contributions: [],
      missingCriticalFacts: [],
      technicalReason:
        "The active score model has no positive-weight eligible Risk factors.",
    };
  }

  const requiredFields =
    input.requiredFactFields ?? new Set(factors.map((factor) => factor.field));
  const missingCriticalFacts = [...requiredFields]
    .filter((field) => factIsMissing(input.facts[field]?.value))
    .sort();

  const contributions = factors.map((factor) => {
    const scored = scoreFactor(input.facts, factor);
    const selectedField = selectedScoreFactorField(input.facts, factor);
    const normalisedRiskWeightPct = (factor.weight / riskRawWeightTotal) * 100;
    return {
      key: factor.key,
      field: selectedField,
      label: factor.label,
      category: factor.category,
      rawValue: input.facts[selectedField]?.value ?? null,
      rawWeight: factor.weight,
      normalisedRiskWeightPct: round(normalisedRiskWeightPct, 6),
      factorScore: scored.score,
      weightedRiskPoints: round(
        scored.score * (normalisedRiskWeightPct / 100),
        6,
      ),
      reason: scored.reason,
    };
  });

  if (missingCriticalFacts.length > 0) {
    return {
      ...base,
      status: "incomplete_inputs",
      riskScore: null,
      contributions,
      missingCriticalFacts,
      technicalReason: "One or more required customer risk facts are missing.",
    };
  }

  return {
    ...base,
    status: "calculated",
    riskScore: round(
      contributions.reduce(
        (sum, contribution) => sum + contribution.weightedRiskPoints,
        0,
      ),
      6,
    ),
    contributions,
    missingCriticalFacts: [],
    technicalReason: null,
  };
}
