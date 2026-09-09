import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import {
  displayLenderName,
  formatCurrency,
  formatDate,
  formatFrequency,
  formatRate,
  labelFromCode,
  safeExternalHref,
} from "@/lib/market/search/format";
import type { SearchProduct, SearchRate } from "@/lib/demo/market-search";
import {
  MARKET_VERTICALS,
  type MarketSearchVertical,
} from "@/lib/market/verticals";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-5 py-5 last:border-b-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EvidenceLink({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  const safe = safeExternalHref(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </a>
  );
}

function DetailList({
  items,
  empty,
}: {
  items: Array<{ id: string; label: string; detail?: string | null }>;
  empty: string;
}) {
  if (!items.length) return <p className="text-sm text-faint">{empty}</p>;
  const visible = items.slice(0, 3);
  const rest = items.slice(3);
  const rows = (values: typeof items) => (
    <ul className="space-y-2.5">
      {values.map((item) => (
        <li key={item.id} className="flex gap-2.5 text-sm leading-5 text-muted">
          <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="font-semibold text-ink">{item.label}</strong>
            {item.detail ? ` — ${item.detail}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {rows(visible)}
      {rest.length ? (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-brand">
            Show {rest.length} more
          </summary>
          {rows(rest)}
        </details>
      ) : null}
    </>
  );
}

function bestRate(
  product: SearchProduct,
  preferred?: SearchRate | null,
): SearchRate | null {
  if (preferred) return preferred;
  return (
    [...product.lendingRates]
      .filter(
        (rate) => !rate.lendingRateType.toLowerCase().includes("discount"),
      )
      .sort((a, b) => a.advertisedRate - b.advertisedRate)[0] ?? null
  );
}

function constraintDetail(
  item: SearchProduct["constraints"][number],
): string | null {
  const numeric = item.numericValue ?? null;
  let value = item.additionalValue;
  if (numeric !== null && item.constraintType.includes("LVR")) {
    const percentage = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
    value = `${percentage}%`;
  } else if (numeric !== null && /(LIMIT|BALANCE)/.test(item.constraintType)) {
    value = formatCurrency(item.numericValue);
  }
  return [value, item.additionalInfo].filter(Boolean).join(" — ") || null;
}

export function ProductDetail({
  product,
  preferredRate,
  vertical,
  mobileBackHref,
}: {
  product: SearchProduct | null;
  preferredRate?: SearchRate | null;
  vertical: MarketSearchVertical;
  mobileBackHref?: string | null;
}) {
  if (!product) {
    return (
      <aside
        id="product-detail"
        className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center xl:sticky xl:top-6"
        aria-label="Product detail"
      >
        <FileText className="mx-auto size-7 text-faint" aria-hidden />
        <h2 className="mt-4 font-serif text-xl font-semibold">
          Choose a product
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Open a result to review its rate criteria, eligibility, fees, and
          lender evidence.
        </p>
      </aside>
    );
  }

  const rate = bestRate(product, preferredRate);
  const lender = displayLenderName(
    product.brandName,
    product.source.brandName ?? product.source.lenderName,
  );
  const ownBrand = product.source.isOwnBrand;

  return (
    <aside
      id="product-detail"
      className="overflow-hidden rounded-2xl bg-panel/60 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto"
      aria-labelledby="product-detail-heading"
    >
      {mobileBackHref ? (
        <Link
          href={mobileBackHref}
          className="inline-flex min-h-11 w-full items-center gap-1.5 border-b border-border px-5 text-sm font-semibold text-brand hover:bg-surface hover:text-brand-strong xl:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to results
        </Link>
      ) : null}
      <header
        className={`rail-chrome bg-brand-deep px-5 py-6 text-rail-ink ${
          mobileBackHref ? "xl:rounded-t-2xl" : "rounded-t-2xl"
        }`}
      >
        <p className="text-sm font-semibold text-brand-glow">{lender}</p>
        <h2
          id="product-detail-heading"
          className="mt-1 font-serif text-2xl font-semibold leading-tight tracking-[-0.01em]"
        >
          {product.name}
        </h2>
        {rate ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-5 border-t border-rail-border pt-5">
              <div>
                <p className="text-xs font-medium text-brand-deep-muted">
                  Advertised rate
                </p>
                <p className="tnum mt-1 text-3xl font-semibold text-brand-glow">
                  {formatRate(rate.advertisedRate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-brand-deep-muted">
                  Comparison rate
                </p>
                <p className="tnum mt-1 text-2xl font-semibold">
                  {formatRate(rate.comparisonRate)}
                </p>
              </div>
            </div>
            {ownBrand ? (
              <p className="mt-5 rounded-lg bg-rail-raised px-3 py-2.5 text-xs leading-5 text-brand-deep-muted">
                Lender products are shown for market context. Own-brand rates
                cannot be attached as competitor evidence.
              </p>
            ) : (
              <Link
                href={{
                  pathname: MARKET_VERTICALS[vertical].quotePath,
                  query: { marketId: rate.id },
                }}
                className={buttonClass("primary", "md", "mt-5 w-full")}
              >
                Use in new quote
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </>
        ) : null}
      </header>

      <div className="border-b border-warn/30 bg-warn-soft px-5 py-3 text-xs leading-5 text-warn">
        <p className="flex gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Product match only. Confirm lender policy and borrower eligibility
            separately.
          </span>
        </p>
      </div>

      {product.description ? (
        <div className="border-b border-border bg-surface px-5 py-4 text-sm leading-6 text-muted">
          {product.description}
        </div>
      ) : null}

      {rate ? (
        <Section
          title="Rate criteria"
          icon={<Landmark className="size-4" aria-hidden />}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-faint">Rate type</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {labelFromCode(rate.lendingRateType)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Purpose</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {labelFromCode(rate.loanPurpose)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Repayments</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {labelFromCode(rate.repaymentType)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">LVR range</dt>
              <dd className="tnum mt-0.5 font-semibold text-ink">
                {rate.minLvr ?? 0}%–
                {rate.maxLvr ?? 100}%
              </dd>
            </div>
          </dl>
        </Section>
      ) : null}

      <Section
        title="Features"
        icon={<ShieldCheck className="size-4" aria-hidden />}
      >
        <DetailList
          empty="No structured features supplied."
          items={product.features.map((item) => ({
            id: item.id,
            label: labelFromCode(item.featureType),
            detail: item.additionalInfo ?? item.additionalValue,
          }))}
        />
      </Section>
      <Section
        title="Borrower eligibility"
        icon={<ShieldCheck className="size-4" aria-hidden />}
      >
        <DetailList
          empty="No structured eligibility information supplied."
          items={product.eligibility.map((item) => ({
            id: item.id,
            label: labelFromCode(item.eligibilityType),
            detail: item.additionalInfo ?? item.additionalValue,
          }))}
        />
      </Section>
      <Section
        title="Product criteria"
        icon={<FileText className="size-4" aria-hidden />}
      >
        <DetailList
          empty="No structured constraints supplied."
          items={product.constraints.map((item) => ({
            id: item.id,
            label: labelFromCode(item.constraintType),
            detail: constraintDetail(item),
          }))}
        />
      </Section>
      <Section
        title="Fees"
        icon={<ReceiptText className="size-4" aria-hidden />}
      >
        <DetailList
          empty="No structured fees supplied."
          items={product.fees.map((fee) => ({
            id: fee.id,
            label: fee.name || labelFromCode(fee.feeType),
            detail: [
              fee.amount ? formatCurrency(fee.amount) : null,
              formatFrequency(fee.frequency),
              fee.additionalInfo,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      </Section>

      <Section
        title="Lender evidence"
        icon={<Clock3 className="size-4" aria-hidden />}
      >
        <dl className="space-y-2 text-xs text-muted">
          <div className="flex justify-between gap-4">
            <dt>Example record date</dt>
            <dd className="tnum text-right font-semibold text-ink">
              {formatDate(product.sourceUpdatedAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Catalogue source</dt>
            <dd className="tnum text-right font-semibold text-ink">
              Bundled fictional data
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-x-5">
          <EvidenceLink href={product.overviewUri}>
            Product overview
          </EvidenceLink>
          <EvidenceLink href={product.termsUri}>Terms</EvidenceLink>
          <EvidenceLink href={product.eligibilityUri}>Eligibility</EvidenceLink>
          <EvidenceLink href={product.feesAndPricingUri}>
            Fees &amp; pricing
          </EvidenceLink>
        </div>
      </Section>
    </aside>
  );
}
