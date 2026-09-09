import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
type QuoteVertical = "home" | "personal" | "commercial";
import {
  expectedLossPolicyValidationErrors,
  type ExpectedLossPolicyConfig,
} from "./credit-risk/policy-validation";
import type { PolicyComponentFallbacks, PricingPolicySnapshot } from "./types";

type SnapshotInput = Omit<
  PricingPolicySnapshot,
  "schemaVersion" | "capturedAt" | "bundleToken" | "componentValueHash"
> & { componentValues: unknown };

function sorted(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function canonicalValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalValue(record[key])]),
    );
  }
  return value;
}

function hashValue(value: unknown): string {
  return bytesToHex(
    sha256(new TextEncoder().encode(JSON.stringify(canonicalValue(value)))),
  );
}

export function buildPricingPolicySnapshot(
  input: SnapshotInput,
  now: Date = new Date(),
): PricingPolicySnapshot {
  const { componentValues, ...snapshot } = input;
  const normalized = {
    ...snapshot,
    adjustmentRuleIds: sorted(input.adjustmentRuleIds),
    marginSettingIds: sorted(input.marginSettingIds),
    approvalSettingIds: sorted(input.approvalSettingIds),
    profitabilityDefaultIds: sorted(input.profitabilityDefaultIds),
    componentFallbacks: { ...input.componentFallbacks },
  };
  const componentValueHash = hashValue(componentValues);
  const digest = hashValue({
    schemaVersion: 1,
    componentValueHash,
    ...normalized,
  });
  return {
    schemaVersion: 1,
    capturedAt: now.toISOString(),
    bundleToken: `policy-bundle-v1:${digest}`,
    componentValueHash,
    ...normalized,
  };
}

export function fallbackPolicyComponents(
  snapshot: PricingPolicySnapshot | null | undefined,
): Array<keyof PolicyComponentFallbacks> {
  if (!snapshot) return [];
  return (
    Object.entries(snapshot.componentFallbacks) as Array<
      [keyof PolicyComponentFallbacks, boolean]
    >
  )
    .filter(([, fallback]) => fallback)
    .map(([component]) => component);
}

export function expectedLossPolicyRequiresFallback(
  policy: ExpectedLossPolicyConfig | null | undefined,
  expected: {
    vertical: QuoteVertical;
    scoreModelVersion: number;
    riskDefinitionHash: string;
  },
): boolean {
  if (!policy) return true;

  try {
    return (
      expectedLossPolicyValidationErrors(policy).length > 0 ||
      policy.vertical !== expected.vertical ||
      policy.sourceScoreModelArea !== expected.vertical ||
      policy.sourceScoreModelVersion !== expected.scoreModelVersion ||
      policy.compatibleRiskDefinitionHash !== expected.riskDefinitionHash
    );
  } catch {
    // An incompletely loaded or malformed component is always a fallback. A
    // calculator can still disclose provisional P&L, but release readiness
    // must not mistake the component for governed policy.
    return true;
  }
}
