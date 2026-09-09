export type QuoteParameterKind = "input" | "result";

export interface QuoteParameterSearchItem<TTarget = unknown> {
  key: string;
  label: string;
  aliases: readonly string[];
  group: string;
  kind: QuoteParameterKind;
  value: string;
  target: TTarget;
}

export type QuoteParameterControlSnapshot =
  | { kind: "text"; value: string }
  | { kind: "select"; selected: readonly string[] }
  | { kind: "radio"; checkedLabel?: string }
  | {
      kind: "checkbox";
      checked: boolean;
      label?: string;
      booleanValue: boolean;
    };

const PARAMETER_ALIASES: Record<string, readonly string[]> = {
  "credit score": ["equifax", "score"],
  "credit scores": ["equifax", "score"],
  "average credit score": ["equifax", "credit score", "score"],
  "individual credit scores": ["equifax", "credit score", "score"],
  "overall score": ["customer score", "score"],
  "score band": ["customer score band", "score"],
  "score pricing adjustment": ["customer score adjustment", "score"],
  "customer score adjustment": ["score pricing adjustment", "score"],
  lvr: ["loan to value", "loan to value ratio"],
  "dti ratio": ["dti", "debt to income", "debt to income ratio"],
  "debt to income ratio": ["dti", "dti ratio"],
  "debt service cover": [
    "dscr",
    "debt service coverage",
    "debt service coverage ratio",
  ],
  "expected credit loss": ["ecl", "expected loss"],
  "effective ecl provisional": ["ecl", "expected credit loss"],
  "effective ecl authorised override": ["ecl", "expected credit loss"],
  "governed model ecl": ["ecl", "expected credit loss"],
  "probability of default": ["pd", "credit risk"],
  "loss given default": ["lgd", "credit risk"],
  "exposure at default": ["ead", "credit risk"],
  "net interest margin": ["nim", "margin"],
  "return on assets": ["roa"],
  "roa on loan amount": ["roa", "return on assets"],
  roa: ["return on assets"],
  "indicative roe": ["roe", "return on equity"],
  "return on equity": ["roe"],
  "risk weighted assets": ["rwa", "capital"],
  "risk weight": ["rwa", "capital risk weight"],
  "capital ratio": ["capital adequacy ratio"],
  "allocated capital": ["capital allocation"],
  abn: ["australian business number", "business number"],
  ebitda: [
    "earnings before interest tax depreciation and amortisation",
    "cash flow",
  ],
  "cost of funds": ["cof", "funding cost"],
  "suggested rate": ["recommended rate", "customer rate"],
  "indicative rate": ["customer rate", "commercial rate"],
  "monthly repayment": ["repayment", "monthly payment"],
  "fortnightly repayment": ["repayment", "fortnightly payment"],
  approval: ["approval requirement", "review status"],
  "approval requirement": ["approval", "review status"],
  "gross annual income": ["income", "annual income"],
  "net monthly income": ["income", "monthly income"],
  "living expenses": ["expenses", "monthly expenses"],
  "existing debt repayments": ["debt repayments", "commitments"],
  "security coverage": ["collateral coverage", "security"],
  "total security coverage": ["collateral coverage", "security coverage"],
};

export function normalizeParameterSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function aliasesForParameter(label: string): readonly string[] {
  const normalized = normalizeParameterSearchText(label);
  const direct = PARAMETER_ALIASES[normalized] ?? [];
  const inherited = Object.entries(PARAMETER_ALIASES).flatMap(
    ([canonical, aliases]) =>
      canonical !== normalized && normalized.includes(canonical) ? aliases : [],
  );
  return [...new Set([...direct, ...inherited])];
}

function includesEveryToken(candidate: string, query: string): boolean {
  const tokens = query.split(" ").filter(Boolean);
  return (
    tokens.length > 0 && tokens.every((token) => candidate.includes(token))
  );
}

export function parameterMatchRank(
  item: Pick<QuoteParameterSearchItem, "label" | "aliases">,
  rawQuery: string,
): number | null {
  const query = normalizeParameterSearchText(rawQuery);
  if (!query) return null;

  const label = normalizeParameterSearchText(item.label);
  const aliases = item.aliases.map(normalizeParameterSearchText);
  if (label === query) return 0;
  if (aliases.some((alias) => alias === query)) return 1;
  if (label.startsWith(query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (label.includes(query)) return 4;
  if (aliases.some((alias) => alias.includes(query))) return 5;
  const combined = [label, ...aliases].join(" ");
  return includesEveryToken(combined, query) ? 6 : null;
}

export function rankParameterSearchItems<TTarget>(
  items: readonly QuoteParameterSearchItem<TTarget>[],
  query: string,
): QuoteParameterSearchItem<TTarget>[] {
  return items
    .map((item, index) => ({
      item,
      index,
      rank: parameterMatchRank(item, query),
    }))
    .filter(
      (candidate): candidate is typeof candidate & { rank: number } =>
        candidate.rank != null,
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.item.label.localeCompare(b.item.label) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}

export function groupParameterSearchItems<TTarget>(
  items: readonly QuoteParameterSearchItem<TTarget>[],
): {
  inputs: QuoteParameterSearchItem<TTarget>[];
  results: QuoteParameterSearchItem<TTarget>[];
} {
  return {
    inputs: items.filter((item) => item.kind === "input"),
    results: items.filter((item) => item.kind === "result"),
  };
}

export function dedupeParameterSearchItems<TTarget>(
  items: readonly QuoteParameterSearchItem<TTarget>[],
): QuoteParameterSearchItem<TTarget>[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const identity = [item.kind, item.label, item.group, item.value].join("|");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function parameterValueFromControlSnapshots(
  snapshots: readonly QuoteParameterControlSnapshot[],
  fallback = "",
): string {
  const values = snapshots.flatMap((snapshot) => {
    if (snapshot.kind === "text")
      return snapshot.value.trim() ? [snapshot.value] : [];
    if (snapshot.kind === "select") return snapshot.selected;
    if (snapshot.kind === "radio") {
      return snapshot.checkedLabel ? [snapshot.checkedLabel] : [];
    }
    if (snapshot.booleanValue) return [snapshot.checked ? "Yes" : "No"];
    return snapshot.checked && snapshot.label ? [snapshot.label] : [];
  });
  const unique = [
    ...new Set(values.map((value) => compactParameterValue(value))),
  ];
  return compactParameterValue(
    unique.length > 0 ? unique.join(", ") : fallback,
  );
}

export function compactParameterValue(value: string, maxLength = 84): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Not provided";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
