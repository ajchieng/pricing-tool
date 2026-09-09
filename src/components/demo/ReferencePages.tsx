"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  FileText,
  Gauge,
  House,
  ListChecks,
  LockKeyhole,
  Settings2,
  WalletCards,
} from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

const quickSteps = [
  {
    title: "Start a quote",
    body: "Choose Home, Personal or Commercial Loans, then enter the facility or loan structure.",
    icon: Calculator,
  },
  {
    title: "Add context",
    body: "Capture the product-specific risk, relationship, pricing pressure and profitability evidence.",
    icon: ListChecks,
  },
  {
    title: "Read the result",
    body: "Review the Suggested or Indicative Rate, repayments, profitability, warnings and approval requirement.",
    icon: Gauge,
  },
  {
    title: "Save the record",
    body: "Saving recomputes pricing in this browser and keeps an auditable quote record. Historical pricing stays frozen.",
    icon: FileText,
  },
];

const employeeNotes = [
  "Use the correct lending vertical; each has its own products, inputs, pricing engine and saved quote record.",
  "All outputs use fictional products and policy for portfolio demonstration.",
  "Complete the product-specific evidence needed for serviceability, security, profitability and capital classification.",
  "Use notes fields for context that future reviewers need to understand.",
  "Check pricing warnings and approval reasons before discussing a rate.",
  "Create a revision instead of overwriting a saved scenario when assumptions change.",
  "A customer-rate scenario remains a temporary preview until you explicitly apply it to the quote.",
];

const caveats = [
  "Indicative Repayments are estimates based on the entered scenario.",
  "Product comparison rates, structured product fees and commercial facility fees are display-only context. Effective quote-level upfront and monthly fees are separate and do enter first-year profitability.",
  "Unconfirmed APS 112 classifications are conservative and prevent acceptance until an authorised user confirms or overrides them.",
];

const verticals = [
  {
    name: "Home loans",
    href: "/home-loans/new",
    guideHref: "/home-loans/guide/",
    icon: House,
    body: "Carded product rate by LVR, less the demonstration customer-score discount and eligible product discounts.",
    detail:
      "Customer stream, averaged credit scores, retention constraints, broker context, margin, profitability and competitor evidence.",
  },
  {
    name: "Personal loans",
    href: "/personal-loans/new",
    guideHref: "/personal-loans/guide",
    icon: WalletCards,
    body: "Governed product carded rate less the customer-score discount, within product amount, term and rate limits.",
    detail:
      "Stream and Channel context, averaged credit scores, retention controls, secured or unsecured product path, repayment affordability and first-year profitability.",
  },
  {
    name: "Commercial loans",
    href: "/commercial-loans/new",
    guideHref: "/commercial-loans/guide",
    icon: Building2,
    body: "Selected facility base rate less the customer-score discount; explicit minimum customer rates can block a discount.",
    detail:
      "Facility-led inputs, primary-plus-total security, purchase equity contribution, DSCR, annual deal P&L and APS 112 exposure.",
  },
];

const adminNotes = [
  {
    title: "Three separate pricing domains",
    body: "Home, Personal and Commercial own their calculators, input validation and saved pricing snapshots. A shared quote workflow connects assignment, revision, comments and review.",
  },
  {
    title: "Fictional products and policy",
    body: "All product names, rates, thresholds, customers and market evidence are invented. The public demonstration contains no original lender policy or real customer data.",
  },
  {
    title: "Your browser workspace",
    body: "Changes stay in this browser. IndexedDB stores your quotes locally. A saved-quote link opens a record in this browser and does not transfer that record to another browser.",
  },
  {
    title: "Implementation and authorship",
    body: "Built by Alexander Chieng with React, TypeScript and Next.js. Static hosting serves the interface; browser adapters run the calculators without accounts, pricing APIs or a database server.",
  },
];

function IconPanel({
  title,
  body,
  index,
  icon: Icon,
}: {
  title: string;
  body: string;
  index: number;
  icon: typeof Calculator;
}) {
  return (
    <div className="flex gap-3 py-4">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded bg-brand-soft text-xs font-semibold text-brand-strong">
          {index + 1}
        </span>
        <Icon size={16} strokeWidth={1.8} aria-hidden className="text-muted" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About this tool"
        caption="A practical guide to the three lending pricing workflows and their shared controls."
        actions={
          <Link href="/" className={buttonClass("primary")}>
            Choose lending area
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </Link>
        }
      />

      <section className="grid gap-6 border-y border-border py-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand text-brand-ink">
              <BookOpen size={19} strokeWidth={1.8} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                What the application does
              </h2>
              <p className="text-sm text-muted">
                It turns standard lending scenarios into explainable pricing
                guidance for staff review.
              </p>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted">
            Each vertical starts from its fictional carded or base rate, applies
            transparent product-specific scoring and pricing rules, then shows
            the suggested or indicative customer rate and required approval.
            Every save reprices in this browser and preserves the inputs,
            pricing, profitability, capital snapshot, warnings and review
            context.
          </p>
          <div className="mt-5 grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
            <div className="py-4 sm:px-4 sm:first:pl-0">
              <p className="text-xs font-medium text-muted">Pricing areas</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                Three verticals
              </p>
            </div>
            <div className="border-t border-border py-4 sm:border-t-0 sm:px-4">
              <p className="text-xs font-medium text-muted">Decision support</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                Rate + approval
              </p>
            </div>
            <div className="border-t border-border py-4 sm:border-t-0 sm:px-4">
              <p className="text-xs font-medium text-muted">
                Shared operations
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                Auditable quotes
              </p>
            </div>
          </div>
        </div>

        <aside className="self-start border-t border-border pt-4 lg:border-t-0 lg:pt-0">
          <h2 className="text-sm font-semibold text-ink">Start here</h2>
          <div className="mt-3 space-y-3 text-sm leading-5 text-muted">
            <p>
              Choose the lending area that owns the product. Its Guide explains
              the active score, product guardrails and domain-specific checks.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className={buttonClass("secondary", "sm")}>
                Lending areas
              </Link>
              <Link
                href="https://github.com/ajchieng/pricing-tool"
                target="_blank"
                rel="noreferrer"
                className={buttonClass("ghost", "sm")}
              >
                Source on GitHub
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-3 max-w-3xl">
          <h2 className="text-base font-semibold text-ink">
            Choose the correct vertical
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Shared navigation and review controls behave consistently, but the
            three pricing models and their quote records remain deliberately
            separate.
          </p>
        </div>
        <div className="grid divide-y divide-border border-y border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {verticals.map((vertical) => {
            const Icon = vertical.icon;
            return (
              <article
                key={vertical.name}
                className="py-5 lg:px-5 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-soft text-brand-strong">
                    <Icon size={18} strokeWidth={1.8} aria-hidden />
                  </span>
                  <h3 className="text-base font-semibold text-ink">
                    {vertical.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {vertical.body}
                </p>
                <p className="mt-2 text-xs leading-5 text-faint">
                  {vertical.detail}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={vertical.href}
                    className={buttonClass("secondary", "sm")}
                  >
                    New quote
                  </Link>
                  <Link
                    href={vertical.guideHref}
                    className={buttonClass("ghost", "sm")}
                  >
                    View guide
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">
          Fast quote workflow
        </h2>
        <div className="grid divide-y divide-border border-y border-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {quickSteps.map((step, index) => (
            <div
              key={step.title}
              className="md:px-4 md:first:pl-0 xl:last:pr-0"
            >
              <IconPanel {...step} index={index} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="border-y border-border py-5">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">
            What to know before quoting
          </h2>
          <ul className="mt-3 space-y-3">
            {employeeNotes.map((note) => (
              <li
                key={note}
                className="flex gap-2 text-sm leading-5 text-muted"
              >
                <CheckCircle2
                  size={16}
                  strokeWidth={1.8}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-ok"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-border py-5">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">
            Important limits
          </h2>
          <ul className="mt-3 space-y-3">
            {caveats.map((note) => (
              <li
                key={note}
                className="flex gap-2 text-sm leading-5 text-muted"
              >
                <AlertTriangle
                  size={16}
                  strokeWidth={1.8}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-warn"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="border-y border-border py-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
            <Settings2 size={18} strokeWidth={1.8} aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">
              About this project
            </h2>
            <p className="text-sm text-muted">
              A portfolio demonstration with fictional calibration and a local
              browser workspace.
            </p>
          </div>
        </div>
        <div className="grid gap-x-6 md:grid-cols-2">
          {adminNotes.map((note) => (
            <div
              key={note.title}
              className="border-t border-border py-4 first:border-t-0 md:[&:nth-child(2)]:border-t-0"
            >
              <h3 className="text-sm font-semibold text-ink">{note.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted">{note.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-brand/25 bg-brand-soft/50 px-4 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <LockKeyhole
              size={20}
              strokeWidth={1.8}
              aria-hidden
              className="mt-0.5 shrink-0 text-brand-strong"
            />
            <div>
              <h2 className="text-base font-semibold text-ink">
                Language to use
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-muted">
                Use Suggested Rate, Indicative Repayment, Approval Required,
                Pricing Exception and Internal Estimate. Pair the pricing output
                with the applicable approval status.
              </p>
            </div>
          </div>
          <Link href="/" className={buttonClass("secondary", "sm")}>
            View lending areas
          </Link>
        </div>
      </section>
    </div>
  );
}

export { MarketPage } from "./MarketPage";
