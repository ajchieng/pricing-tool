import { ScoreGuideTabs } from "@/components/score-guide/ScoreGuideTabs";
import { fmtMoney, fmtPct } from "@/lib/format";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import {
  PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS,
  PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS,
  PERSONAL_PROFITABILITY_TAX_RATE,
} from "@/lib/pricing/personal/config";
import { getPersonalGuidePolicy } from "./demo-guide-policy";

function pct(value: number | null) {
  return value == null ? "Not configured" : fmtPct(value);
}

function money(value: number) {
  return fmtMoney(value, 2);
}

export default function PersonalProfitabilityGuide() {
  const policy = getPersonalGuidePolicy();
  const sampleMargin =
    policy.marginSettings.find(
      (setting) => setting.active && setting.securityType === "secured",
    ) ??
    policy.marginSettings.find((setting) => setting.active) ??
    null;
  const sampleDefaults =
    policy.profitabilityDefaults.find(
      (defaults) =>
        defaults.active &&
        defaults.channel === "direct" &&
        defaults.securityType === "secured",
    ) ??
    policy.profitabilityDefaults.find((defaults) => defaults.active) ??
    null;
  const sampleChannel = sampleDefaults?.channel ?? "direct";
  const sampleSecurity = sampleDefaults?.securityType ?? "secured";
  const channelFallback =
    PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS[sampleChannel];
  const securityFallback =
    PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS[sampleSecurity];
  const capitalRatio =
    policy.capitalRatioPct == null
      ? "Not configured"
      : fmtPct(policy.capitalRatioPct);

  return (
    <div className="space-y-6 pb-8">
      <ScoreGuideTabs
        active="profitability"
        guidePath={PRODUCT_AREAS.personal.guidePath}
      />

      <section className="border-t border-border pt-5">
        <p className="text-sm font-medium text-brand">
          Pricing Tool · Pricing Engine
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
          Personal loan profitability calculation guide
        </h1>
        <p className="mt-2 text-xs leading-5 text-muted">
          Fictional demonstration assumptions. Indicative examples only; not an
          offer or credit decision.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
          Customer score determines the ordinary suggested rate. The
          profitability calculation starts from the effective customer rate and
          records a first-year P&amp;L, capital allocation and indicative return
          on equity. Retention constraints and affordability remain separate
          pricing and policy checks.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border-l border-border-strong pl-4">
          <p className="text-xs text-muted">Tax rate</p>
          <p className="tnum mt-1 text-2xl font-semibold">
            {fmtPct(PERSONAL_PROFITABILITY_TAX_RATE * 100)}
          </p>
        </div>
        <div className="border-l border-border-strong pl-4">
          <p className="text-xs text-muted">Governed capital ratio</p>
          <p className="tnum mt-1 text-2xl font-semibold">{capitalRatio}</p>
        </div>
        <div className="border-l border-border-strong pl-4">
          <p className="text-xs text-muted">Online commission</p>
          <p className="tnum mt-1 text-2xl font-semibold">{money(0)}</p>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Margin policy</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          The engine selects the most specific active margin setting for the
          chosen product and secured or unsecured class. A quote-level cost of
          funds override takes precedence. Estimated margin is the effective
          customer rate less cost of funds and is compared with the governed
          target and hard minimum. If no margin row matches, the built-in
          bootstrap cost of funds is used and the target thresholds are absent.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PolicyValue
            label="Cost of funds"
            value={pct(
              sampleMargin?.estimatedCostOfFunds ??
                securityFallback.costOfFunds,
            )}
          />
          <PolicyValue
            label="Target margin"
            value={pct(sampleMargin?.targetMargin ?? null)}
          />
          <PolicyValue
            label="Hard minimum"
            value={pct(sampleMargin?.hardMinimumMargin ?? null)}
          />
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">First-year P&amp;L waterfall</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Formula
            title="Interest and funding"
            formula="gross margin = sum(monthly interest − monthly funding cost)"
          >
            The first-year schedule calculates monthly interest and funding cost
            on each monthly opening balance, reducing principal after
            repayments. It runs for twelve months or the remaining term if
            shorter.
          </Formula>
          <Formula
            title="Income"
            formula="net income = gross margin − commission + other income + quote fees"
          >
            Quote fees are the charged upfront fee plus twelve effective monthly
            fees after any quote override. Online always contributes zero
            commission.
          </Formula>
          <Formula
            title="Profit and tax"
            formula="operating profit = net income − expenses; ECL = PD × LGD × EAD; PBT = operating profit − ECL"
          >
            Tax is charged only on positive profit before tax. If the governed
            expected-loss policy or a required risk fact is unavailable, the
            operating profit remains visible. An explicit provisional loss
            amount (default zero) can complete provisional P&L while risk
            assessment stays incomplete. Review acceptance requires a saved,
            reasoned override.
          </Formula>
          <Formula
            title="Return on assets"
            formula="ROA = profit after tax ÷ average scheduled outstanding balance"
          >
            The denominator is the average monthly opening balance from the same
            first-year schedule used by interest and funding calculations.
            Regulatory capital separately uses the quoted exposure.
          </Formula>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">
          Defaults used when quote inputs are blank
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Defaults are percentages of loan amount per annum. Staff-entered
          values win; then the active channel × security row is used per field.
          The values below show the defaults used when a quote input is blank.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PolicyValue
            label="Commission"
            value={pct(
              sampleDefaults?.commissionsPct ?? channelFallback.commissionsPct,
            )}
          />
          <PolicyValue
            label="Other income"
            value={pct(
              sampleDefaults?.otherIncomePct ?? channelFallback.otherIncomePct,
            )}
          />
          <PolicyValue
            label="Expenses"
            value={pct(
              sampleDefaults?.expensesPct ?? securityFallback.expensesPct,
            )}
          />
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Example basis: {sampleChannel} · {sampleSecurity}.{" "}
          {sampleDefaults
            ? "An active governed row exists; any blank field in it still falls back to code."
            : "No active governed row exists, so all three values shown are code fallbacks."}{" "}
          The guide reads the same bundled fictional policy source as pricing.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Expected loss is governed separately through the active PD/LGD/EAD
          policy and never falls back to a compiled percentage.
        </p>
      </section>

      <section className="border-y border-border py-5">
        <h2 className="text-lg font-semibold">Quote fees and capital</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Formula
            title="Governed quote fees"
            formula={`first-year fee income = effective upfront fee + (12 × effective monthly fee); governed defaults: ${money(policy.quoteFeeSetting.standardUpfrontFee)} upfront, ${money(policy.quoteFeeSetting.monthlyFee)} monthly`}
          >
            The governed amounts are the defaults, and staff may override either
            fee for the quote. Product catalogue fees are display context and do
            not enter profitability.
          </Formula>
          <Formula
            title="Indicative ROE"
            formula="ROE = profit after tax ÷ (regulatory exposure × APS 112 risk weight × capital ratio)"
          >
            The saved quote freezes the exposure classification, risk weight,
            governed capital ratio, allocated capital and ROE. A provisional
            classification blocks acceptance until confirmed.
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
