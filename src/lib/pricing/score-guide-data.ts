// Shared source of truth for the customer score guide category rollup maths.
// Both the home-loan guide (`/home-loans/score-guide`) and the PDF export import from here
// so they never drift apart. Category colours stay in the page/PDF
// (presentation only).

import type {
  CustomerScoreCategory,
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreLinearPoint,
  CustomerScoreMonotonicDirection,
  CustomerScoreNumericRule,
  CustomerScoreScoringMethod,
  CustomerScoreValueMapping,
} from "./types";

const SCORE_GUIDE_CATEGORY_ORDER: CustomerScoreCategory[] = [
  "risk",
  "loan",
  "relationship",
  "strategic",
];

const SCORE_GUIDE_CATEGORY_LABELS: Record<CustomerScoreCategory, string> = {
  risk: "Risk",
  loan: "Loan",
  relationship: "Relationship",
  strategic: "Strategic",
};

const SCORE_GUIDE_CATEGORY_NOTES: Record<CustomerScoreCategory, string> = {
  risk: "Credit, DTI and income remain core risk signals for non-retention quotes.",
  loan: "LVR, amount, product shape and term define the lending structure.",
  relationship:
    "Customer stream, membership tenure, Lender lending and selected product depth add relationship value.",
  strategic:
    "VIP, local-area, broker quality, requested rate and competitor evidence provide strategic context.",
};

export type ScoreModelFactorWeight = {
  key: string;
  label: string;
  category: CustomerScoreCategory;
  field: string;
  fieldType: CustomerScoreFactorConfig["fieldType"];
  rawWeight: number;
  normalisedWeight: number;
  missingScore: number;
  scoringMethod: CustomerScoreScoringMethod;
  points: CustomerScoreLinearPoint[];
  monotonicDirection: CustomerScoreMonotonicDirection | null;
  rules: CustomerScoreNumericRule[];
  mappings: CustomerScoreValueMapping[];
};

export type ScoreModelCategoryRollup = {
  category: CustomerScoreCategory;
  label: string;
  note: string;
  factors: ScoreModelFactorWeight[];
  rawWeight: number;
  normalisedWeight: number;
};

export type ScoreModelGuideData = {
  totalRawWeight: number;
  factorCount: number;
  categories: ScoreModelCategoryRollup[];
};

export function scoreModelGuideData(
  model: CustomerScoreModelConfig,
): ScoreModelGuideData {
  const factors = model.factors
    .filter((factor) => factor.enabled)
    .map((factor) => ({
      key: factor.key,
      label: factor.label,
      category: factor.category,
      field: factor.field,
      fieldType: factor.fieldType,
      rawWeight: Math.max(0, Number(factor.weight) || 0),
      missingScore: Math.max(0, Number(factor.missingScore) || 0),
      scoringMethod: factor.scoringMethod ?? "step",
      points: factor.points ?? [],
      monotonicDirection: factor.monotonicDirection ?? null,
      rules: factor.rules ?? [],
      mappings: factor.mappings ?? [],
    }));
  const totalRawWeight = factors.reduce(
    (sum, factor) => sum + factor.rawWeight,
    0,
  );
  const factorsWithInfluence: ScoreModelFactorWeight[] = factors.map(
    (factor) => {
      const normalisedWeight =
        totalRawWeight > 0 ? (factor.rawWeight / totalRawWeight) * 100 : 0;
      return {
        ...factor,
        normalisedWeight,
      };
    },
  );

  const categories = SCORE_GUIDE_CATEGORY_ORDER.map((category) => {
    const categoryFactors = factorsWithInfluence.filter(
      (factor) => factor.category === category,
    );
    const rawWeight = categoryFactors.reduce(
      (sum, factor) => sum + factor.rawWeight,
      0,
    );
    const normalisedWeight = categoryFactors.reduce(
      (sum, factor) => sum + factor.normalisedWeight,
      0,
    );
    return {
      category,
      label: SCORE_GUIDE_CATEGORY_LABELS[category],
      note: SCORE_GUIDE_CATEGORY_NOTES[category],
      factors: categoryFactors,
      rawWeight,
      normalisedWeight,
    };
  });

  return {
    totalRawWeight,
    factorCount: factorsWithInfluence.length,
    categories,
  };
}

export function scoreModelCategoryRollups(
  model: CustomerScoreModelConfig,
): ScoreModelCategoryRollup[] {
  return scoreModelGuideData(model).categories;
}
