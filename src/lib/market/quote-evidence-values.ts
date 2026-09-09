export type MarketQuoteEvidenceBase = {
  marketRateId: string;
  marketProductId: string;
  lender: string;
  productName: string;
  cdrProductId: string;
  rateCriteria: {
    lendingRateType: string;
    loanPurpose: string | null;
    repaymentType: string | null;
    fixedPeriodMonths: number | null;
    minLvr: number | null;
    maxLvr: number | null;
  };
  advertisedRate: number;
  comparisonRate: number | null;
  evidenceUrl: string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  capturedAt: string;
};

export type MarketQuoteEvidenceV1 = MarketQuoteEvidenceBase & {
  version: 1;
};

export type MarketQuoteEvidenceV2 = MarketQuoteEvidenceBase & {
  version: 2;
  vertical: "home" | "personal" | "commercial";
  productCategory: string;
};

export type MarketQuoteEvidence = MarketQuoteEvidenceV1 | MarketQuoteEvidenceV2;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedString(
  value: unknown,
  max: number,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): string | null {
  return typeof value === "string" &&
    value.length <= max &&
    (allowEmpty || value.length > 0)
    ? value
    : null;
}

function nullableString(
  value: unknown,
  max: number,
): string | null | undefined {
  if (value === null) return null;
  return boundedString(value, max, { allowEmpty: true }) ?? undefined;
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

function nullableNumber(
  value: unknown,
  min: number,
  max: number,
  integer = false,
): number | null | undefined {
  if (value === null) return null;
  const parsed = boundedNumber(value, min, max);
  return parsed !== null && (!integer || Number.isInteger(parsed))
    ? parsed
    : undefined;
}

function isoDateTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return null;
  }
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function nullableIsoDateTime(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isoDateTime(value) ?? undefined;
}

function httpUrl(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 2_048) return undefined;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseEvidence(value: unknown): MarketQuoteEvidence | null {
  const data = record(value);
  const rateCriteria = record(data?.rateCriteria);
  if (!data || !rateCriteria) return null;

  const marketRateId = boundedString(data.marketRateId, 128);
  const marketProductId = boundedString(data.marketProductId, 128);
  const lender = boundedString(data.lender, 240);
  const productName = boundedString(data.productName, 500);
  const cdrProductId = boundedString(data.cdrProductId, 240);
  const lendingRateType = boundedString(rateCriteria.lendingRateType, 160);
  const loanPurpose = nullableString(rateCriteria.loanPurpose, 160);
  const repaymentType = nullableString(rateCriteria.repaymentType, 160);
  const fixedPeriodMonths = nullableNumber(
    rateCriteria.fixedPeriodMonths,
    1,
    Number.MAX_SAFE_INTEGER,
    true,
  );
  const minLvr = nullableNumber(rateCriteria.minLvr, 0, 1_000);
  const maxLvr = nullableNumber(rateCriteria.maxLvr, 0, 1_000);
  const advertisedRate = boundedNumber(data.advertisedRate, 0, 100);
  const comparisonRate = nullableNumber(data.comparisonRate, 0, 100);
  const evidenceUrl = httpUrl(data.evidenceUrl);
  const sourceUpdatedAt = nullableIsoDateTime(data.sourceUpdatedAt);
  const fetchedAt = isoDateTime(data.fetchedAt);
  const capturedAt = isoDateTime(data.capturedAt);

  if (
    !marketRateId ||
    !marketProductId ||
    !lender ||
    !productName ||
    !cdrProductId ||
    !lendingRateType ||
    loanPurpose === undefined ||
    repaymentType === undefined ||
    fixedPeriodMonths === undefined ||
    minLvr === undefined ||
    maxLvr === undefined ||
    advertisedRate === null ||
    comparisonRate === undefined ||
    evidenceUrl === undefined ||
    sourceUpdatedAt === undefined ||
    !fetchedAt ||
    !capturedAt
  ) {
    return null;
  }

  const base: MarketQuoteEvidenceBase = {
    marketRateId,
    marketProductId,
    lender,
    productName,
    cdrProductId,
    rateCriteria: {
      lendingRateType,
      loanPurpose,
      repaymentType,
      fixedPeriodMonths,
      minLvr,
      maxLvr,
    },
    advertisedRate,
    comparisonRate,
    evidenceUrl,
    sourceUpdatedAt,
    fetchedAt,
    capturedAt,
  };

  if (data.version === 1) return { ...base, version: 1 };
  const productCategory = boundedString(data.productCategory, 160);
  if (
    data.version === 2 &&
    (data.vertical === "home" ||
      data.vertical === "personal" ||
      data.vertical === "commercial") &&
    productCategory
  ) {
    return {
      ...base,
      version: 2,
      vertical: data.vertical,
      productCategory,
    };
  }
  return null;
}

/**
 * Browser-safe evidence validation for JSON import. API and persistence
 * boundaries continue to use the Zod schemas in quote-evidence-schema.ts.
 */
export function marketQuoteEvidenceFromJson(
  value: unknown,
): MarketQuoteEvidence | null {
  if (typeof value === "string") {
    try {
      return parseEvidence(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return parseEvidence(value);
}

export function marketEvidenceCompetitorNotes(
  evidence: MarketQuoteEvidence,
): string {
  const parts = [
    `${evidence.productName} (CDR ${evidence.cdrProductId})`,
    `market rate ${evidence.marketRateId}`,
    evidence.evidenceUrl ? `source ${evidence.evidenceUrl}` : null,
    `fetched ${evidence.fetchedAt}`,
  ].filter((part): part is string => Boolean(part));
  return parts.join("; ").slice(0, 2_000);
}
