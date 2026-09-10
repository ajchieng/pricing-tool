import {
  adminConfigTargetHref,
  searchAdminConfigDocuments,
  type AdminConfigSearchDocument,
  type AdminConfigSearchParams,
  type AdminConfigResultArea,
} from "@/lib/admin-config-search-core";
import type { DemoConfiguration } from "./configuration";

const tablePages: Record<
  string,
  [AdminConfigResultArea, string, string, string]
> = {
  product: ["home", "products", "product", "Products"],
  product_rate: ["home", "rates", "rate", "Carded rates"],
  pricing_adjustment_rule: ["home", "rules", "rule", "Discount rules"],
  approval_rule: ["home", "approval", "approval", "Approval rules"],
  margin_setting: ["home", "margins", "margin", "Margins"],
  profitability_default: [
    "home",
    "profitability",
    "profitability",
    "Profitability defaults",
  ],
  personal_loan_product: ["personal", "products", "product", "Products"],
  personal_loan_product_rate: ["personal", "rates", "rate", "Carded rates"],
  personal_approval_rule: [
    "personal",
    "approval",
    "approval",
    "Approval rules",
  ],
  personal_margin_setting: ["personal", "margins", "margin", "Margins"],
  personal_profitability_default: [
    "personal",
    "profitability",
    "profitability",
    "Profitability defaults",
  ],
  commercial_loan_product: ["commercial", "products", "product", "Products"],
  commercial_loan_product_rate: ["commercial", "rates", "rate", "Base rates"],
  commercial_approval_setting: [
    "commercial",
    "approval",
    "approval",
    "Policy thresholds",
  ],
  commercial_margin_setting: ["commercial", "margins", "margin", "Margins"],
  commercial_profitability_default: [
    "commercial",
    "profitability",
    "profitability",
    "Profitability defaults",
  ],
  capital_allocation_setting: [
    "global",
    "global-assumptions",
    "capital",
    "Capital allocation",
  ],
  workspace_display_setting: [
    "global",
    "display",
    "display",
    "Workspace display",
  ],
  market_source_setting: [
    "market",
    "market-search",
    "source",
    "Lender source selections",
  ],
};
function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}
function describe(row: Record<string, unknown>) {
  return Object.entries(row)
    .filter(([key]) => key !== "id")
    .map(
      ([key, value]) =>
        `${label(key)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
    )
    .join(" · ");
}
function summaryFor(
  table: string,
  row: Record<string, unknown>,
  section: string,
) {
  const value = (key: string) => (row[key] == null ? "" : String(row[key]));
  if (table.endsWith("product_rate"))
    return `${value("cardedRate") || value("baseRate")}% ${table.startsWith("commercial") ? "base" : "carded"} rate${row.lvrMin != null ? ` · ${value("lvrMin")}–${value("lvrMax")}% LVR` : ""}${row.comparisonRate != null ? ` · ${value("comparisonRate")}% comparison` : ""}`;
  if (table.endsWith("product"))
    return [
      value("loanPurpose") || value("securityType") || value("facilityType"),
      value("rateType"),
      row.fixedPeriodMonths ? `${value("fixedPeriodMonths")} months` : "",
    ]
      .filter(Boolean)
      .map(label)
      .join(" · ");
  if (table.endsWith("margin_setting"))
    return `${value("estimatedCostOfFunds")}% cost of funds · ${value("targetMargin")}% target · ${value("hardMinimumMargin")}% hard minimum`;
  if (table.endsWith("profitability_default"))
    return "First-year quote profitability defaults";
  if (table.endsWith("approval_rule"))
    return `${label(value("approvalLevel"))} · ${label(value("conditionType"))} ${value("conditionOperator")} ${value("conditionValue")}`;
  if (table === "pricing_adjustment_rule")
    return `${label(value("ruleType"))} ${value("adjustmentAmount")}% · ${label(value("conditionType"))}`;
  if (table === "capital_allocation_setting")
    return `${value("capitalRatioPct")}% indicative capital ratio`;
  if (table === "market_source_setting")
    return `Fictional lender catalogue · ${["Home", "Personal", "Commercial"].filter((area) => row[`enabled${area}`]).join(", ") || "no areas selected"}`;
  return section;
}
export function configurationSearchDocuments(
  configuration: DemoConfiguration,
): AdminConfigSearchDocument[] {
  const documents: AdminConfigSearchDocument[] = [];
  for (const [table, rows] of Object.entries(configuration.tables)) {
    const metadata = tablePages[table];
    if (!metadata) continue;
    const [area, page, scope, section] = metadata;
    for (const row of rows) {
      const relatedId =
        row.productId ?? row.personalProductId ?? row.commercialProductId;
      const relatedProduct = Object.entries(configuration.tables)
        .filter(([key]) => key.endsWith("product"))
        .flatMap(([, items]) => items)
        .find((item) => item.id === relatedId);
      const title = label(
        String(
          row.name ??
            relatedProduct?.name ??
            (row.channel ? `${row.channel} channel` : null) ??
            row.facilityType ??
            section,
        ),
      );
      const summary = summaryFor(table, row, section);
      documents.push({
        id: `${table}-${row.id}`,
        kind: "setting",
        area,
        section,
        title,
        summary,
        recordId: row.id,
        active: typeof row.active === "boolean" ? row.active : undefined,
        href: adminConfigTargetHref(
          area === "global" || area === "market"
            ? `/admin/${page}`
            : `/admin/${area}-loans/${page}`,
          `${area}-${scope}`,
          row.id,
        ),
        keywords: [describe(row), summary, table, section, label(table)],
      });
    }
  }
  for (const area of ["home", "personal", "commercial"] as const) {
    const model = configuration.scoreModels[area];
    const path = `/admin/${area}-loans/score-model`;
    documents.push({
      id: `${area}-score-model`,
      kind: "setting",
      area,
      section: "Score model",
      title: `${model.name} v${model.version}`,
      summary: `${model.factors.filter((f) => f.enabled).length} active factors · customer score policy`,
      href: adminConfigTargetHref(path, `${area}-score-model`, model.id ?? 1),
      keywords: [
        JSON.stringify(model),
        "factor weights bands rate curve margin curve",
      ],
      active: true,
      recordId: model.id ?? undefined,
    });
    for (const factor of model.factors)
      documents.push({
        id: `${area}-score-${factor.key}`,
        kind: "setting",
        area,
        section: "Score model",
        title: factor.label,
        summary: `${label(factor.category)} factor · ${factor.weight} relative pts`,
        active: factor.enabled,
        href: adminConfigTargetHref(path, `${area}-score-factor`, factor.key, {
          factor: factor.key,
        }),
        keywords: [JSON.stringify(factor), "score weight"],
      });
    const policy = configuration.expectedLossPolicies[area];
    documents.push({
      id: `${area}-expected-loss`,
      kind: "setting",
      area,
      section: "Profitability",
      title: policy.name,
      summary: `Expected-loss policy v${policy.version} · probability of default and loss given default`,
      href: adminConfigTargetHref(
        `/admin/${area}-loans/profitability`,
        `${area}-expected-loss`,
        policy.id ?? 1,
      ),
      keywords: [JSON.stringify(policy), "ECL PD LGD"],
      active: policy.active,
    });
    const fees = configuration.tables.quote_fee_setting.find(
      (row) => row.vertical === area,
    );
    if (fees)
      documents.push({
        id: `${area}-quote-fees`,
        kind: "setting",
        area,
        section: "Profitability",
        title: "Quote fees",
        summary: describe(fees),
        href: adminConfigTargetHref(
          `/admin/${area}-loans/profitability`,
          `${area}-quote-fee`,
          fees.id,
        ),
        keywords: ["upfront monthly fee", describe(fees)],
      });
  }
  return documents;
}
export function searchDemoConfiguration(
  configuration: DemoConfiguration,
  filters: AdminConfigSearchParams,
) {
  return searchAdminConfigDocuments(
    configurationSearchDocuments(configuration),
    filters,
  );
}
