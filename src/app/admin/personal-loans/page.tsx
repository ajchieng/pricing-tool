"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { KpiTile } from "@/components/ui/KpiTile";
import { Button } from "@/components/ui/Button";

const CARDS = [
  {
    group: "Product and rate data",
    href: "/admin/personal-loans/products",
    title: "Products",
    role: "What staff can quote",
    desc: "Maintain the fictional secured and unsecured personal-loan catalogue, features and display-only fees.",
    action: "Manage products",
  },
  {
    group: "Product and rate data",
    href: "/admin/personal-loans/rates",
    title: "Carded rates",
    role: "Starting rate table",
    desc: "Maintain active carded and comparison rates for the personal-loan products.",
    action: "Manage rates",
  },
  {
    group: "Pricing decisions",
    href: "/admin/personal-loans/score-model",
    title: "Customer score model",
    role: "Customer score to rate",
    desc: "Set the loan-details and credit-risk score factors that adjust the carded rate.",
    action: "Manage score model",
  },
  {
    group: "Economics",
    href: "/admin/personal-loans/margins",
    title: "Margins",
    role: "Cost of funds and target margin",
    desc: "Govern personal-loan cost of funds, target margin and hard-minimum margin by product or security type.",
    action: "Manage margins",
  },
  {
    group: "Pricing decisions",
    href: "/admin/personal-loans/approval",
    title: "Approval rules",
    role: "Escalation policy",
    desc: "Govern personal-loan manager, senior, review and exception triggers while code keeps hard structural stops.",
    action: "Manage approval rules",
  },
  {
    group: "Economics",
    href: "/admin/personal-loans/profitability",
    title: "Profitability defaults",
    role: "Quote P&L pre-fills",
    desc: "Govern vertical quote fees, channel and security defaults for commission, other income and expenses, plus expected-loss policy.",
    action: "Manage defaults",
  },
];

const GROUPS = [
  {
    title: "Product and rate data",
    desc: "The personal-loan catalogue and carded rates that start every quote.",
  },
  {
    title: "Pricing decisions",
    desc: "Rules that adjust the suggested rate or decide whether approval is needed.",
  },
  {
    title: "Economics",
    desc: "Margin and profitability assumptions used to judge whether a personal-loan rate is viable.",
  },
];

export default function PersonalLoanAdminIndex() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { applyPersonalPolicyAction } = createConfigurationActions(
    configuration.version,
  );
  const products = tables.personal_loan_product.length;
  const rates = tables.personal_loan_product_rate.length;
  const margins = tables.personal_margin_setting.length;
  const profitabilityDefaults = tables.personal_profitability_default.length;
  const approvalRules = tables.personal_approval_rule.length;
  const scoreModels = configuration.scoreModels.personal ? 1 : 0;
  const quoteFeeSettings = tables.quote_fee_setting.filter(
    (row) => row.vertical === "personal",
  ).length;

  const counts: Record<string, number> = {
    "/admin/personal-loans/products": products,
    "/admin/personal-loans/rates": rates,
    "/admin/personal-loans/score-model": scoreModels,
    "/admin/personal-loans/margins": margins,
    "/admin/personal-loans/approval": approvalRules,
    "/admin/personal-loans/profitability":
      profitabilityDefaults + quoteFeeSettings,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-panel/60 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Complete policy</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Restores the fictional demonstration catalogue, margins,{" "}
            {approvalRules} approval rules, all 6 profitability scopes,
            compatible expected loss and score model v
            {configuration.scoreModels.personal.version}.
          </p>
        </div>
        <ConfigurationForm
          action={applyPersonalPolicyAction}
          className="mt-3 shrink-0 sm:mt-0"
        >
          <Button type="submit" variant="primary">
            Apply complete policy
          </Button>
        </ConfigurationForm>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Products" value={products} hint="configured rows" />
        <KpiTile label="Rate rows" value={rates} hint="carded rates" />
        <KpiTile label="Score models" value={scoreModels} hint="versions" />
        <KpiTile label="Margins" value={margins} hint="governed rows" />
        <KpiTile
          label="Approval rules"
          value={approvalRules}
          hint="governed rows"
        />
        <KpiTile
          label="Profit defaults"
          value={profitabilityDefaults + quoteFeeSettings}
          hint="defaults + quote fees"
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
