import type {
  CustomerScoreCategory,
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreProductArea,
  CustomerScoreRuleOperator,
} from "./types";
import {
  DISCOUNT_ENTITLEMENT_PRICING_BASIS,
  MAX_DISCOUNT_THRESHOLD_SCORE,
  MAX_GOVERNED_DISCOUNT_PCT,
  MAX_CUSTOMER_SCORE,
} from "./score-engine";

export type ScoreModelFieldDefinition = Pick<
  CustomerScoreFactorConfig,
  "field" | "fieldType"
>;

const CATEGORIES = new Set<CustomerScoreCategory>([
  "loan",
  "risk",
  "relationship",
  "strategic",
]);
const FIELD_TYPES = new Set<CustomerScoreFactorConfig["fieldType"]>([
  "number",
  "boolean",
  "enum",
]);
const RULE_OPERATORS = new Set<CustomerScoreRuleOperator>([
  "lte",
  "lt",
  "gte",
  "gt",
  "eq",
  "between",
  "present",
  "missing",
]);
const SCORING_METHODS = new Set(["step", "linear_points"]);
const MONOTONIC_DIRECTIONS = new Set(["increasing", "decreasing"]);
const BAND_KEYS = ["excellent", "strong", "standard", "watch", "weak"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function inRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateNumericRules(
  rules: unknown,
  path: string,
  errors: string[],
): void {
  if (!Array.isArray(rules) || rules.length === 0) {
    errors.push(`${path} needs at least one numeric rule.`);
    return;
  }
  if (rules.length > 100) errors.push(`${path} has too many rules.`);
  const ruleIds = new Set<string>();
  rules.forEach((rule, ruleIndex) => {
    const rulePath = `${path}, rule ${ruleIndex + 1}`;
    if (!isObject(rule)) {
      errors.push(`${rulePath} must be an object.`);
      return;
    }
    if (!nonEmptyString(rule.id)) errors.push(`${rulePath} needs an id.`);
    else if (ruleIds.has(rule.id))
      errors.push(`${rulePath} duplicates rule id ${rule.id}.`);
    else ruleIds.add(rule.id);
    if (!nonEmptyString(rule.label)) errors.push(`${rulePath} needs a label.`);
    if (!RULE_OPERATORS.has(rule.operator as CustomerScoreRuleOperator))
      errors.push(`${rulePath} has an invalid operator.`);
    if (!inRange(rule.score, 0, 100))
      errors.push(`${rulePath} score must be between 0 and 100.`);

    if (
      rule.operator !== "present" &&
      rule.operator !== "missing" &&
      !isFiniteNumber(rule.value)
    ) {
      errors.push(`${rulePath} needs a numeric comparison value.`);
    }
    if (rule.operator === "between") {
      if (!isFiniteNumber(rule.valueMax))
        errors.push(`${rulePath} needs a numeric maximum value.`);
      else if (isFiniteNumber(rule.value) && rule.valueMax < rule.value)
        errors.push(`${rulePath} maximum must be at least its minimum.`);
    }
  });
}

/**
 * Validate a governed score-model payload before it enters the approval queue.
 * Runtime hydration remains tolerant so an old malformed row cannot take the
 * entire pricing service down; new policy submissions are held to this stricter
 * boundary instead of relying on client-side number inputs.
 */
export function scoreModelValidationErrors(
  value: unknown,
  allowedFields: readonly ScoreModelFieldDefinition[],
): string[] {
  const errors: string[] = [];
  if (!isObject(value)) return ["Score model must be an object."];

  const fieldTypes = new Map(
    allowedFields.map((item) => [item.field, item.fieldType] as const),
  );
  const factors = value.factors;
  if (!Array.isArray(factors) || factors.length === 0) {
    errors.push("At least one score factor is required.");
  } else if (factors.length > 100) {
    errors.push("A score model cannot contain more than 100 factors.");
  }

  const factorKeys = new Set<string>();
  const factorFields = new Set<string>();
  let positiveEnabledWeight = 0;

  if (Array.isArray(factors)) {
    factors.forEach((factor, factorIndex) => {
      const path = `Factor ${factorIndex + 1}`;
      if (!isObject(factor)) {
        errors.push(`${path} must be an object.`);
        return;
      }

      if (!nonEmptyString(factor.key)) errors.push(`${path} needs a key.`);
      else if (factorKeys.has(factor.key))
        errors.push(`${path} duplicates factor key ${factor.key}.`);
      else factorKeys.add(factor.key);

      if (!nonEmptyString(factor.label)) errors.push(`${path} needs a label.`);
      if (!nonEmptyString(factor.field) || !fieldTypes.has(factor.field)) {
        errors.push(`${path} uses an unsupported field.`);
      } else {
        if (factorFields.has(factor.field))
          errors.push(`${path} duplicates field ${factor.field}.`);
        else factorFields.add(factor.field);
        if (factor.fieldType !== fieldTypes.get(factor.field)) {
          errors.push(`${path} has the wrong field type for ${factor.field}.`);
        }
      }

      if (!CATEGORIES.has(factor.category as CustomerScoreCategory))
        errors.push(`${path} has an invalid category.`);
      if (
        !FIELD_TYPES.has(
          factor.fieldType as CustomerScoreFactorConfig["fieldType"],
        )
      )
        errors.push(`${path} has an invalid field type.`);
      if (typeof factor.enabled !== "boolean")
        errors.push(`${path} must specify whether it is enabled.`);
      if (!inRange(factor.weight, 0, 100))
        errors.push(`${path} weight must be between 0 and 100.`);
      if (!inRange(factor.missingScore, 0, 100))
        errors.push(`${path} missing score must be between 0 and 100.`);
      if (factor.enabled === true && isFiniteNumber(factor.weight)) {
        positiveEnabledWeight += Math.max(0, factor.weight);
      }

      if (factor.fieldType === "number") {
        const scoringMethod = factor.scoringMethod ?? "step";
        if (!SCORING_METHODS.has(scoringMethod as string)) {
          errors.push(`${path} has an invalid numeric scoring method.`);
        } else if (scoringMethod === "linear_points") {
          const points = factor.points;
          if (!Array.isArray(points) || points.length < 2) {
            errors.push(`${path} needs at least two linear scoring points.`);
          } else {
            if (points.length > 100)
              errors.push(`${path} has too many points.`);
            const pointValues = new Set<number>();
            const validPoints: Array<{ value: number; score: number }> = [];
            points.forEach((point, pointIndex) => {
              const pointPath = `${path}, point ${pointIndex + 1}`;
              if (!isObject(point)) {
                errors.push(`${pointPath} must be an object.`);
                return;
              }
              if (!isFiniteNumber(point.value)) {
                errors.push(`${pointPath} needs a finite input value.`);
              } else if (pointValues.has(point.value)) {
                errors.push(
                  `${pointPath} duplicates input value ${point.value}.`,
                );
              } else {
                pointValues.add(point.value);
              }
              if (!inRange(point.score, 0, 100)) {
                errors.push(`${pointPath} score must be between 0 and 100.`);
              }
              if (isFiniteNumber(point.value) && inRange(point.score, 0, 100)) {
                validPoints.push({ value: point.value, score: point.score });
              }
            });
            const direction = factor.monotonicDirection;
            const directionLabel = String(direction);
            if (!MONOTONIC_DIRECTIONS.has(direction as string)) {
              errors.push(
                `${path} must specify increasing or decreasing monotonic direction.`,
              );
            } else {
              const sorted = [...validPoints].sort(
                (left, right) => left.value - right.value,
              );
              for (
                let pointIndex = 1;
                pointIndex < sorted.length;
                pointIndex += 1
              ) {
                const previous = sorted[pointIndex - 1].score;
                const current = sorted[pointIndex].score;
                const invalid =
                  direction === "increasing"
                    ? current < previous
                    : current > previous;
                if (invalid) {
                  errors.push(
                    `${path} point scores must be monotonic ${directionLabel}.`,
                  );
                  break;
                }
              }
            }
          }
        } else {
          validateNumericRules(factor.rules, path, errors);
        }

        const alternatives = factor.alternativeNumericSources;
        if (alternatives != null) {
          if (scoringMethod !== "step") {
            errors.push(
              `${path} alternative numeric sources require step thresholds.`,
            );
          }
          if (!Array.isArray(alternatives) || alternatives.length === 0) {
            errors.push(
              `${path} alternative numeric sources must be a non-empty array.`,
            );
          } else if (alternatives.length > 4) {
            errors.push(
              `${path} cannot define more than four alternative numeric sources.`,
            );
          } else {
            alternatives.forEach((source, sourceIndex) => {
              const sourcePath = `${path}, alternative source ${sourceIndex + 1}`;
              if (!isObject(source)) {
                errors.push(`${sourcePath} must be an object.`);
                return;
              }
              if (
                !nonEmptyString(source.field) ||
                !fieldTypes.has(source.field)
              ) {
                errors.push(`${sourcePath} uses an unsupported field.`);
              } else {
                if (fieldTypes.get(source.field) !== "number") {
                  errors.push(`${sourcePath} must use a numeric field.`);
                }
                if (factorFields.has(source.field)) {
                  errors.push(
                    `${sourcePath} duplicates field ${source.field}.`,
                  );
                } else {
                  factorFields.add(source.field);
                }
              }
              if (!nonEmptyString(source.label)) {
                errors.push(`${sourcePath} needs a label.`);
              }
              validateNumericRules(source.rules, sourcePath, errors);
            });
          }
        }
      } else {
        if (factor.alternativeNumericSources != null) {
          errors.push(
            `${path} alternative numeric sources require a numeric factor.`,
          );
        }
        const mappings = factor.mappings;
        if (!Array.isArray(mappings) || mappings.length === 0) {
          errors.push(`${path} needs at least one value mapping.`);
          return;
        }
        if (mappings.length > 100)
          errors.push(`${path} has too many mappings.`);
        const mappingValues = new Set<string>();
        mappings.forEach((mapping, mappingIndex) => {
          const mappingPath = `${path}, mapping ${mappingIndex + 1}`;
          if (!isObject(mapping)) {
            errors.push(`${mappingPath} must be an object.`);
            return;
          }
          if (!nonEmptyString(mapping.label))
            errors.push(`${mappingPath} needs a label.`);
          if (!inRange(mapping.score, 0, 100))
            errors.push(`${mappingPath} score must be between 0 and 100.`);
          if (
            factor.fieldType === "boolean" &&
            mapping.value !== null &&
            typeof mapping.value !== "boolean"
          ) {
            errors.push(`${mappingPath} must map true, false or null.`);
          }
          const mappingKey = JSON.stringify(mapping.value);
          if (mappingValues.has(mappingKey))
            errors.push(`${mappingPath} duplicates a mapped value.`);
          else mappingValues.add(mappingKey);
        });
      }
    });
  }

  if (positiveEnabledWeight <= 0)
    errors.push("At least one enabled factor must have a positive weight.");

  const bands = value.bands;
  if (!Array.isArray(bands) || bands.length !== BAND_KEYS.length) {
    errors.push(
      "Score bands must define excellent, strong, standard, watch and weak.",
    );
  } else {
    const thresholds = new Map<string, number>();
    bands.forEach((band, index) => {
      if (!isObject(band)) {
        errors.push(`Band ${index + 1} must be an object.`);
        return;
      }
      if (!BAND_KEYS.includes(band.key as (typeof BAND_KEYS)[number]))
        errors.push(`Band ${index + 1} has an invalid key.`);
      else if (thresholds.has(band.key as string))
        errors.push(`Band key ${String(band.key)} is duplicated.`);
      else if (inRange(band.minScore, 0, 100))
        thresholds.set(band.key as string, band.minScore);
      else
        errors.push(
          `Band ${String(band.key)} minimum must be between 0 and 100.`,
        );
      if (!nonEmptyString(band.label))
        errors.push(`Band ${index + 1} needs a label.`);
    });
    if (BAND_KEYS.every((key) => thresholds.has(key))) {
      for (let index = 0; index < BAND_KEYS.length - 1; index += 1) {
        const current = thresholds.get(BAND_KEYS[index]) as number;
        const next = thresholds.get(BAND_KEYS[index + 1]) as number;
        if (current <= next) {
          errors.push(
            "Score-band minimums must descend from excellent to weak.",
          );
          break;
        }
      }
      if (thresholds.get("weak") !== 0)
        errors.push("The weak score band must start at 0.");
    }
  }

  const curve = value.rateCurve;
  if (!isObject(curve)) {
    errors.push("Rate curve must be an object.");
  } else {
    if (
      curve.pricingBasis != null &&
      curve.pricingBasis !== DISCOUNT_ENTITLEMENT_PRICING_BASIS
    ) {
      errors.push("Rate curve pricingBasis is unsupported.");
    }
    const curveFields = [
      ["neutralScore", 0, 100],
      ["discountSlope", 0, 100],
      ["loadingSlope", 0, 100],
      ["maxDiscount", 0, 100],
      ["maxLoading", 0, 100],
    ] as const;
    for (const [key, min, max] of curveFields) {
      if (!inRange(curve[key], min, max))
        errors.push(`Rate curve ${key} must be between ${min} and ${max}.`);
    }
    if (curve.neutralMargin != null && !inRange(curve.neutralMargin, 0, 100))
      errors.push("Rate curve neutralMargin must be between 0 and 100.");
    if (curve.maxDiscountBySecurity != null) {
      if (!isObject(curve.maxDiscountBySecurity)) {
        errors.push("Rate curve maxDiscountBySecurity must be an object.");
      } else {
        for (const securityType of ["secured", "unsecured"] as const) {
          if (
            !inRange(
              curve.maxDiscountBySecurity[securityType],
              0,
              MAX_GOVERNED_DISCOUNT_PCT,
            )
          ) {
            errors.push(
              `Rate curve maxDiscountBySecurity.${securityType} must be between 0 and ${MAX_GOVERNED_DISCOUNT_PCT}.`,
            );
          }
        }
      }
    }
    if (curve.pricingBasis === DISCOUNT_ENTITLEMENT_PRICING_BASIS) {
      if (
        !Number.isInteger(curve.neutralScore) ||
        !inRange(curve.neutralScore, 0, MAX_DISCOUNT_THRESHOLD_SCORE)
      ) {
        errors.push(
          `Discount-only pricing threshold must be a whole score between 0 and ${MAX_DISCOUNT_THRESHOLD_SCORE}.`,
        );
      }
      if (!inRange(curve.maxDiscount, 0, MAX_GOVERNED_DISCOUNT_PCT)) {
        errors.push(
          `Discount-only pricing maximum discount must be between 0 and ${MAX_GOVERNED_DISCOUNT_PCT}.`,
        );
      }
      if (curve.loadingSlope !== 0 || curve.maxLoading !== 0) {
        errors.push("Discount-only pricing cannot define a loading.");
      }
      if ((curve.neutralMargin ?? 0) !== 0) {
        errors.push("Discount-only pricing cannot define a neutral margin.");
      }
      if (
        isFiniteNumber(curve.maxDiscount) &&
        isFiniteNumber(curve.discountSlope) &&
        isFiniteNumber(curve.neutralScore) &&
        curve.neutralScore < MAX_CUSTOMER_SCORE &&
        Math.abs(
          curve.discountSlope -
            curve.maxDiscount / (MAX_CUSTOMER_SCORE - curve.neutralScore),
        ) > 0.000000001
      ) {
        errors.push(
          "Discount-only pricing slope must spread the maximum discount evenly from the governed threshold to score 100.",
        );
      }
    }
  }

  return errors;
}

export function assertValidScoreModelBody(
  value: unknown,
  allowedFields: readonly ScoreModelFieldDefinition[],
): void {
  const errors = scoreModelValidationErrors(value, allowedFields);
  if (errors.length > 0) {
    throw new Error(`Invalid score model: ${errors.slice(0, 6).join(" ")}`);
  }
}

const POLICY_REQUIRED_FIELDS = {
  home: [
    "customerStream",
    "vipCustomer",
    "competitorRate",
    "requestedRate",
    "brokerInRegion",
    "brokerVolumeBand",
    "brokerDiscretionPct",
  ],
  personal: [
    "customerStream",
    "yearsAsMember",
    "requestedRate",
    "brokerInRegion",
    "brokerVolumeBand",
    "brokerDiscretionPct",
  ],
  commercial: [
    "largestCustomerRevenueAboveThreshold",
    "operatingInRegion",
    "vipCustomer",
    "requestedRate",
  ],
} as const;

const VERSIONED_POLICY_REQUIRED_FIELDS = {
  home: [{ fromVersion: 6, fields: ["channel"] }],
  personal: [
    { fromVersion: 5, fields: ["competitorRate", "requestedReason"] },
    { fromVersion: 8, fields: ["channel"] },
  ],
  commercial: [
    { fromVersion: 7, fields: ["competitorRate", "requestedReason"] },
  ],
} as const;

const DISCOUNT_ONLY_POLICY = {
  home: { fromVersion: 5 },
  personal: { fromVersion: 7 },
  commercial: { fromVersion: 9 },
} as const;

const MARKET_PARITY_FIELD_DEFINITIONS = {
  home: [{ field: "channel", fieldType: "enum" }],
  personal: [
    { field: "competitorRate", fieldType: "number" },
    { field: "requestedReason", fieldType: "enum" },
    { field: "channel", fieldType: "enum" },
  ],
  commercial: [
    { field: "competitorRate", fieldType: "number" },
    { field: "requestedReason", fieldType: "enum" },
  ],
} as const satisfies Record<
  CustomerScoreProductArea,
  readonly ScoreModelFieldDefinition[]
>;

const POLICY_FORBIDDEN_FIELDS = {
  home: [
    "existingMember",
    "retentionScenario",
    "newToBankGrowthOpportunity",
    "employmentIncomeStability",
    "serviceabilityStatus",
    "salaryCreditedToLender",
    "salaryCreditedAmount",
    "existingTransactionOrSavingsAccount",
    "multipleLenderProducts",
  ],
  personal: ["existingMember"],
  commercial: ["customerConcentrationPct", "depositAndSavingsBalances"],
} as const;

export function scoreModelPolicyContractErrors(
  productArea: CustomerScoreProductArea,
  value: unknown,
  modelVersion?: number | null,
): string[] {
  if (!isObject(value) || !Array.isArray(value.factors)) {
    return ["Score model factors are required for policy contract validation."];
  }
  const enabled = value.factors.filter(
    (factor): factor is Record<string, unknown> =>
      isObject(factor) && factor.enabled === true,
  );
  const errors: string[] = [];
  const fields = new Set(
    enabled.flatMap((factor) =>
      typeof factor.field === "string" ? [factor.field] : [],
    ),
  );
  const versionedRequirements = VERSIONED_POLICY_REQUIRED_FIELDS[productArea];
  const requiredFields = [
    ...POLICY_REQUIRED_FIELDS[productArea],
    ...versionedRequirements.flatMap((requirement) =>
      modelVersion == null || modelVersion >= requirement.fromVersion
        ? requirement.fields
        : [],
    ),
  ];
  for (const field of requiredFields) {
    if (!fields.has(field)) {
      errors.push(
        `${productArea} score policy requires enabled factor ${field}.`,
      );
    }
  }
  for (const field of POLICY_FORBIDDEN_FIELDS[productArea]) {
    if (fields.has(field)) {
      errors.push(
        `${productArea} score policy cannot enable legacy factor ${field}.`,
      );
    }
  }
  const homeIncomeAlternativeRequired =
    productArea === "home" && (modelVersion == null || modelVersion >= 8);
  if (homeIncomeAlternativeRequired) {
    const incomeFactor = enabled.find(
      (factor) => factor.field === "grossAnnualIncome",
    );
    const alternatives = Array.isArray(incomeFactor?.alternativeNumericSources)
      ? incomeFactor.alternativeNumericSources
      : [];
    if (
      !incomeFactor ||
      !alternatives.some(
        (source) => isObject(source) && source.field === "serviceabilityNsi",
      )
    ) {
      errors.push(
        "home score policy v8+ requires Serviceability NSI as an alternative source on the Gross annual income factor.",
      );
    }
  }
  const personalSecurityCapsRequired =
    productArea === "personal" && (modelVersion == null || modelVersion >= 8);
  const discountPolicy = DISCOUNT_ONLY_POLICY[productArea];
  if (modelVersion == null || modelVersion >= discountPolicy.fromVersion) {
    const curve = isObject(value.rateCurve) ? value.rateCurve : null;
    if (curve?.pricingBasis !== DISCOUNT_ENTITLEMENT_PRICING_BASIS) {
      errors.push(
        `${productArea} score policy v${discountPolicy.fromVersion}+ requires discount-only pricing.`,
      );
    }
    if (personalSecurityCapsRequired && curve) {
      const caps = isObject(curve.maxDiscountBySecurity)
        ? curve.maxDiscountBySecurity
        : null;
      if (
        !isFiniteNumber(caps?.secured) ||
        !isFiniteNumber(caps?.unsecured) ||
        curve.maxDiscount !== caps.secured
      ) {
        errors.push(
          "personal discount-only pricing v8+ requires governed secured and unsecured caps, with maxDiscount matching the secured cap.",
        );
      }
    }
  }
  return errors;
}

export function assertScoreModelPolicyContract(
  productArea: CustomerScoreProductArea,
  value: unknown,
  modelVersion?: number | null,
): void {
  const errors = scoreModelPolicyContractErrors(
    productArea,
    value,
    modelVersion,
  );
  if (errors.length > 0) {
    throw new Error(`Invalid score policy contract: ${errors.join(" ")}`);
  }
}

export function resolvePolicyScoreModel(
  productArea: CustomerScoreProductArea,
  candidate: CustomerScoreModelConfig,
  fallbackModel: CustomerScoreModelConfig,
  sourceValue: unknown = candidate,
): {
  scoreModel: CustomerScoreModelConfig;
  fallback: boolean;
  errors: string[];
} {
  const errors =
    candidate.id == null
      ? [`No active governed ${productArea} score model is available.`]
      : [
          ...scoreModelValidationErrors(sourceValue, [
            ...fallbackModel.factors.flatMap(
              ({ field, fieldType, alternativeNumericSources }) => [
                { field, fieldType },
                ...(alternativeNumericSources ?? []).map((source) => ({
                  field: source.field,
                  fieldType: "number" as const,
                })),
              ],
            ),
            ...MARKET_PARITY_FIELD_DEFINITIONS[productArea],
          ]),
          ...scoreModelPolicyContractErrors(
            productArea,
            sourceValue,
            candidate.version,
          ),
        ];
  return errors.length > 0
    ? { scoreModel: fallbackModel, fallback: true, errors }
    : { scoreModel: candidate, fallback: false, errors: [] };
}
