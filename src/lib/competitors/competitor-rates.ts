import type {
  CdrLendingRate,
  CdrProductDetail,
  CompetitorRate,
  CompetitorRateMatch,
  CompetitorRateScenario,
} from "./types";

function round(value: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((value + Number.EPSILON) * f) / f;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPercentPoints(
  value: string | number | null | undefined,
): number | null {
  const n = toNumber(value);
  if (n == null) return null;
  return n > 0 && n <= 1 ? round(n * 100, 4) : n;
}

function lvrFor(scenario: CompetitorRateScenario): number | null {
  if (!(scenario.loanAmount >= 0) || !(scenario.propertyValue > 0)) return null;
  return round((scenario.loanAmount / scenario.propertyValue) * 100, 2);
}

function rateTypeFromCdr(
  value: string | null | undefined,
): CompetitorRate["rateType"] | null {
  const upper = value?.toUpperCase() ?? "";
  if (upper.includes("VARIABLE")) return "variable";
  if (upper.includes("FIXED")) return "fixed";
  return null;
}

function fixedMonthsFromRate(rate: CdrLendingRate): number | null {
  const text =
    `${rate.lendingRateType ?? ""} ${rate.additionalInfo ?? ""}`.toLowerCase();
  const years = text.match(/(\d+(?:\.\d+)?)\s*(?:year|yr)/);
  if (years) return Math.round(Number(years[1]) * 12);
  const months = text.match(/(\d+)\s*(?:month|mth)/);
  if (months) return Number(months[1]);
  return null;
}

function loanPurposeFromCdr(
  value: string | null | undefined,
): CompetitorRate["loanPurpose"] {
  const upper = value?.toUpperCase() ?? "";
  if (upper.includes("OWNER")) return "owner_occupied";
  if (upper.includes("INVEST")) return "investment";
  return null;
}

function repaymentTypeFromCdr(
  value: string | null | undefined,
): CompetitorRate["repaymentType"] {
  const upper = value?.toUpperCase() ?? "";
  if (upper.includes("PRINCIPAL") || upper.includes("P_AND_I")) {
    return "principal_and_interest";
  }
  return null;
}

function lvrTier(rate: CdrLendingRate): {
  minLvr: number | null;
  maxLvr: number | null;
} {
  const percentTiers = (rate.tiers ?? []).filter((t) => {
    const name = t.name?.toLowerCase() ?? "";
    const unit = t.unitOfMeasure?.toUpperCase() ?? "";
    return unit === "PERCENT" || name.includes("lvr");
  });
  if (percentTiers.length === 0) return { minLvr: null, maxLvr: null };

  const mins = percentTiers
    .map((t) => toPercentPoints(t.minimumValue))
    .filter((v): v is number => v != null);
  const maxes = percentTiers
    .map((t) => toPercentPoints(t.maximumValue))
    .filter((v): v is number => v != null);

  return {
    minLvr: mins.length ? Math.min(...mins) : null,
    maxLvr: maxes.length ? Math.max(...maxes) : null,
  };
}

export function normaliseCdrProduct(
  product: CdrProductDetail,
  source: { sourceName: string; fetchedAt: Date },
): CompetitorRate[] {
  const productName = product.name ?? product.displayName ?? "Unnamed product";
  const sourceUrl =
    product.additionalInformation?.overviewUri ??
    product.additionalInformation?.termsUri ??
    null;

  const rows: Array<CompetitorRate | null> = (product.lendingRates ?? []).map(
    (rate) => {
      const advertisedRate = toPercentPoints(rate.rate);
      const rateType = rateTypeFromCdr(rate.lendingRateType);
      if (advertisedRate == null || rateType == null) return null;

      const tier = lvrTier(rate);
      return {
        lenderName: product.brandName ?? source.sourceName,
        productName,
        cdrProductId: product.productId ?? null,
        loanPurpose: loanPurposeFromCdr(rate.loanPurpose),
        rateType,
        fixedPeriodMonths:
          rateType === "fixed" ? fixedMonthsFromRate(rate) : null,
        repaymentType: repaymentTypeFromCdr(rate.repaymentType),
        minLvr: tier.minLvr,
        maxLvr: tier.maxLvr,
        advertisedRate,
        comparisonRate: toPercentPoints(rate.comparisonRate),
        sourceUrl: rate.additionalInfoUri ?? sourceUrl,
        sourceUpdatedAt: product.lastUpdated ?? null,
        fetchedAt: source.fetchedAt.toISOString(),
      } satisfies CompetitorRate;
    },
  );

  return rows.filter((row): row is CompetitorRate => row != null);
}

function matchesScenario(
  scenario: CompetitorRateScenario,
  row: CompetitorRate,
  lvr: number,
): boolean {
  if (row.loanPurpose != null && row.loanPurpose !== scenario.loanPurpose)
    return false;
  if (row.rateType !== scenario.rateType) return false;
  if (
    scenario.rateType === "fixed" &&
    row.fixedPeriodMonths != null &&
    row.fixedPeriodMonths !== scenario.fixedPeriodMonths
  ) {
    return false;
  }
  if (row.repaymentType != null && row.repaymentType !== scenario.repaymentType)
    return false;
  if (row.minLvr != null && lvr < row.minLvr) return false;
  if (row.maxLvr != null && lvr > row.maxLvr) return false;
  return true;
}

function deterministicRateOrder(a: CompetitorRate, b: CompetitorRate): number {
  if (a.advertisedRate !== b.advertisedRate) {
    return a.advertisedRate - b.advertisedRate;
  }
  const comparisonA = a.comparisonRate ?? Number.POSITIVE_INFINITY;
  const comparisonB = b.comparisonRate ?? Number.POSITIVE_INFINITY;
  if (comparisonA !== comparisonB) return comparisonA - comparisonB;
  return (
    a.lenderName.localeCompare(b.lenderName, "en-AU") ||
    a.productName.localeCompare(b.productName, "en-AU") ||
    (a.cdrProductId ?? "").localeCompare(b.cdrProductId ?? "", "en-AU")
  );
}

export function findBestCompetitorRate(
  scenario: CompetitorRateScenario,
  rows: CompetitorRate[],
  suggestedRate: number | null,
): CompetitorRateMatch | null {
  const lvr = lvrFor(scenario);
  if (lvr == null) return null;

  const matches = rows.filter((row) => matchesScenario(scenario, row, lvr));
  // Public CDR evidence is canonical. Governed manual rows remain a fallback
  // only when no external row matches the complete quote scenario.
  const externalMatches = matches.filter((row) => row.origin !== "manual");
  const candidates = externalMatches.length
    ? externalMatches
    : matches.filter((row) => row.origin === "manual");
  candidates.sort(deterministicRateOrder);

  const best = candidates[0];
  if (!best || suggestedRate == null) return null;

  return {
    ...best,
    lvr,
    rateGap: round(suggestedRate - best.advertisedRate, 4),
    matchCount: candidates.length,
  };
}
