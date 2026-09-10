export const ADMIN_CONFIG_SEARCH_PAGE_SIZE = 25;
const ADMIN_CONFIG_SEARCH_QUERY_MAX_LENGTH = 120;

export const ADMIN_CONFIG_SEARCH_AREAS = [
  "all",
  "home",
  "personal",
  "commercial",
  "market",
  "global",
] as const;

export const ADMIN_CONFIG_SEARCH_KINDS = ["all", "page", "setting"] as const;

export type AdminConfigSearchArea = (typeof ADMIN_CONFIG_SEARCH_AREAS)[number];
export type AdminConfigResultArea = Exclude<AdminConfigSearchArea, "all">;
export type AdminConfigSearchKind = (typeof ADMIN_CONFIG_SEARCH_KINDS)[number];
export type AdminConfigResultKind = Exclude<AdminConfigSearchKind, "all">;

export type AdminConfigSearchParams = {
  q: string;
  area: AdminConfigSearchArea;
  kind: AdminConfigSearchKind;
  page: number;
};

export type AdminConfigSearchDocument = {
  id: string;
  kind: AdminConfigResultKind;
  area: AdminConfigResultArea;
  section: string;
  title: string;
  summary: string;
  href: string;
  keywords?: readonly string[];
  active?: boolean;
  recordId?: number;
};

export type AdminConfigSearchResult = Omit<
  AdminConfigSearchDocument,
  "keywords"
> & {
  score: number;
};

export type AdminConfigSearchResponse = {
  results: AdminConfigSearchResult[];
  total: number;
  page: number;
  pageCount: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const AREA_ORDER: Record<AdminConfigResultArea, number> = {
  home: 0,
  personal: 1,
  commercial: 2,
  market: 3,
  global: 4,
};

export const ADMIN_CONFIG_AREA_LABELS: Record<AdminConfigResultArea, string> = {
  home: "Home loans",
  personal: "Personal loans",
  commercial: "Commercial loans",
  market: "Market Search",
  global: "Global",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function oneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  return allowed.find((option) => option === value) ?? fallback;
}

export function parseAdminConfigSearchParams(
  raw: RawSearchParams,
): AdminConfigSearchParams {
  const requestedPage = Number(first(raw.page));
  return {
    q: first(raw.q).trim().slice(0, ADMIN_CONFIG_SEARCH_QUERY_MAX_LENGTH),
    area: oneOf(first(raw.area), ADMIN_CONFIG_SEARCH_AREAS, "all"),
    kind: oneOf(first(raw.kind), ADMIN_CONFIG_SEARCH_KINDS, "all"),
    page:
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

export function adminConfigSearchHref(
  filters: AdminConfigSearchParams,
  overrides: Partial<AdminConfigSearchParams> = {},
): string {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.area !== "all") params.set("area", next.area);
  if (next.kind !== "all") params.set("kind", next.kind);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/admin/search/?${query}` : "/admin/search/";
}

export function adminConfigTargetId(
  scope: string,
  key: string | number,
): string {
  const slug = `${scope}-${key}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `config-${slug}`;
}

export function adminConfigTargetHref(
  pathname: string,
  scope: string,
  key: string | number,
  query?: Record<string, string>,
): string {
  const params = new URLSearchParams(query);
  const suffix = params.size ? `?${params.toString()}` : "";
  return `${pathname.replace(/\/$/, "")}/${suffix}#${adminConfigTargetId(scope, key)}`;
}

export function normalizeAdminConfigSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/\\|–—-]+/g, " ")
    .replace(/[^a-z0-9.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function page(
  id: string,
  area: AdminConfigResultArea,
  section: string,
  title: string,
  summary: string,
  href: string,
  keywords: readonly string[] = [],
): AdminConfigSearchDocument {
  return {
    id,
    kind: "page",
    area,
    section,
    title,
    summary,
    href,
    keywords,
  };
}

export const ADMIN_CONFIG_PAGE_DOCUMENTS: readonly AdminConfigSearchDocument[] =
  [
    page(
      "page-admin-overview",
      "global",
      "Configuration",
      "Admin overview",
      "Configuration totals and links to every administration area.",
      "/admin",
      ["configuration dashboard", "administration"],
    ),
    page(
      "page-home-overview",
      "home",
      "Home loan configuration",
      "Home loan configuration",
      "Products, pricing decisions and economics.",
      "/admin/home-loans",
    ),
    page(
      "page-home-products",
      "home",
      "Product and rate data",
      "Home loan products",
      "Products, loan purposes, rate types, limits, LVRs and display-only fees.",
      "/admin/home-loans/products",
      ["catalogue", "owner occupied", "investment", "fixed", "variable"],
    ),
    page(
      "page-home-rates",
      "home",
      "Product and rate data",
      "Home loan carded rates",
      "Carded rates and LVR bands by home loan product.",
      "/admin/home-loans/rates",
      ["rate bands", "comparison rate"],
    ),
    page(
      "page-home-rules",
      "home",
      "Pricing decisions",
      "Home loan discount rules",
      "Rate adjustments, conditions, priorities and approval flags.",
      "/admin/home-loans/rules",
      ["pricing adjustment", "discount", "loading"],
    ),
    page(
      "page-home-score-model",
      "home",
      "Pricing decisions",
      "Home loan score model",
      "Customer score factors, weights, bands and rate curve.",
      "/admin/home-loans/score-model",
      ["customer score", "factor weights", "rate curve"],
    ),
    page(
      "page-home-approval",
      "home",
      "Pricing decisions",
      "Home loan approval rules",
      "Exception-routing thresholds and approval levels.",
      "/admin/home-loans/approval",
      ["manager", "senior", "review", "exception"],
    ),
    page(
      "page-home-margins",
      "home",
      "Economics",
      "Home loan margins",
      "Cost of funds, target margin and hard minimum margin.",
      "/admin/home-loans/margins",
      ["estimated cost of funds", "margin floor"],
    ),
    page(
      "page-home-profitability",
      "home",
      "Economics",
      "Home loan profitability defaults",
      "Quote fees, channel line-item defaults and expected-loss policy.",
      "/admin/home-loans/profitability",
      ["broker", "online", "direct", "p and i", "upfront fee", "monthly fee"],
    ),
    page(
      "page-market-search",
      "market",
      "Market intelligence",
      "Market Search",
      "Per-vertical fictional lender selections and Home-only comparison rates.",
      "/admin/market-search",
      [
        "cdr",
        "open banking",
        "lender source",
        "home personal commercial",
        "source selection",
      ],
    ),
    page(
      "page-personal-overview",
      "personal",
      "Personal loan configuration",
      "Personal loan configuration",
      "Products, pricing decisions and economics for personal loans.",
      "/admin/personal-loans",
    ),
    page(
      "page-personal-products",
      "personal",
      "Product and rate data",
      "Personal loan products",
      "Secured and unsecured products, limits, terms, features and fees.",
      "/admin/personal-loans/products",
      ["catalogue", "secured", "unsecured", "redraw"],
    ),
    page(
      "page-personal-rates",
      "personal",
      "Product and rate data",
      "Personal loan carded rates",
      "Carded and comparison rates for personal loan products.",
      "/admin/personal-loans/rates",
      ["comparison rate"],
    ),
    page(
      "page-personal-score-model",
      "personal",
      "Pricing decisions",
      "Personal loan score model",
      "Customer score factors, weights, bands and rate curve.",
      "/admin/personal-loans/score-model",
      ["customer score", "factor weights", "rate curve"],
    ),
    page(
      "page-personal-approval",
      "personal",
      "Pricing decisions",
      "Personal loan approval rules",
      "Escalation rules and approval levels for personal lending.",
      "/admin/personal-loans/approval",
      ["manager", "senior", "review", "exception"],
    ),
    page(
      "page-personal-margins",
      "personal",
      "Economics",
      "Personal loan margins",
      "Cost of funds, target margin and hard minimum margin.",
      "/admin/personal-loans/margins",
      ["estimated cost of funds", "margin floor"],
    ),
    page(
      "page-personal-profitability",
      "personal",
      "Economics",
      "Personal loan profitability defaults",
      "Quote fees, channel and security line-item defaults, and expected-loss policy.",
      "/admin/personal-loans/profitability",
      [
        "broker",
        "online",
        "direct",
        "commission",
        "expected loss",
        "upfront fee",
        "monthly fee",
      ],
    ),
    page(
      "page-commercial-overview",
      "commercial",
      "Commercial loan configuration",
      "Commercial loan configuration",
      "Products, pricing decisions and economics for commercial facilities.",
      "/admin/commercial-loans",
    ),
    page(
      "page-commercial-products",
      "commercial",
      "Product and rate data",
      "Commercial loan products",
      "Facility products, limits, terms and display-only fees.",
      "/admin/commercial-loans/products",
      ["term loan", "overdraft", "equipment finance", "commercial property"],
    ),
    page(
      "page-commercial-rates",
      "commercial",
      "Product and rate data",
      "Commercial base rates",
      "Base rates by commercial facility product.",
      "/admin/commercial-loans/rates",
    ),
    page(
      "page-commercial-score-model",
      "commercial",
      "Pricing decisions",
      "Commercial loan score model",
      "Business score factors, weights, bands and score-margin curve.",
      "/admin/commercial-loans/score-model",
      ["customer score", "factor weights", "margin curve"],
    ),
    page(
      "page-commercial-approval",
      "commercial",
      "Pricing decisions",
      "Commercial policy thresholds",
      "Exposure, requested-rate, DSCR and concentration thresholds.",
      "/admin/commercial-loans/approval",
      ["approval", "dscr", "customer concentration"],
    ),
    page(
      "page-commercial-margins",
      "commercial",
      "Economics",
      "Commercial margins",
      "Cost of funds, target margin and score-margin floor.",
      "/admin/commercial-loans/margins",
      ["estimated cost of funds", "hard minimum", "margin floor"],
    ),
    page(
      "page-commercial-profitability",
      "commercial",
      "Economics",
      "Commercial profitability defaults",
      "Quote fees, channel and facility line-item defaults, and expected-loss policy.",
      "/admin/commercial-loans/profitability",
      [
        "broker",
        "online",
        "direct",
        "commission",
        "expected loss",
        "upfront fee",
        "monthly fee",
      ],
    ),
    page(
      "page-global-assumptions",
      "global",
      "Capital allocation",
      "Capital allocation",
      "Cross-vertical capital ratio for indicative return on equity.",
      "/admin/global-assumptions",
      ["capital ratio", "aps 112", "return on equity", "roe"],
    ),
    page(
      "page-workspace-display",
      "global",
      "Workspace settings",
      "Workspace display",
      "Presentation-only settings for saved quote and workflow screens.",
      "/admin/display",
      ["contrast", "density", "large numbers", "simple mode", "handoff"],
    ),
  ];

function scoreDocument(
  document: AdminConfigSearchDocument,
  normalizedQuery: string,
  tokens: string[],
  exactId: number | null,
): number | null {
  const title = normalizeAdminConfigSearchText(document.title);
  const section = normalizeAdminConfigSearchText(document.section);
  const summary = normalizeAdminConfigSearchText(document.summary);
  const keywords = normalizeAdminConfigSearchText(
    document.keywords?.join(" ") ?? "",
  );
  const recordId = document.recordId == null ? "" : String(document.recordId);
  const index = `${title} ${section} ${summary} ${keywords} ${recordId}`.trim();

  if (!tokens.every((token) => index.includes(token))) return null;

  let score = 0;
  if (title === normalizedQuery) score += 500;
  else if (title.startsWith(normalizedQuery)) score += 300;
  else if (title.includes(normalizedQuery)) score += 220;
  if (section === normalizedQuery) score += 180;
  else if (section.includes(normalizedQuery)) score += 90;
  if (index.includes(normalizedQuery)) score += 60;

  for (const token of tokens) {
    if (title.split(" ").includes(token)) score += 36;
    else if (title.includes(token)) score += 24;
    else if (section.includes(token)) score += 14;
    else score += 5;
  }

  if (
    exactId != null &&
    document.recordId != null &&
    document.recordId === exactId
  ) {
    score += 450;
  }

  return score;
}

export function searchAdminConfigDocuments(
  documents: readonly AdminConfigSearchDocument[],
  filters: AdminConfigSearchParams,
): AdminConfigSearchResponse {
  const normalizedQuery = normalizeAdminConfigSearchText(filters.q);
  if (normalizedQuery.length < 2) {
    return { results: [], total: 0, page: 1, pageCount: 1 };
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const exactIdMatch = filters.q.trim().match(/^#?(\d+)$/);
  const exactId = exactIdMatch ? Number(exactIdMatch[1]) : null;

  const ranked = [...ADMIN_CONFIG_PAGE_DOCUMENTS, ...documents]
    .filter(
      (document) =>
        (filters.area === "all" || document.area === filters.area) &&
        (filters.kind === "all" || document.kind === filters.kind),
    )
    .flatMap((document) => {
      const score = scoreDocument(document, normalizedQuery, tokens, exactId);
      return score == null
        ? []
        : [{ ...document, score } satisfies AdminConfigSearchResult];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        AREA_ORDER[a.area] - AREA_ORDER[b.area] ||
        a.section.localeCompare(b.section) ||
        (a.kind === b.kind ? 0 : a.kind === "page" ? -1 : 1) ||
        a.title.localeCompare(b.title) ||
        (a.recordId ?? 0) - (b.recordId ?? 0),
    );

  const total = ranked.length;
  const pageCount = Math.max(
    1,
    Math.ceil(total / ADMIN_CONFIG_SEARCH_PAGE_SIZE),
  );
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * ADMIN_CONFIG_SEARCH_PAGE_SIZE;

  return {
    results: ranked.slice(start, start + ADMIN_CONFIG_SEARCH_PAGE_SIZE),
    total,
    page,
    pageCount,
  };
}
