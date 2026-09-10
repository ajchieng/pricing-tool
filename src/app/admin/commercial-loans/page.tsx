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
    href: "/admin/commercial-loans/products",
    title: "Products",
    role: "What staff can quote",
    desc: "Maintain the commercial facility catalogue, limits and display-only fees per facility type.",
    action: "Manage products",
  },
  {
    group: "Product and rate data",
    href: "/admin/commercial-loans/rates",
    title: "Base rates",
    role: "Loan-type starting rates",
    desc: "Maintain Standard and Non-Standard starting rates for each commercial facility; the customer-score discount is subtracted from the selected base.",
    action: "Manage base rates",
  },
  {
    group: "Pricing decisions",
    href: "/admin/commercial-loans/score-model",
    title: "Customer score model",
    role: "Customer score to discount",
    desc: "Set the business-risk, cash-flow, security and relationship score factors that determine discount entitlement.",
    action: "Manage score model",
  },
  {
    group: "Economics",
    href: "/admin/commercial-loans/margins",
    title: "Margins",
    role: "Cost of funds and NIM controls",
    desc: "Govern commercial cost of funds, target margin and hard-NIM approval controls by facility.",
    action: "Manage margins",
  },
  {
    group: "Pricing decisions",
    href: "/admin/commercial-loans/approval",
    title: "Policy thresholds",
    role: "Input and escalation policy",
    desc: "Govern the largest-customer revenue cutoff, exposure limits, requested-rate discounts and DSCR bands.",
    action: "Manage thresholds",
  },
  {
    group: "Economics",
    href: "/admin/commercial-loans/profitability",
    title: "Profitability defaults",
    role: "Quote P&L defaults",
    desc: "Govern vertical quote fees, channel and facility defaults for commission, other income and expenses, plus expected-loss policy.",
    action: "Manage defaults",
  },
];

const GROUPS = [
  {
    title: "Product and rate data",
    desc: "The commercial facility catalogue and Loan type base rates that start every quote.",
  },
  {
    title: "Pricing decisions",
    desc: "Rules that set the score discount or decide whether approval escalation is needed.",
  },
  {
    title: "Economics",
    desc: "Margin assumptions used to judge whether a commercial rate is viable.",
  },
];

export default function CommercialLoanAdminIndex() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { applyCommercialPolicyAction } = createConfigurationActions(
    configuration.version,
  );
  const products = tables.commercial_loan_product.length;
  const rates = tables.commercial_loan_product_rate.length;
  const margins = tables.commercial_margin_setting.length;
  const profitabilityDefaults = tables.commercial_profitability_default.length;
  const approvalSettings = tables.commercial_approval_setting.length;
  const scoreModels = configuration.scoreModels.commercial ? 1 : 0;
  const quoteFeeSettings = tables.quote_fee_setting.filter(
    (row) => row.vertical === "commercial",
  ).length;

  const counts: Record<string, number> = {
    "/admin/commercial-loans/products": products,
    "/admin/commercial-loans/rates": rates,
    "/admin/commercial-loans/score-model": scoreModels,
    "/admin/commercial-loans/margins": margins,
    "/admin/commercial-loans/approval": approvalSettings,
    "/admin/commercial-loans/profitability":
      profitabilityDefaults + quoteFeeSettings,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-panel/60 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Complete policy</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Activates one product, rate and margin per facility, all 12
            profitability scopes, the approval thresholds, compatible expected
            loss and score model v{configuration.scoreModels.commercial.version}
            .
          </p>
        </div>
        <ConfigurationForm
          action={applyCommercialPolicyAction}
          className="mt-3 shrink-0 sm:mt-0"
        >
          <Button type="submit" variant="primary">
            Apply complete policy
          </Button>
        </ConfigurationForm>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Products" value={products} hint="configured rows" />
        <KpiTile label="Rate rows" value={rates} hint="base rates" />
        <KpiTile label="Score models" value={scoreModels} hint="versions" />
        <KpiTile label="Margins" value={margins} hint="governed rows" />
        <KpiTile
          label="Policy thresholds"
          value={approvalSettings}
          hint="governed rows"
        />
        <KpiTile
          label="Profitability defaults"
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
