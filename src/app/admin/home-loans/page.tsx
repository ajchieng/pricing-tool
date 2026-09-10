"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import Link from "next/link";
import { SAMPLE_MARKET } from "@/lib/demo/market";
import { Badge } from "@/components/ui/Badge";
import { KpiTile } from "@/components/ui/KpiTile";
import { Button } from "@/components/ui/Button";

const CARDS = [
  {
    group: "Product and rate data",
    href: "/admin/home-loans/products",
    title: "Products",
    role: "What staff can quote",
    desc: "Add or edit products, activate rows, and set loan purpose, rate type and maximum LVR.",
    action: "Manage products",
  },
  {
    group: "Product and rate data",
    href: "/admin/home-loans/rates",
    title: "Carded rates",
    role: "Starting rate table",
    desc: "Maintain carded rates by product and LVR band, including active/inactive bands.",
    action: "Manage rate bands",
  },
  {
    group: "Pricing decisions",
    href: "/admin/home-loans/rules",
    title: "Discount rules",
    role: "Product discounts",
    desc: "Configure discount-only product rules, conditions, priority and approval flags. Legacy loading rules remain read-only.",
    action: "Manage discount rules",
  },
  {
    group: "Pricing decisions",
    href: "/admin/home-loans/score-model",
    title: "Customer score model",
    role: "Customer score to rate",
    desc: "Set score weights, parameters and thresholds; new models use the standard score-to-discount curve.",
    action: "Manage score model",
  },
  {
    group: "Pricing decisions",
    href: "/admin/home-loans/approval",
    title: "Approval rules",
    role: "Exception routing",
    desc: "Define approval thresholds and the approval level each condition requires.",
    action: "Manage approval policy",
  },
  {
    group: "Economics",
    href: "/admin/home-loans/margins",
    title: "Margins",
    role: "Profit guardrails",
    desc: "Maintain cost of funds, target margin and hard minimum margin settings.",
    action: "Manage margins",
  },
  {
    group: "Economics",
    href: "/admin/home-loans/profitability",
    title: "Profitability defaults",
    role: "Quote pre-fills",
    desc: "Set vertical quote fees and per-channel defaults for commissions, other income and expenses, and govern expected loss on the same page.",
    action: "Manage profitability defaults",
  },
];

const GROUPS = [
  {
    title: "Product and rate data",
    desc: "The catalogue and carded rates that start every home-loan quote.",
  },
  {
    title: "Pricing decisions",
    desc: "Rules that change the suggested rate or decide whether approval is needed.",
  },
  {
    title: "Economics",
    desc: "Margin and profitability assumptions used to judge whether a rate is viable.",
  },
];

export default function HomeLoanAdminIndex() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { applyHomePolicyAction } = createConfigurationActions(
    configuration.version,
  );
  const products = tables.product.length;
  const rates = tables.product_rate.length;
  const margins = tables.margin_setting.length;
  const profitabilityDefaults = tables.profitability_default.length;
  const approvals = tables.approval_rule.length;
  const scoreModels = configuration.scoreModels.home ? 1 : 0;
  const quoteFeeSettings = tables.quote_fee_setting.filter(
    (row) => row.vertical === "home",
  ).length;
  const rules = tables.pricing_adjustment_rule.length;
  const competitors = SAMPLE_MARKET.filter((row) => row.area === "home").length;

  const counts: Record<string, number> = {
    "/admin/home-loans/products": products,
    "/admin/home-loans/rates": rates,
    "/admin/home-loans/rules": rules,
    "/admin/home-loans/score-model": scoreModels,
    "/admin/home-loans/approval": approvals,
    "/admin/home-loans/margins": margins,
    "/admin/home-loans/profitability": profitabilityDefaults + quoteFeeSettings,
    "/admin/home-loans/competitors": competitors,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-panel/60 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Complete policy</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Restores the fictional demonstration catalogue, {margins} margin
            scopes, {approvals} approval rules, all {profitabilityDefaults}{" "}
            profitability scopes, compatible expected loss and score model v
            {configuration.scoreModels.home.version}.
          </p>
        </div>
        <ConfigurationForm
          action={applyHomePolicyAction}
          className="mt-3 shrink-0 sm:mt-0"
        >
          <Button type="submit" variant="primary">
            Apply complete policy
          </Button>
        </ConfigurationForm>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Products" value={products} hint="configured rows" />
        <KpiTile label="Rate bands" value={rates} hint="carded-rate bands" />
        <KpiTile
          label="Pricing rules"
          value={rules}
          hint="active policy input"
        />
        <KpiTile
          label="Competitor rates"
          value={competitors}
          hint="fictional market rows"
        />
      </div>

      <div className="space-y-5">
        {GROUPS.map((group) => (
          <section key={group.title} className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
              <p className="mt-0.5 text-sm text-muted">{group.desc}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CARDS.filter((card) => card.group === group.title).map(
                (card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group rounded-2xl bg-panel/60 p-4 transition-colors hover:bg-panel"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-muted">
                          {card.role}
                        </div>
                        <h3 className="mt-0.5 font-semibold text-ink">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted">{card.desc}</p>
                      </div>
                      <Badge tone="muted" size="sm">
                        {counts[card.href]} rows
                      </Badge>
                    </div>
                    <span className="mt-4 inline-flex text-sm font-medium text-brand group-hover:underline">
                      {card.action}
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
