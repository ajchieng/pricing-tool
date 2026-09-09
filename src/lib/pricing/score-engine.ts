import type {
  CustomerScoreBandConfig,
  CustomerScoreCategory,
  CustomerScoreFactor,
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreNumericRule,
  CustomerScoreRateCurveConfig,
  CustomerScoreResult,
  CustomerScoreRuleOperator,
  CustomerScoreValueMapping,
} from "./types";

export const DISCOUNT_ENTITLEMENT_PRICING_BASIS =
  "discount_entitlement_v1" as const;
const DISCOUNT_THRESHOLD_SCORE = 46;
export const MAX_CUSTOMER_SCORE = 100;
export const MAX_DISCOUNT_THRESHOLD_SCORE = 99;
export const MAX_GOVERNED_DISCOUNT_PCT = 4;

export function isDiscountEntitlementCurve(
  curve: CustomerScoreRateCurveConfig,
): boolean {
  return curve.pricingBasis === DISCOUNT_ENTITLEMENT_PRICING_BASIS;
}

export function discountEntitlementForScore(
  score: number,
  thresholdScore = DISCOUNT_THRESHOLD_SCORE,
): number {
  return clamp(
    (clamp(score, 0, MAX_CUSTOMER_SCORE) - thresholdScore) /
      (MAX_CUSTOMER_SCORE - thresholdScore),
    0,
    1,
  );
}

export function discountOnlyRateCurve(
  maxDiscount: number,
  thresholdScore = DISCOUNT_THRESHOLD_SCORE,
): CustomerScoreRateCurveConfig {
  return {
    pricingBasis: DISCOUNT_ENTITLEMENT_PRICING_BASIS,
    neutralScore: thresholdScore,
    discountSlope: maxDiscount / (MAX_CUSTOMER_SCORE - thresholdScore),
    loadingSlope: 0,
    maxDiscount,
    maxLoading: 0,
    neutralMargin: 0,
  };
}

// Generic weighted-factor score engine shared by all three lending verticals.
// Each vertical supplies a facts resolver (its input type → ScoreFacts) and an
// allowed-field catalog; the engine itself knows nothing about loan products.

export type ScoreFactValue = string | number | boolean | null;

export interface ScoreFact {
  value: ScoreFactValue;
  // Overrides the "present" operator only: when explicitly false, "present"
  // rules never match even though value is set. Used by home loans where a
  // requested rate accompanied by competitor evidence is scored on the delta
  // rules instead of the bare "entered without competitor" rule.
  present?: boolean;
  // When false, ordered numeric comparison rules are skipped while present and
  // missing rules remain eligible. Home uses this for a requested rate entered
  // without competitor evidence, where the absolute rate is not a rate delta.
  numericComparison?: boolean;
}

export type ScoreFacts = Record<string, ScoreFact>;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((value + Number.EPSILON) * f) / f;
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "not entered";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(round(value, 2));
  return typeof value === "string" ? value.replaceAll("_", " ") : "not entered";
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// ---- Model-building helpers (used by each vertical's default model) ----

export function factorConfig(
  key: string,
  label: string,
  category: CustomerScoreCategory,
  field: string,
  weight: number,
  missingScore: number,
  rulesOrMappings: CustomerScoreNumericRule[] | CustomerScoreValueMapping[],
  fieldType: CustomerScoreFactorConfig["fieldType"],
): CustomerScoreFactorConfig {
  return {
    key,
    label,
    category,
    field,
    fieldType,
    enabled: true,
    weight,
    missingScore,
    ...(fieldType === "number"
      ? { rules: rulesOrMappings as CustomerScoreNumericRule[] }
      : { mappings: rulesOrMappings as CustomerScoreValueMapping[] }),
  };
}

export const rule = (
  id: string,
  label: string,
  operator: CustomerScoreRuleOperator,
  score: number,
  value?: number,
  reason?: string,
  valueMax?: number,
): CustomerScoreNumericRule => ({
  id,
  label,
  operator,
  value,
  valueMax,
  score,
  reason,
});

export const map = (
  value: string | number | boolean | null,
  score: number,
  label: string,
  reason?: string,
): CustomerScoreValueMapping => ({ value, score, label, reason });

// ---- Evaluation ----

function matchesRule(fact: ScoreFact, rule: CustomerScoreNumericRule): boolean {
  const value = fact.value;
  if (rule.operator === "missing") return value == null || value === "";
  if (rule.operator === "present") {
    if (fact.present === false) return false;
    return value != null && value !== "";
  }
  if (fact.numericComparison === false) return false;
  if (typeof value !== "number") return false;
  const expected = Number(rule.value);
  switch (rule.operator) {
    case "lte":
      return value <= expected;
    case "lt":
      return value < expected;
    case "gte":
      return value >= expected;
    case "gt":
      return value > expected;
    case "eq":
      return value === expected;
    case "between":
      return value >= expected && value <= Number(rule.valueMax);
    default:
      return false;
  }
}

export function scoreFactor(
  facts: ScoreFacts,
  config: CustomerScoreFactorConfig,
): CustomerScoreFactor {
  const primarySource = {
    field: config.field,
    label: config.label,
    rules: config.rules,
  };
  const numericSources = [
    primarySource,
    ...(config.alternativeNumericSources ?? []),
  ];
  const selectedField = selectedScoreFactorField(facts, config);
  const selectedSource =
    numericSources.find((source) => source.field === selectedField) ??
    primarySource;
  const fact = facts[selectedSource.field] ?? { value: null };
  const raw = fact.value;
  const fallback = clamp(config.missingScore);
  let score = fallback;
  let reason = `${config.label} not entered; neutral score used.`;

  if (config.fieldType === "number") {
    if (
      config.scoringMethod === "linear_points" &&
      typeof raw === "number" &&
      fact.numericComparison !== false
    ) {
      const points = [...(config.points ?? [])].sort(
        (left, right) => left.value - right.value,
      );
      if (points.length > 0) {
        const lower =
          [...points].reverse().find((point) => point.value <= raw) ??
          points[0];
        const upper =
          points.find((point) => point.value >= raw) ??
          points[points.length - 1];
        if (lower.value === upper.value) {
          score = clamp(lower.score);
        } else {
          const position = (raw - lower.value) / (upper.value - lower.value);
          score = clamp(lower.score + position * (upper.score - lower.score));
        }
        reason = `${config.label}: linearly interpolated at ${formatValue(raw)} between ${formatValue(lower.value)} and ${formatValue(upper.value)}.`;
      }
    } else {
      const matched = (selectedSource.rules ?? []).find((item) =>
        matchesRule(fact, item),
      );
      if (matched) {
        score = clamp(matched.score);
        reason =
          matched.reason ??
          `${selectedSource.label}: ${matched.label} (${formatValue(raw)}).`;
      }
    }
  } else {
    const matched = (config.mappings ?? []).find((item) => item.value === raw);
    if (matched) {
      score = clamp(matched.score);
      reason =
        matched.reason ??
        `${config.label}: ${matched.label} (${formatValue(raw)}).`;
    } else if (raw != null) {
      reason = `${config.label}: ${formatValue(raw)} uses the fallback score.`;
    }
  }

  const boundedWeight = Math.max(0, Number(config.weight) || 0);
  return {
    key: config.key,
    label: config.label,
    category: config.category,
    weight: boundedWeight,
    score: round(score, 2),
    weightedPoints: 0,
    reason,
  };
}

export function selectedScoreFactorField(
  facts: ScoreFacts,
  config: CustomerScoreFactorConfig,
): string {
  if (config.fieldType !== "number") return config.field;
  return (
    [
      config.field,
      ...(config.alternativeNumericSources ?? []).map((source) => source.field),
    ].find((field) => {
      const value = facts[field]?.value;
      return value != null && value !== "";
    }) ?? config.field
  );
}

function normaliseWeights(
  factors: CustomerScoreFactor[],
): CustomerScoreFactor[] {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight <= 0) return factors;

  return factors.map((f) => {
    const weight = (f.weight / totalWeight) * 100;
    return {
      ...f,
      weight,
      weightedPoints: round((f.score * weight) / 100, 4),
    };
  });
}

function bandForScore(
  score: number,
  bands: CustomerScoreBandConfig[],
): CustomerScoreResult["band"] {
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((band) => score >= band.minScore)?.key ?? "weak";
}

export function scoreToPricingAdjustmentWithCurve(
  score: number,
  curve: CustomerScoreRateCurveConfig,
): number {
  if (isDiscountEntitlementCurve(curve)) {
    const discount = round(
      discountEntitlementForScore(score, curve.neutralScore) *
        curve.maxDiscount,
      2,
    );
    return discount === 0 ? 0 : -discount;
  }
  const base =
    score >= curve.neutralScore
      ? -round(
          Math.min(
            curve.maxDiscount,
            (score - curve.neutralScore) * curve.discountSlope,
          ),
          2,
        )
      : round(
          Math.min(
            curve.maxLoading,
            (curve.neutralScore - score) * curve.loadingSlope,
          ),
          2,
        );
  const neutralMargin = curve.neutralMargin ?? 0;
  // neutralMargin of 0 keeps the historical rounding path bit-for-bit.
  return neutralMargin === 0 ? base : round(neutralMargin + base, 2);
}

// The lowest (max discount) and highest (max loading) pricing adjustment the
// curve can emit, before any vertical clamping. Verticals add these to their
// carded/base rate to derive the displayed floor and top rate around the
// suggested-rate recommendation.
export function pricingAdjustmentRangeForCurve(
  curve: CustomerScoreRateCurveConfig,
): { min: number; max: number } {
  if (isDiscountEntitlementCurve(curve)) {
    return { min: -curve.maxDiscount, max: 0 };
  }
  const neutralMargin = curve.neutralMargin ?? 0;
  return {
    min: round(neutralMargin - curve.maxDiscount, 2),
    max: round(neutralMargin + curve.maxLoading, 2),
  };
}

export function evaluateScoreModel(
  facts: ScoreFacts,
  model: CustomerScoreModelConfig,
  allowedFields: ReadonlySet<string>,
): CustomerScoreResult {
  const factors = normaliseWeights(
    model.factors
      .filter((factor) => factor.enabled && allowedFields.has(factor.field))
      .map((factor) => scoreFactor(facts, factor)),
  );
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score =
    totalWeight > 0
      ? round(
          factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight,
          2,
        )
      : 50;
  const pricingAdjustment = scoreToPricingAdjustmentWithCurve(
    score,
    model.rateCurve,
  );
  const discountOnly = isDiscountEntitlementCurve(model.rateCurve);
  const discountEntitlement = discountOnly
    ? discountEntitlementForScore(score, model.rateCurve.neutralScore)
    : null;

  return {
    modelId: model.id,
    modelVersion: model.version,
    modelName: model.name,
    score,
    band: bandForScore(score, model.bands),
    pricingBasis: discountOnly
      ? DISCOUNT_ENTITLEMENT_PRICING_BASIS
      : "legacy_signed_adjustment",
    discountEntitlementPct:
      discountEntitlement == null ? null : round(discountEntitlement * 100, 4),
    discountThresholdScore: model.rateCurve.neutralScore,
    maxDiscountPct: model.rateCurve.maxDiscount,
    scoreDiscountPct: Math.max(0, round(-pricingAdjustment, 2)),
    pricingAdjustment,
    factors,
  };
}

// ---- Stored-row plumbing (sanitize + hydrate) ----

export interface ScoreModelRow {
  id: number;
  productArea?: string | null;
  version: number;
  name: string;
  description: string | null;
  modelJson: unknown;
  governanceJson?: unknown;
}

export type ScoreModelBody = Pick<
  CustomerScoreModelConfig,
  "factors" | "bands" | "rateCurve"
>;

function supportedFactorConfigs(
  value: unknown,
  defaults: CustomerScoreModelConfig,
  allowedFields: ReadonlySet<string>,
): CustomerScoreFactorConfig[] {
  if (!Array.isArray(value)) return defaults.factors;
  return value.filter(
    (factor): factor is CustomerScoreFactorConfig =>
      isObject(factor) &&
      typeof factor.field === "string" &&
      allowedFields.has(factor.field),
  );
}

export function sanitizeScoreModelJson(
  value: unknown,
  defaults: CustomerScoreModelConfig,
  allowedFields: ReadonlySet<string>,
  applyInvariants: (
    factors: CustomerScoreFactorConfig[],
  ) => CustomerScoreFactorConfig[] = (factors) => factors,
): ScoreModelBody {
  if (!isObject(value))
    return scoreModelBody(defaults, allowedFields, applyInvariants);
  return {
    factors: applyInvariants(
      supportedFactorConfigs(value.factors, defaults, allowedFields),
    ),
    bands: Array.isArray(value.bands)
      ? (value.bands as CustomerScoreBandConfig[])
      : defaults.bands,
    rateCurve: isObject(value.rateCurve)
      ? (value.rateCurve as unknown as CustomerScoreRateCurveConfig)
      : defaults.rateCurve,
  };
}

export function scoreModelBody(
  model: CustomerScoreModelConfig,
  allowedFields: ReadonlySet<string>,
  applyInvariants: (
    factors: CustomerScoreFactorConfig[],
  ) => CustomerScoreFactorConfig[] = (factors) => factors,
): ScoreModelBody {
  return {
    factors: applyInvariants(
      supportedFactorConfigs(model.factors, model, allowedFields),
    ),
    bands: model.bands,
    rateCurve: model.rateCurve,
  };
}

export function scoreModelFromRow(
  row: ScoreModelRow | null,
  defaults: CustomerScoreModelConfig,
  sanitize: (json: unknown) => ScoreModelBody,
): CustomerScoreModelConfig {
  if (!row || !isObject(row.modelJson)) {
    return defaults;
  }

  return {
    id: row.id,
    productArea:
      row.productArea === "personal" ? "personal" : defaults.productArea,
    version: row.version,
    name: row.name,
    description: row.description,
    governanceEvidence: row.governanceJson,
    ...sanitize(row.modelJson),
  };
}
