import { ScoreGuideTabs } from "@/components/score-guide/ScoreGuideTabs";
import { fmtMoney, fmtPct } from "@/lib/format";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import { COMMERCIAL_PROFITABILITY_TAX_RATE } from "@/lib/pricing/commercial/config";
import { getCommercialGuidePolicy } from "./demo-guide-policy";
import { labelCommercialLoanType } from "@/lib/pricing/commercial/labels";

function pct(value: number | null) {
  return value == null ? "Not configured" : fmtPct(value);
}

function money(value: number) {
  return fmtMoney(value, 2);
}

export default function CommercialProfitabilityGuide() {
  const policy = getCommercialGuidePolicy();
  const sampleDefaults =
    policy.profitabilityDefaults.find(
      (defaults) =>
        defaults.active &&
        defaults.channel === "direct" &&
        defaults.facilityType === "term_loan",
    ) ??
    policy.profitabilityDefaults.find((defaults) => defaults.active) ??
    null;
  const capitalRatio =
    policy.capitalRatioPct == null
      ? "Not configured"
      : fmtPct(policy.capitalRatioPct);

  return (
    <div className="space-y-6 pb-8">
      <ScoreGuideTabs
        active="profitability"
        guidePath={PRODUCT_AREAS.commercial.guidePath}
      />

      <section className="border-t border-border pt-5">
        <p className="text-sm font-medium text-brand">
          Pricing Tool · Pricing Engine
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
          Commercial loan profitability calculation guide
        </h1>
        <p className="mt-2 text-xs leading-5 text-muted">
          Fictional demonstration assumptions. Indicative examples only; not an
          offer or credit decision.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
          Commercial profitability uses a facility-specific annual exposure, not
          one generic balance. The same pricing result separately snapshots APS
          112 regulatory exposure, capital allocation and indicative return on
          equity.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <PolicyValue
          label="Tax rate"
          value={fmtPct(COMMERCIAL_PROFITABILITY_TAX_RATE * 100)}
        />
        <PolicyValue label="Governed capital ratio" value={capitalRatio} />
        <PolicyValue label="Online commission" value={money(0)} />
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Facility margin policy</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          Each facility selects its most specific active product and margin
          setting. A quote-level cost of funds override takes precedence.
          Estimated margin is the customer rate less cost of funds and is
          compared with the governed target and hard minimum.
        </p>
        <div
          className="mt-4 overflow-x-auto"
          role="region"
          aria-label="Commercial profitability assumptions by facility and Loan type"
          tabIndex={0}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Facility</th>
                <th className="py-2 pr-4 font-medium">Loan type</th>
                <th className="py-2 pr-4 font-medium">Base rate</th>
                <th className="py-2 pr-4 font-medium">Cost of funds</th>
                <th className="py-2 pr-4 font-medium">Target</th>
                <th className="py-2 font-medium">Hard minimum</th>
              </tr>
            </thead>
            <tbody>
              {policy.facilities.flatMap((facility) =>
                facility.rates.map((rate) => (
                  <tr
                    key={`${facility.facilityType}:${rate.loanType}`}
                    className="border-b border-border/70"
                  >
                    <td className="py-3 pr-4 font-medium">{facility.label}</td>
                    <td className="py-3 pr-4">
                      {labelCommercialLoanType(rate.loanType)}
                    </td>
                    <td className="tnum py-3 pr-4">
                      {facility.baseRateName} · {fmtPct(rate.rate)}
                    </td>
                    <td className="tnum py-3 pr-4">
                      {pct(facility.marginPolicy.estimatedCostOfFunds)}
                    </td>
                    <td className="tnum py-3 pr-4">
                      {pct(facility.marginPolicy.targetMargin)}
                    </td>
                    <td className="tnum py-3">
                      {pct(facility.marginPolicy.hardMinimumMargin)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Two exposure views</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Formula
            title="Profitability exposure"
            formula="term / equipment / property = full facility amount"
          >
            Amortising facilities use the full exposure for the annual lender
            P&amp;L. An overdraft instead uses the expected utilised exposure,
            based on the entered utilisation percentage.
          </Formula>
          <Formula
            title="Regulatory exposure"
            formula="overdraft = drawn balance + (undrawn commitment × CCF)"
          >
            APS 112 capital does not use expected P&amp;L utilisation. Other
            facilities generally use the full facility amount. The saved quote
            freezes the classification, risk weight and any reasoned demo
            override.
          </Formula>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Annual P&amp;L waterfall</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Formula
            title="Net interest income"
            formula="profitability exposure × (customer rate − cost of funds)"
          >
            Margin is applied to the facility-specific profitability exposure.
          </Formula>
          <Formula
            title="Net income"
            formula="net interest income − commission + other income + quote fees"
          >
            Online commission is always zero. The governed quote upfront fee
            plus twelve monthly fees are included in the first-year view.
          </Formula>
          <Formula
            title="Profit after tax"
            formula="operating profit = net income − expenses; ECL = PD × LGD × EAD; PBT = operating profit − ECL"
          >
            Negative profit produces zero tax, not a tax benefit. If expected
            loss is unavailable, an explicit provisional amount (default zero)
            can complete provisional P&L while risk assessment remains
            incomplete. Review acceptance requires a saved, reasoned override.
          </Formula>
          <Formula
            title="Indicative ROE"
            formula="profit after tax ÷ (regulatory exposure × risk weight × capital ratio)"
          >
            ROE uses allocated regulatory capital, so its denominator can differ
            from the P&amp;L exposure used above.
          </Formula>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">
          Governed defaults and zero fallback
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          Blank annual line items resolve from the matching active channel ×
          facility default. When no active row matches, commissions, other
          income and expenses each resolve to zero; there are no code-fallback
          commercial profitability assumptions.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PolicyValue
            label="Commission"
            value={pct(sampleDefaults?.commissionsPct ?? null)}
          />
          <PolicyValue
            label="Other income"
            value={pct(sampleDefaults?.otherIncomePct ?? null)}
          />
          <PolicyValue
            label="Expenses"
            value={pct(sampleDefaults?.expensesPct ?? null)}
          />
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Example row: {sampleDefaults?.channel ?? "no active channel"} ·{" "}
          {sampleDefaults?.facilityType ?? "no active facility"}. The guide
          reads the same bundled fictional policy source as pricing.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Expected loss comes only from the active compatible PD/LGD/EAD policy;
          missing policy or facts never resolve to zero loss.
        </p>
      </section>

      <section className="border-y border-border py-5">
        <h2 className="text-lg font-semibold">
          Quote fees versus facility fees
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Formula
            title="Included quote fees"
            formula={`first-year fee income = effective upfront fee + (12 × effective monthly fee); governed defaults: ${money(policy.quoteFeeSetting.standardUpfrontFee)} upfront, ${money(policy.quoteFeeSetting.monthlyFee)} monthly`}
          >
            The governed amounts are the defaults. Staff may override either
            quote fee, and the effective monthly fee is annualised.
          </Formula>
          <Formula
            title="Excluded facility fees"
            formula="establishment + documentation + annual line fee = display only"
          >
            Commercial establishment fees, equipment documentation fees and
            overdraft annual line fees remain excluded from lender
            profitability. They are product context, not P&amp;L inputs.
          </Formula>
        </div>
      </section>
    </div>
  );
}

function PolicyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="tnum mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function Formula({
  title,
  formula,
  children,
}: {
  title: string;
  formula: string;
  children: React.ReactNode;
}) {
  return (
    <article className="border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-3 rounded-md bg-panel px-3 py-2 font-mono text-xs leading-5 text-ink">
        {formula}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{children}</p>
    </article>
  );
}
