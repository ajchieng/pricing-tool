"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Printer,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SAMPLE_MARKET, type SampleMarketProduct } from "@/lib/demo/market";
import {
  AREA_INFO,
  human,
  isDemoArea,
  money,
  percent,
} from "@/lib/demo/presentation";
import { getDemoFormConfig, getDemoPolicy } from "@/lib/demo/pricing";
import { DEMO_AREAS, type DemoArea } from "@/lib/demo/types";
import { PROFITABILITY_TAX_RATE_PCT } from "@/lib/pricing/profitability-policy";
import type {
  CustomerScoreFactorConfig,
  CustomerScoreNumericRule,
} from "@/lib/pricing/types";

function ReferenceTabs({
  area,
  guide = false,
}: {
  area: DemoArea;
  guide?: boolean;
}) {
  return (
    <nav
      aria-label={guide ? "Pricing guides" : "Market product area"}
      className="demo-no-print mb-6 flex flex-wrap gap-1 border-b border-border"
    >
      {DEMO_AREAS.map((item) => (
        <Link
          key={item}
          href={
            guide
              ? `${AREA_INFO[item].path}/guide/`
              : `/market-search/?area=${item}`
          }
          aria-current={item === area ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold ${item === area ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
        >
          {AREA_INFO[item].name}
        </Link>
      ))}
    </nav>
  );
}

function indicativeRepayment(amount: number, rate: number, years: number) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(years) ||
    years <= 0
  )
    return null;
  const monthly = rate / 1200,
    months = years * 12;
  return monthly === 0
    ? amount / months
    : (amount * monthly) / (1 - Math.pow(1 + monthly, -months));
}

function MarketComparison({
  products,
  amount,
  years,
  onRemove,
}: {
  products: SampleMarketProduct[];
  amount: number;
  years: number;
  onRemove: (id: string) => void;
}) {
  if (!products.length) return null;
  return (
    <section
      id="market-comparison"
      className="mt-8 scroll-mt-24 border-t border-border pt-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="demo-section-heading">Product comparison</h2>
          <p className="mt-1 text-sm text-muted">
            {products.length} of 3 products selected · Fictional examples
          </p>
        </div>
        <button
          className="demo-button-secondary demo-no-print"
          onClick={() => window.print()}
        >
          <Printer size={16} aria-hidden />
          Print comparison
        </button>
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Selected product comparison"
      >
        <table className="market-comparison-table w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Fictional market comparison for {money(amount)} over {years} years
          </caption>
          <thead>
            <tr className="border-y border-border bg-panel">
              <th scope="col" className="p-3 font-semibold">
                Compare
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  scope="col"
                  className="min-w-44 p-3 align-top"
                >
                  <span className="block font-serif text-lg font-semibold">
                    {product.name}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted">
                    {product.lender}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                [
                  "Advertised rate",
                  (p: SampleMarketProduct) => percent(p.rate),
                ],
                [
                  "Comparison rate",
                  (p: SampleMarketProduct) => percent(p.comparisonRate),
                ],
                ["Annual fee", (p: SampleMarketProduct) => money(p.annualFee)],
                ["Rate type", (p: SampleMarketProduct) => human(p.rateType)],
                [
                  "Maximum LVR",
                  (p: SampleMarketProduct) =>
                    p.maxLvr == null ? "Not applicable" : percent(p.maxLvr),
                ],
                [
                  "Example monthly repayment",
                  (p: SampleMarketProduct) =>
                    money(indicativeRepayment(amount, p.rate, years)),
                ],
                [
                  "Features",
                  (p: SampleMarketProduct) => p.features.join(" · "),
                ],
              ] as const
            ).map(([label, value]) => (
              <tr key={label} className="border-b border-border">
                <th scope="row" className="p-3 text-xs font-medium text-muted">
                  {label}
                </th>
                {products.map((product) => (
                  <td className="tnum p-3" key={product.id}>
                    {value(product)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="demo-no-print">
              <th scope="row" className="p-3 text-xs font-medium text-muted">
                Next step
              </th>
              {products.map((product) => (
                <td className="p-3 align-top" key={product.id}>
                  <Link
                    className="demo-button-secondary"
                    href={`${AREA_INFO[product.area].path}/new/?marketId=${product.id}`}
                  >
                    Use in quote
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                  <button
                    className="mt-2 flex min-h-11 items-center gap-1 text-xs text-muted"
                    aria-label={`Remove ${product.name} from comparison`}
                    onClick={() => onRemove(product.id)}
                  >
                    <X size={13} aria-hidden />
                    Remove
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted">
        Example repayments use a constant advertised rate and monthly
        principal-and-interest amortisation, excluding fees. Actual facility
        structures are explored in the quote calculator. Comparison rates and
        product fees remain display context.
      </p>
    </section>
  );
}

export function MarketPage() {
  const params = useSearchParams(),
    queryArea = params.get("area");
  const area = isDemoArea(queryArea) ? queryArea : "home";
  const [search, setSearch] = useState("");
  const [rateType, setRateType] = useState("all");
  const [noFee, setNoFee] = useState(false);
  const [sort, setSort] = useState("rate");
  const [selection, setSelection] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState({
    home: "420000",
    personal: "35000",
    commercial: "500000",
  });
  const [terms, setTerms] = useState({
    home: "25",
    personal: "5",
    commercial: "7",
  });
  const selected = SAMPLE_MARKET.filter(
    (product) => product.area === area && selection.includes(product.id),
  );
  const detail = SAMPLE_MARKET.find(
    (product) => product.area === area && product.id === detailId,
  );
  const filtered = SAMPLE_MARKET.filter(
    (product) =>
      product.area === area &&
      (rateType === "all" || product.rateType === rateType) &&
      (!noFee || product.annualFee === 0) &&
      `${product.name} ${product.lender} ${product.features.join(" ")}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  ).sort((a, b) =>
    sort === "fee"
      ? a.annualFee - b.annualFee
      : sort === "comparison"
        ? a.comparisonRate - b.comparisonRate
        : a.rate - b.rate,
  );
  const remove = (id: string) =>
    setSelection((current) => current.filter((item) => item !== id));
  function toggle(product: SampleMarketProduct) {
    if (selection.includes(product.id)) {
      remove(product.id);
      return;
    }
    if (selected.length < 3)
      setSelection([...selected.map((item) => item.id), product.id]);
  }
  return (
    <article data-product={area}>
      <PageHeader
        title="Market Search"
        caption="Explore a fictional product catalogue, compare terms, and bring a selected rate into a quote as evidence."
      />
      <ReferenceTabs area={area} />
      <div className="demo-no-print mb-5 grid items-end gap-4 rounded-2xl bg-panel/60 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="demo-label">Search products</span>
          <span className="relative block">
            <Search
              className="absolute left-3 top-3.5 text-muted"
              size={16}
              aria-hidden
            />
            <input
              className="demo-field demo-search-field"
              type="search"
              value={search}
              placeholder="Name, lender or feature"
              onChange={(event) => setSearch(event.target.value)}
            />
          </span>
        </label>
        <label>
          <span className="demo-label">Rate type</span>
          <select
            className="demo-field"
            value={rateType}
            onChange={(event) => setRateType(event.target.value)}
          >
            <option value="all">All rates</option>
            <option value="variable">Variable</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
        <label>
          <span className="demo-label">Sort products</span>
          <select
            className="demo-field"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="rate">Lowest advertised rate</option>
            <option value="comparison">Lowest comparison rate</option>
            <option value="fee">Lowest annual fee</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={noFee}
            onChange={(event) => setNoFee(event.target.checked)}
          />
          No annual fee only
        </label>
      </div>
      <div className="demo-no-print mb-4 flex flex-wrap items-end gap-4">
        <label>
          <span className="demo-label">Example amount ($)</span>
          <input
            className="demo-field max-w-52"
            inputMode="decimal"
            type="number"
            min="1"
            value={amounts[area]}
            onChange={(event) =>
              setAmounts({ ...amounts, [area]: event.target.value })
            }
          />
        </label>
        <label>
          <span className="demo-label">Example term (years)</span>
          <input
            className="demo-field max-w-40"
            inputMode="decimal"
            type="number"
            min="1"
            max="40"
            value={terms[area]}
            onChange={(event) =>
              setTerms({ ...terms, [area]: event.target.value })
            }
          />
        </label>
        <p className="max-w-sm pb-2 text-xs text-muted">
          Used only for the example repayment comparison below.
        </p>
      </div>
      <div className="market-print-hide mb-3 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          {filtered.length} fictional{" "}
          {filtered.length === 1 ? "product" : "products"}
        </p>
        {selected.length > 0 && (
          <a
            className="demo-button-secondary demo-no-print"
            href="#market-comparison"
          >
            Compare selected ({selected.length}/3)
          </a>
        )}
      </div>
      {!filtered.length ? (
        <div className="border-y border-border py-10">
          <h2 className="demo-section-heading">
            No products match these filters
          </h2>
          <button
            className="demo-button-secondary mt-4"
            onClick={() => {
              setSearch("");
              setRateType("all");
              setNoFee(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <table className="demo-table market-print-hide">
          <thead>
            <tr>
              <th scope="col">Product / lender</th>
              <th scope="col">Advertised rate</th>
              <th scope="col">Comparison rate</th>
              <th scope="col">Annual fee</th>
              <th scope="col">Compare</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td data-label="Product">
                  <button
                    className="min-h-11 text-left"
                    onClick={() => {
                      setDetailId(product.id);
                      requestAnimationFrame(() => {
                        const heading = document.getElementById(
                          "product-detail-title",
                        );
                        heading?.focus();
                        heading?.scrollIntoView({
                          block: "center",
                          behavior: "auto",
                        });
                      });
                    }}
                  >
                    <span className="block font-serif text-lg font-semibold text-brand-strong underline-offset-4 hover:underline">
                      {product.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {product.lender} · {human(product.rateType)}
                    </span>
                  </button>
                </td>
                <td
                  data-label="Advertised rate"
                  className="tnum font-semibold text-brand-strong"
                >
                  {percent(product.rate)}
                </td>
                <td data-label="Comparison rate" className="tnum">
                  {percent(product.comparisonRate)}
                </td>
                <td data-label="Annual fee" className="tnum">
                  {money(product.annualFee)}
                </td>
                <td data-label="Compare">
                  <button
                    className="demo-button-secondary demo-no-print"
                    onClick={() => toggle(product)}
                    aria-label={`${selection.includes(product.id) ? "Remove" : "Compare"} ${product.name}`}
                    aria-pressed={selection.includes(product.id)}
                    disabled={
                      !selection.includes(product.id) && selected.length >= 3
                    }
                  >
                    {selection.includes(product.id) ? (
                      <>
                        <Check size={15} aria-hidden />
                        Selected
                      </>
                    ) : (
                      "Compare"
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {detail && (
        <section
          className="market-print-hide mt-6 rounded-2xl bg-panel/60 p-5 sm:p-6"
          aria-labelledby="product-detail-title"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="product-detail-title"
                tabIndex={-1}
                className="font-serif text-2xl font-semibold outline-none"
              >
                {detail.name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {detail.lender} · Fictional product
              </p>
            </div>
            <button
              className="demo-button-secondary demo-no-print"
              aria-label="Close product details"
              onClick={() => setDetailId(null)}
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-4 max-w-prose text-sm leading-relaxed">
            {detail.description}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {detail.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check size={14} className="text-brand" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Advertised rate{" "}
            <span className="tnum font-semibold text-ink">
              {percent(detail.rate)}
            </span>{" "}
            · Annual fee <span className="tnum">{money(detail.annualFee)}</span>
            {detail.maxLvr != null ? (
              <>
                {" "}
                · Maximum LVR{" "}
                <span className="tnum">{percent(detail.maxLvr)}</span>
              </>
            ) : null}
          </p>
          <Link
            className="demo-button demo-no-print mt-5"
            href={`${AREA_INFO[area].path}/new/?marketId=${detail.id}`}
          >
            Use this product in a quote
            <ArrowRight size={16} aria-hidden />
          </Link>
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted">
            This carries the competitor rate and a frozen evidence record into
            the calculator. The fictional lender policy still owns the
            calculated offer.
          </p>
        </section>
      )}
      <MarketComparison
        products={selected}
        amount={Number(amounts[area])}
        years={Number(terms[area])}
        onRemove={remove}
      />
      <p className="mt-6 max-w-prose text-xs leading-relaxed text-muted">
        All product names, rates, features and fees are invented for this
        portfolio. The catalogue is bundled with the app and has no live lender
        feed.
      </p>
    </article>
  );
}

function ruleLabel(rule: CustomerScoreNumericRule) {
  const symbols = {
    lte: "≤",
    lt: "<",
    gte: "≥",
    gt: ">",
    eq: "=",
    between: "between",
    present: "Provided",
    missing: "Missing",
  };
  return `${symbols[rule.operator]}${rule.value == null ? "" : ` ${rule.value.toLocaleString("en-AU")}`}${rule.operator === "between" ? ` and ${rule.valueMax?.toLocaleString("en-AU")}` : ""}`;
}

function FactorDetails({ factor }: { factor: CustomerScoreFactorConfig }) {
  return (
    <details className="border-b border-border py-3">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-semibold">
        <span>
          {factor.label}
          <span className="ml-2 text-xs font-normal text-muted">
            {human(factor.category)}
          </span>
        </span>
        <span className="tnum shrink-0 text-brand-strong">
          Weight {factor.weight}
        </span>
      </summary>
      <div className="mt-2 pb-2">
        <p className="mb-3 text-xs text-muted">
          Missing input score: {factor.missingScore}.{" "}
          {factor.scoringMethod === "linear_points"
            ? "Scores interpolate between these points."
            : "The first matching rule supplies the factor score."}
        </p>
        <table className="demo-table">
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">Score</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {factor.rules?.map((rule) => (
              <tr key={rule.id}>
                <td data-label="Condition" className="tnum">
                  {ruleLabel(rule)}
                </td>
                <td data-label="Score" className="tnum">
                  {rule.score}
                </td>
                <td data-label="Meaning">{rule.label}</td>
              </tr>
            ))}
            {factor.mappings?.map((mapping, index) => (
              <tr key={index}>
                <td data-label="Condition">
                  {mapping.value == null ? "Missing" : String(mapping.value)}
                </td>
                <td data-label="Score" className="tnum">
                  {mapping.score}
                </td>
                <td data-label="Meaning">{mapping.label}</td>
              </tr>
            ))}
            {factor.points?.map((point, index) => (
              <tr key={index}>
                <td data-label="Condition" className="tnum">
                  {point.value}
                </td>
                <td data-label="Score" className="tnum">
                  {point.score}
                </td>
                <td data-label="Meaning">
                  {point.label ?? "Interpolation point"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {factor.alternativeNumericSources?.map((source) => (
          <div className="mt-4" key={source.field}>
            <h4 className="text-sm font-semibold">
              Alternative input: {source.label}
            </h4>
            <table className="demo-table mt-2">
              <thead>
                <tr>
                  <th scope="col">Condition</th>
                  <th scope="col">Score</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {source.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td data-label="Condition" className="tnum">
                      {ruleLabel(rule)}
                    </td>
                    <td data-label="Score" className="tnum">
                      {rule.score}
                    </td>
                    <td data-label="Meaning">{rule.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </details>
  );
}

function PolicyRows({ value }: { value: unknown }) {
  const entries =
    value != null && typeof value === "object"
      ? Object.entries(value).filter(
          ([key, item]) => key !== "id" && key !== "active" && item != null,
        )
      : [];
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div key={key} className="border-b border-border py-3">
          <dt className="text-xs text-muted">
            {/^\d+$/.test(key)
              ? `Item ${Number(key) + 1}`
              : human(key.replace(/([A-Z])/g, " $1"))}
          </dt>
          <dd className="mt-1 break-words text-sm">
            {typeof item === "object" && item != null ? (
              <PolicyRows value={item} />
            ) : typeof item === "boolean" ? (
              item ? (
                "Yes"
              ) : (
                "No"
              )
            ) : item == null ? (
              "Not set"
            ) : typeof item === "string" &&
              /^[a-z]+(?:_[a-z0-9]+)+$/.test(item) ? (
              human(item)
            ) : (
              String(item)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function GuidePage({ area }: { area: DemoArea }) {
  const policy = getDemoPolicy(area),
    model = policy.scoreModel,
    curve = model.rateCurve;
  const weights = model.factors
    .filter((factor) => factor.enabled)
    .reduce((sum, factor) => sum + factor.weight, 0);
  function printGuide() {
    document
      .querySelectorAll<HTMLDetailsElement>("[data-guide] details")
      .forEach((details) => {
        details.open = true;
      });
    window.print();
  }
  return (
    <article data-product={area} data-guide>
      <PageHeader
        title={`${AREA_INFO[area].singular} pricing guide`}
        caption="A transparent reference for the fictional assumptions used by this demonstration."
        actions={
          <button
            className="demo-button-secondary demo-no-print"
            onClick={printGuide}
          >
            <Printer size={16} aria-hidden />
            Print guide
          </button>
        }
      />
      <ReferenceTabs area={area} guide />
      <p className="mb-6 max-w-prose rounded-xl bg-brand-soft p-4 text-sm leading-relaxed">
        {policy.notice} Policy version{" "}
        <span className="tnum font-semibold">{model.version}</span> is bundled
        with this static app. Every saved quote carries its own complete
        calculation and policy snapshot.
      </p>
      <nav
        aria-label="Guide sections"
        className="demo-no-print mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-brand"
      >
        <a
          className="min-h-11 py-3 underline underline-offset-4"
          href="#guide-score"
        >
          Customer score
        </a>
        <a
          className="min-h-11 py-3 underline underline-offset-4"
          href="#guide-rates"
        >
          Rates and fees
        </a>
        <a
          className="min-h-11 py-3 underline underline-offset-4"
          href="#guide-economics"
        >
          Profitability and capital
        </a>
        <a
          className="min-h-11 py-3 underline underline-offset-4"
          href="#guide-credit-loss"
        >
          Expected credit loss
        </a>
      </nav>
      <section id="guide-score" className="scroll-mt-24">
        <h2 className="demo-section-heading">Customer score and pricing</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          The calculator evaluates each applicable factor, multiplies its score
          by its weight, and divides the total by the applicable weight sum.
          Factors unavailable for a particular customer stream are handled by
          the model’s context rules. The enabled weights below total{" "}
          <span className="tnum">{weights}</span>.
        </p>
        <div className="mt-4 border-y border-border py-4 text-sm leading-relaxed">
          <p>Customer score = weighted factor scores ÷ applicable weights.</p>
          <p className="mt-2">
            Discount entitlement = max(0, min(1, (score −{" "}
            <span className="tnum">{curve.neutralScore}</span>) ÷ (100 −{" "}
            <span className="tnum">{curve.neutralScore}</span>))).
          </p>
          <p className="mt-2">
            Score discount = entitlement ×{" "}
            <span className="tnum">{percent(curve.maxDiscount)}</span> maximum
            discount. The selected pricing anchor, explicit minimum-rate floors
            and requested-rate checks determine the displayed rate.
          </p>
          {curve.maxDiscountBySecurity && (
            <p className="mt-2">
              Personal discount caps: secured{" "}
              <span className="tnum">
                {percent(curve.maxDiscountBySecurity.secured)}
              </span>
              ; unsecured{" "}
              <span className="tnum">
                {percent(curve.maxDiscountBySecurity.unsecured)}
              </span>
              .
            </p>
          )}
        </div>
        {area !== "commercial" && (
          <p className="mt-3 max-w-prose text-sm leading-relaxed">
            For eligible retention scenarios with previous hardship, the
            fictional policy permits {percent(policy.retentionDiscountSharePct)}{" "}
            of the additional discount. Recent arrears can prevent a further
            discount; the result explains the applicable branch.
          </p>
        )}
        <div className="mt-4">
          {model.factors
            .filter((factor) => factor.enabled)
            .map((factor) => (
              <FactorDetails key={factor.key} factor={factor} />
            ))}
        </div>
        <h3 className="mt-6 font-serif text-xl font-semibold">Score bands</h3>
        <table className="demo-table mt-3">
          <thead>
            <tr>
              <th scope="col">Band</th>
              <th scope="col">Minimum score</th>
            </tr>
          </thead>
          <tbody>
            {model.bands.map((band) => (
              <tr key={band.key}>
                <td data-label="Band">{band.label}</td>
                <td data-label="Minimum score" className="tnum">
                  {band.minScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section
        id="guide-rates"
        className="mt-9 scroll-mt-24 border-t border-border pt-6"
      >
        <h2 className="demo-section-heading">Products, rates and fees</h2>
        <ul className="mt-3 divide-y divide-border">
          {policy.products.map((product) => (
            <li className="py-3 text-sm" key={product.id}>
              <span className="font-semibold">{product.name}</span>
            </li>
          ))}
        </ul>
        {area === "home" && (
          <table className="demo-table mt-4">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">LVR range</th>
                <th scope="col">Pricing anchor</th>
                <th scope="col">Comparison rate</th>
              </tr>
            </thead>
            <tbody>
              {policy.rateBands.map((rate) => (
                <tr key={rate.id}>
                  <td data-label="Product">
                    {
                      policy.products.find(
                        (product) => product.id === rate.productId,
                      )?.name
                    }
                  </td>
                  <td data-label="LVR range" className="tnum">
                    {rate.lvrMin}–{rate.lvrMax}%
                  </td>
                  <td data-label="Pricing anchor" className="tnum">
                    {percent(rate.cardedRate)}
                  </td>
                  <td data-label="Comparison rate" className="tnum">
                    {percent(rate.comparisonRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {area === "personal" && (
          <table className="demo-table mt-4">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Pricing anchor</th>
                <th scope="col">Comparison rate</th>
              </tr>
            </thead>
            <tbody>
              {getDemoFormConfig("personal").products.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product">{product.name}</td>
                  <td data-label="Pricing anchor" className="tnum">
                    {percent(product.cardedRate)}
                  </td>
                  <td data-label="Comparison rate" className="tnum">
                    {percent(product.comparisonRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {area === "commercial" && (
          <table className="demo-table mt-4">
            <thead>
              <tr>
                <th scope="col">Facility</th>
                <th scope="col">Pricing anchor</th>
                <th scope="col">Pricing context</th>
              </tr>
            </thead>
            <tbody>
              {policy.rateSettings.map((rate) => (
                <tr key={rate.id}>
                  <td data-label="Facility">{rate.productName}</td>
                  <td data-label="Pricing anchor" className="tnum">
                    {percent(rate.rate)}
                  </td>
                  <td data-label="Pricing context">{rate.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-sm">
          Standard upfront fee:{" "}
          <span className="tnum font-semibold">
            {money(policy.quoteFeeSetting.standardUpfrontFee)}
          </span>
          . Monthly fee:{" "}
          <span className="tnum font-semibold">
            {money(policy.quoteFeeSetting.monthlyFee)}
          </span>
          .
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          A comparison rate and a reference product fee schedule are context.
          Only explicit quote fee settings and applied overrides contribute to
          the calculator’s economics. A customer-rate scenario is a preview
          until you apply it to the formal requested rate.
        </p>
        <details className="mt-5 border-y border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Channel and cost-of-funds defaults
          </summary>
          <PolicyRows
            value={{
              profitability: policy.formConfig.profitabilityDefaults,
              costOfFunds: policy.formConfig.costOfFundsDefaults,
            }}
          />
        </details>
      </section>
      <section
        id="guide-economics"
        className="mt-9 scroll-mt-24 border-t border-border pt-6"
      >
        <h2 className="demo-section-heading">
          Profitability, capital and review
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          The calculator estimates annual interest income, funding costs,
          commission, fee income, other income and operating expenses. Expected
          credit loss is deducted once to form canonical profit. Online
          scenarios always set commission to zero.
        </p>
        <div className="mt-4 space-y-3 border-y border-border py-4 text-sm">
          <p>Risk-weighted assets = regulatory exposure × risk weight.</p>
          <p>
            Allocated capital = risk-weighted assets ×{" "}
            <span className="tnum">{percent(policy.capitalRatioPct)}</span>.
          </p>
          <p>Return on equity = profit after tax ÷ allocated capital.</p>
          <p>
            Positive profit uses the fictional{" "}
            <span className="tnum">{percent(PROFITABILITY_TAX_RATE_PCT)}</span>{" "}
            tax assumption unless explicitly overridden.
          </p>
        </div>
        <p className="mt-4 max-w-prose text-sm leading-relaxed">
          Capital follows the calculator’s APS 112 classification path for the
          chosen exposure, security and facility. Unconfirmed classifications
          block review acceptance. An override retains the derived result and
          the reason alongside the applied value. The display is an illustration
          of the implemented calculation, not an assessment of a real borrower.
        </p>
        <details className="mt-5 border-y border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Pricing review thresholds
          </summary>
          <PolicyRows value={policy.approvalPolicy} />
        </details>
        <details className="border-b border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Margin policy
          </summary>
          <PolicyRows value={policy.marginPolicy} />
        </details>
        {policy.affordabilityPolicy && (
          <details className="border-b border-border py-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
              {area === "commercial"
                ? "Cash-flow coverage bands"
                : "Affordability thresholds"}
            </summary>
            <PolicyRows value={policy.affordabilityPolicy} />
          </details>
        )}
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          Saved inputs, calculations and policy stay frozen. Revisions create a
          new record. Assignment, comments, stars and review decisions append to
          the shared operational history in this browser.
        </p>
      </section>
      <section
        id="guide-credit-loss"
        className="mt-9 scroll-mt-24 border-t border-border pt-6"
      >
        <h2 className="demo-section-heading">Expected credit loss</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          Annual expected loss = probability of default (PD) × loss given
          default (LGD) × exposure at default (EAD). A separate credit-risk
          assessment uses the model’s eligible risk facts and a compatible
          policy version. Missing risk data stays incomplete; a provisional
          amount does not turn it into a complete assessment.
        </p>
        <details className="mt-4 border-y border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Probability of default bands
          </summary>
          <table className="demo-table">
            <thead>
              <tr>
                <th scope="col">Risk grade</th>
                <th scope="col">Minimum risk score</th>
                <th scope="col">Annual PD</th>
              </tr>
            </thead>
            <tbody>
              {policy.expectedLossPolicy.pdBands.map((band) => (
                <tr key={band.id}>
                  <td data-label="Risk grade">{band.riskGrade}</td>
                  <td data-label="Minimum risk score" className="tnum">
                    {band.minRiskScore}
                  </td>
                  <td data-label="Annual PD" className="tnum">
                    {percent(band.annualPdPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details className="border-b border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Loss given default by security scope
          </summary>
          <table className="demo-table">
            <thead>
              <tr>
                <th scope="col">Loss scope</th>
                <th scope="col">LGD</th>
              </tr>
            </thead>
            <tbody>
              {policy.expectedLossPolicy.lgdBands.map((band) => (
                <tr key={band.id}>
                  <td data-label="Loss scope">{human(band.lossScope)}</td>
                  <td data-label="LGD" className="tnum">
                    {percent(band.lgdPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details className="border-b border-border py-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
            Exposure methods
          </summary>
          <table className="demo-table">
            <thead>
              <tr>
                <th scope="col">Exposure</th>
                <th scope="col">Method</th>
                <th scope="col">Undrawn conversion factor</th>
              </tr>
            </thead>
            <tbody>
              {policy.expectedLossPolicy.eadSettings.map((setting) => (
                <tr key={setting.id}>
                  <td data-label="Exposure">{human(setting.exposureScope)}</td>
                  <td data-label="Method">{human(setting.method)}</td>
                  <td data-label="Undrawn conversion factor" className="tnum">
                    {setting.undrawnCcfPct == null
                      ? "Not applicable"
                      : percent(setting.undrawnCcfPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
          A manual expected-loss override requires an explicit reason. Saving
          records Demo user as the actor. Review acceptance checks the saved
          capital classification and the completed expected-loss calculation or
          reasoned override.
        </p>
      </section>
      <div className="demo-no-print mt-8">
        <Link className="demo-button" href={`${AREA_INFO[area].path}/new/`}>
          Try the {AREA_INFO[area].singular.toLowerCase()} calculator
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <article className="max-w-4xl">
      <PageHeader
        title="About this project"
        caption="A portfolio demonstration by Alexander Chieng."
      />
      <p className="max-w-prose font-serif text-2xl leading-relaxed">
        A lending decision should be possible to follow from its inputs to the
        final number.
      </p>
      <p className="mt-5 max-w-prose text-sm leading-relaxed">
        I built a pricing workspace for Home, Personal and Commercial lending,
        with detailed calculators and a shared quote workflow. This public
        edition uses fictional products, pricing policy, customers and market
        evidence so you can explore the interaction and implementation.
      </p>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="demo-section-heading">Explore the work</h2>
        <ol className="mt-4 space-y-4 text-sm leading-relaxed">
          <li>
            <span className="font-semibold">Calculate a scenario.</span> Open a
            product area and load a sample. Inspect the suggested rate,
            repayment, score, expected loss, profitability and capital
            allocation.
          </li>
          <li>
            <span className="font-semibold">
              Try a different customer rate.
            </span>{" "}
            Preview the economic effect, then explicitly apply the scenario
            before saving.
          </li>
          <li>
            <span className="font-semibold">
              Follow a quote through review.
            </span>{" "}
            Save a record, create a revision, assign it to a fictional
            colleague, add a comment and record a review decision.
          </li>
          <li>
            <span className="font-semibold">
              Bring context to the decision.
            </span>{" "}
            Compare fictional market products and attach a selected rate as
            evidence. The pricing model remains separate.
          </li>
        </ol>
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="demo-section-heading">How the application is built</h2>
        <dl className="mt-4 space-y-5 text-sm leading-relaxed">
          <div>
            <dt className="font-semibold">Three independent pricing domains</dt>
            <dd className="mt-1 text-muted">
              Each lending area owns its input validation, calculator and saved
              records. A shared operational envelope connects revisions,
              comments, assignment and review without combining the pricing
              models.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Transparent calculation snapshots</dt>
            <dd className="mt-1 text-muted">
              A save validates and recalculates the formal request, then stores
              the complete result and policy alongside it. Historical pricing
              stays frozen when a new revision is created.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">A browser workspace</dt>
            <dd className="mt-1 text-muted">
              React and Next.js serve the interface as a static export. Typed
              browser adapters run the calculations, and IndexedDB stores your
              quotes. There are no accounts, database servers or pricing API
              requests.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Careful interaction design</dt>
            <dd className="mt-1 text-muted">
              The workspace includes parameter search, progressive form
              sections, keyboard navigation, rate scenarios, responsive result
              panels and printable records. Validation and storage errors remain
              visible.
            </dd>
          </div>
        </dl>
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="demo-section-heading">Your local demo</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          Changes stay in this browser. A quote link points to a record in your
          local workspace, so it will not transfer your data to another browser.
          Reset demo restores the original examples. The source and
          demonstration contain no real customer records or original lender
          policy.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          All outputs are illustrative. This portfolio demonstrates software and
          workflow design; it does not offer lending products or make real
          credit decisions.
        </p>
      </section>
      <div className="demo-no-print mt-8 flex flex-wrap gap-3">
        <Link className="demo-button" href="/">
          Open the workspace
          <ArrowRight size={16} aria-hidden />
        </Link>
        <a
          className="demo-button-secondary"
          href="https://github.com/ajchieng/pricing-tool"
          target="_blank"
          rel="noreferrer"
        >
          View source on GitHub
          <ExternalLink size={16} aria-hidden />
        </a>
      </div>
    </article>
  );
}
