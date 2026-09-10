"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import { Badge } from "@/components/ui/Badge";
import { KpiTile } from "@/components/ui/KpiTile";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
const CARDS = [
  {
    group: "Pricing configuration",
    href: "/admin/home-loans",
    title: "Home Loan Configuration",
    scope: "Home-loan quote engine",
    desc: "Governed products, carded rates, discount rules, score model, approval rules, margins, profitability defaults and quote fees.",
    action: "Open home loan configuration",
  },
  {
    group: "Pricing configuration",
    href: "/admin/personal-loans",
    title: "Personal Loan Configuration",
    scope: "Personal-loan quote engine",
    desc: "Governed secured/unsecured products, carded rates, pricing policy, profitability defaults and quote fees.",
    action: "Open personal loan configuration",
  },
  {
    group: "Pricing configuration",
    href: "/admin/commercial-loans",
    title: "Commercial Loan Configuration",
    scope: "Commercial-loan quote engine",
    desc: "Governed facility products, base rates, business-risk score model, margins, approval thresholds, profitability defaults and quote fees.",
    action: "Open commercial loan configuration",
  },
  {
    group: "Pricing configuration",
    href: "/admin/global-assumptions",
    title: "Capital allocation",
    scope: "All lending verticals",
    desc: "Govern the capital ratio used for indicative return on equity across all three lending verticals.",
    action: "Manage capital allocation",
  },
  {
    group: "Pricing configuration",
    href: "/admin/market-search",
    title: "Market Search",
    scope: "All lending verticals",
    desc: "Select fictional lenders for Home, Personal and Commercial search, inspect the sample catalogues and maintain Home-only comparison rates.",
    action: "Manage Market Search",
  },

  {
    group: "Operational tools",
    href: "/admin/display",
    title: "Workspace display",
    scope: "Quote presentation",
    desc: "Presentation settings for saved quote pages and staff-facing workflow screens.",
    action: "Manage display settings",
  },
  {
    group: "Operational tools",
    href: "/admin/feedback",
    title: "Staff feedback",
    scope: "Local feedback triage",
    desc: "Review fictional reports, supporting files, status and local reviewer notes.",
    action: "Review staff feedback",
  },
  {
    group: "Change Controls",
    href: "/admin/governance",
    title: "Approval queue",
    scope: "Pending policy changes",
    desc: "Review pending maker-checker configuration changes.",
    action: "Review changes",
  },
  {
    group: "Change Controls",
    href: "/admin/audit",
    title: "Audit trail",
    scope: "Append-only history",
    desc: "Append-only local record of quote activity and configuration decisions.",
    action: "View audit log",
  },
];

const GROUPS = [
  {
    id: "pricing-configuration",
    title: "Pricing configuration",
    desc: "Controls that feed quote calculations and pricing outcomes.",
  },
  {
    id: "operational-tools",
    title: "Operational tools",
    desc: "Staff-facing presentation settings around the pricing tool.",
  },
  {
    id: "change-controls",
    title: "Change Controls",
    desc: "Approval, scheduling and audit surfaces for governed configuration.",
  },
];

export function ConfigurationIndex() {
  const configuration = useDemoConfiguration();
  const HomeIcon = PRODUCT_AREAS.home.icon,
    PersonalIcon = PRODUCT_AREAS.personal.icon,
    CommercialIcon = PRODUCT_AREAS.commercial.icon;
  const products = configuration.tables.product.length,
    rates = configuration.tables.product_rate.length;
  const homeLoanConfigRows = [
    "product",
    "product_rate",
    "pricing_adjustment_rule",
    "approval_rule",
    "margin_setting",
    "profitability_default",
  ].reduce(
    (total, key) =>
      total +
      (configuration.tables[key as keyof typeof configuration.tables]?.length ??
        0),
    1,
  );
  const personalLoanConfigRows = Object.entries(configuration.tables)
    .filter(([key]) => key.startsWith("personal_"))
    .reduce((total, [, rows]) => total + rows.length, 1);
  const commercialLoanConfigRows = Object.entries(configuration.tables)
    .filter(([key]) => key.startsWith("commercial_"))
    .reduce((total, [, rows]) => total + rows.length, 1);
  const pendingChanges = configuration.proposals.filter(
    (p) => p.status === "pending",
  ).length;
  const scheduledChanges = configuration.proposals.filter(
    (p) => p.status === "scheduled",
  ).length;
  const counts: Record<string, number> = {
    "/admin/home-loans": homeLoanConfigRows,
    "/admin/personal-loans": personalLoanConfigRows,
    "/admin/commercial-loans": commercialLoanConfigRows,
    "/admin/governance": pendingChanges + scheduledChanges,
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KpiTile
          label="Home loan config"
          value={homeLoanConfigRows}
          hint="governed rows"
        />
        <KpiTile label="Products" value={products} hint="home loan catalogue" />
        <KpiTile label="Rate bands" value={rates} hint="home loan pricing" />
        <KpiTile
          label="Personal config"
          value={personalLoanConfigRows}
          hint="governed rows"
        />
        <KpiTile
          label="Commercial config"
          value={commercialLoanConfigRows}
          hint="governed rows"
        />
        <KpiTile
          label="Pending changes"
          value={pendingChanges + scheduledChanges}
          hint={`${pendingChanges} pending, ${scheduledChanges} scheduled`}
          tone={pendingChanges + scheduledChanges > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`${group.id}-heading`}
            className="space-y-3"
          >
            <header>
              <h2
                id={`${group.id}-heading`}
                className="font-serif text-lg font-semibold leading-tight tracking-[-0.01em] text-ink"
              >
                {group.title}
              </h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
                {group.desc}
              </p>
            </header>
            <div className="divide-y divide-border border-y border-border">
              {CARDS.filter((card) => card.group === group.title).map(
                (card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-panel/40"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {card.href === "/admin/home-loans" && (
                        <span
                          aria-hidden
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
                        >
                          <HomeIcon size={15} strokeWidth={2} />
                        </span>
                      )}
                      {card.href === "/admin/personal-loans" && (
                        <span
                          aria-hidden
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
                        >
                          <PersonalIcon size={15} strokeWidth={2} />
                        </span>
                      )}
                      {card.href === "/admin/commercial-loans" && (
                        <span
                          aria-hidden
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
                        >
                          <CommercialIcon size={15} strokeWidth={2} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink group-hover:text-brand">
                          {card.title}
                          <span className="ml-2 text-xs font-medium text-faint">
                            {card.scope}
                          </span>
                        </h3>
                        <p className="mt-0.5 max-w-[72ch] text-sm text-muted">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {counts[card.href] != null && (
                        <Badge
                          tone={
                            card.href === "/admin/governance" &&
                            counts[card.href] > 0
                              ? "warn"
                              : "muted"
                          }
                          size="sm"
                        >
                          {counts[card.href]}{" "}
                          {card.href === "/admin/governance"
                            ? "active"
                            : "rows"}
                        </Badge>
                      )}
                      <ArrowRight
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden
                        className="text-faint transition-colors group-hover:text-brand"
                      />
                    </div>
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
