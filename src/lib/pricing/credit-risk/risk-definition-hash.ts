import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  CustomerScoreFactorConfig,
  CustomerScoreModelConfig,
  CustomerScoreProductArea,
} from "../types";

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function riskFactorDefinition(
  factor: CustomerScoreFactorConfig,
  total: number,
) {
  return {
    key: factor.key,
    field: factor.field,
    fieldType: factor.fieldType,
    normalisedRiskWeight:
      Math.round((factor.weight / total) * 1_000_000_000_000) /
      1_000_000_000_000,
    missingScore: factor.missingScore,
    scoringMethod: factor.scoringMethod ?? "step",
    monotonicDirection: factor.monotonicDirection ?? null,
    points:
      factor.scoringMethod === "linear_points"
        ? [...(factor.points ?? [])].sort(
            (left, right) => left.value - right.value,
          )
        : [],
    // Rule order is semantic: the first matching rule wins.
    rules: factor.scoringMethod === "linear_points" ? [] : (factor.rules ?? []),
    mappings: factor.mappings ?? [],
  };
}

export function eligibleRiskFactors(
  model: CustomerScoreModelConfig,
  eligibleFields: ReadonlySet<string>,
): CustomerScoreFactorConfig[] {
  return model.factors.filter(
    (factor) =>
      factor.enabled &&
      factor.category === "risk" &&
      eligibleFields.has(factor.field) &&
      Number.isFinite(factor.weight) &&
      factor.weight > 0,
  );
}

export function riskDefinitionHash(input: {
  model: CustomerScoreModelConfig;
  productArea: CustomerScoreProductArea;
  eligibleFields: ReadonlySet<string>;
  factDerivationVersion: string;
  factDerivationConfig?: unknown;
}): string {
  const factors = eligibleRiskFactors(input.model, input.eligibleFields);
  const total = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const canonical = {
    schemaVersion: 1,
    productArea: input.productArea,
    factDerivationVersion: input.factDerivationVersion,
    factDerivationConfig: input.factDerivationConfig ?? null,
    factors:
      total > 0
        ? factors
            .map((factor) => riskFactorDefinition(factor, total))
            .sort(
              (left, right) =>
                left.field.localeCompare(right.field) ||
                left.key.localeCompare(right.key),
            )
        : [],
  };
  return bytesToHex(sha256(new TextEncoder().encode(canonicalJson(canonical))));
}
