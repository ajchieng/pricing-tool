import { calculateHome } from "@/lib/demo/pricing";
import { sampleInput } from "@/lib/demo/policy";
import { calcRequestSchema } from "@/lib/pricing/schema";
import { fmtMoney, fmtPct } from "@/lib/format";
import { ScoreGuideTabs } from "@/components/score-guide/ScoreGuideTabs";
import { PRODUCT_AREAS } from "@/lib/product-areas";
import { getHomeGuidePolicy } from "./demo-guide-policy";
import { PROFITABILITY_TAX_RATE } from "@/lib/pricing/profitability-policy";

const TAX_RATE = PROFITABILITY_TAX_RATE;
const TAX_RATE_DECIMAL = TAX_RATE.toFixed(2);
const TAX_RATE_LABEL = fmtPct(TAX_RATE * 100);
function exampleValue(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value))
    throw new Error(
      "The fictional guide example needs a complete calculation.",
    );
  return value;
}

// The illustration uses the demo calculator itself; no second calibration is embedded here.
const exampleInput = calcRequestSchema.parse(sampleInput("home"));
const initialResult = calculateHome(exampleInput);
const requestedRate =
  Math.round((exampleValue(initialResult.suggestedRate) - 0.1) * 100) / 100;
const exampleResult = calculateHome({ ...exampleInput, requestedRate });
const exampleProfitability = exampleResult.profitability;
const exampleLoss = exampleProfitability.expectedLoss;
const EXAMPLE_RISK_WEIGHT_PCT = exampleValue(
  exampleProfitability.capitalAllocation?.riskWeightPct,
);
const CAPITAL_RATIO_PCT = getHomeGuidePolicy().capitalRatioPct;
const EXAMPLE = {
  loanAmount: exampleInput.loanAmount,
  cardedRate: exampleValue(exampleResult.cardedRate),
  suggestedRate: exampleValue(exampleResult.suggestedRate),
  requestedRate,
  costOfFunds: exampleValue(exampleProfitability.costOfFunds),
  targetMargin: exampleValue(exampleResult.margin.targetMargin),
  hardMinimumMargin: exampleValue(exampleResult.margin.hardMinimumMargin),
  channel: "Direct",
  commissions: exampleValue(exampleProfitability.commissions),
  otherIncome: exampleValue(exampleProfitability.otherIncome),
  standardUpfrontFee: exampleProfitability.feeIncome.standardUpfrontFee,
  chargedUpfrontFee: exampleProfitability.feeIncome.chargedUpfrontFee,
  monthlyFee: exampleProfitability.feeIncome.monthlyFee,
  expenses: exampleValue(exampleProfitability.expenses),
  probabilityOfDefaultPct: exampleValue(exampleLoss?.probabilityOfDefaultPct),
  lossGivenDefaultPct: exampleValue(exampleLoss?.lossGivenDefaultPct),
  exposureAtDefault: exampleValue(exampleLoss?.ead?.amount),
};

const customerRate = exampleValue(exampleProfitability.customerRate);
const estimatedMargin = exampleValue(exampleProfitability.netInterestMargin);
const annualInterestRevenue = exampleValue(
  exampleProfitability.estimatedAnnualInterestRevenue,
);
const annualFundingCost = exampleValue(
  exampleProfitability.estimatedAnnualFundingCost,
);
const annualNetInterestIncome = exampleValue(
  exampleProfitability.estimatedAnnualNetInterestIncome,
);
const revenueLostVsCarded = exampleValue(
  exampleProfitability.revenueLostVsCarded,
);
const revenueLostVsSuggested = exampleValue(
  exampleProfitability.revenueLostVsSuggested,
);
const grossMarginDollars = annualNetInterestIncome;
const annualRecurringFeeIncome =
  exampleProfitability.feeIncome.annualRecurringFeeIncome;
const firstYearFeeIncome = exampleProfitability.feeIncome.firstYearFeeIncome;
const netIncome = exampleValue(exampleProfitability.netIncome);
const operatingProfitBeforeCreditLoss = exampleValue(
  exampleLoss?.operatingProfitBeforeCreditLossAmount,
);
const expectedCreditLoss = exampleValue(
  exampleLoss?.effectiveExpectedCreditLossAmount,
);
const profitBeforeTax = exampleValue(exampleProfitability.profitBeforeTax);
const tax = exampleValue(exampleProfitability.tax);
const profitAfterTax = exampleValue(exampleProfitability.profitAfterTax);
const averageOutstandingBalance = exampleValue(
  exampleProfitability.averageAssets,
);
const returnOnAssets = exampleValue(exampleProfitability.returnOnAssets);
const riskWeightedAssets = exampleValue(
  exampleProfitability.capitalAllocation?.riskWeightedAssets,
);
const allocatedCapital = exampleValue(
  exampleProfitability.capitalAllocation?.allocatedCapital,
);
const returnOnEquity = exampleValue(
  exampleProfitability.capitalAllocation?.returnOnEquity,
);

const FORMULA_STEPS = [
  {
    title: "1. Effective customer rate",
    formula: "customerRate = effective requested rate ?? suggestedRate",
    detail:
      "Profitability uses the final customer rate after requested-rate and retention constraints. An eligible requested rate takes precedence; otherwise the suggested rate is used.",
    example: `${fmtPct(EXAMPLE.requestedRate)} is present, so customerRate = ${fmtPct(customerRate)}.`,
  },
  {
    title: "2. Annual interest revenue",
    formula:
      "interestRevenue = sum(monthly opening balance x customerRate / 1200)",
    detail:
      "The first-year schedule reduces principal after each monthly payment. Monthly interest is calculated on that month’s opening balance and summed over twelve months, or the remaining term if shorter.",
    example: `The ${fmtMoney(EXAMPLE.loanAmount)} opening loan at ${fmtPct(customerRate)} produces ${fmtMoney(annualInterestRevenue, 2)} of scheduled first-year interest.`,
  },
  {
    title: "3. Funding cost",
    formula: "fundingCost = sum(monthly opening balance x costOfFunds / 1200)",
    detail:
      "Funding cost uses the same declining monthly opening balances as interest revenue. Quote input cost of funds wins when entered and non-negative; otherwise the matching margin setting supplies it.",
    example: `Monthly scheduled funding costs at ${fmtPct(EXAMPLE.costOfFunds)} sum to ${fmtMoney(annualFundingCost, 2)}.`,
  },
  {
    title: "4. Net interest income",
    formula: "netInterestIncome = interestRevenue - fundingCost",
    detail:
      "This is the scheduled dollar spread before commissions, other income, operating expenses, expected credit loss and tax.",
    example: `${fmtMoney(annualInterestRevenue, 2)} - ${fmtMoney(annualFundingCost, 2)} = ${fmtMoney(annualNetInterestIncome, 2)}.`,
  },
  {
    title: "5. Net interest margin",
    formula: "estimatedMargin = customerRate - costOfFunds",
    detail:
      "The result is percentage points, rounded to 2 decimals. Margin health compares this figure to target and hard minimum thresholds.",
    example: `${customerRate.toFixed(2)} - ${EXAMPLE.costOfFunds.toFixed(2)} = ${fmtPct(estimatedMargin)}.`,
  },
  {
    title: "6. Revenue lost versus benchmark rates",
    formula:
      "revenueLost = scheduled interest at benchmark rate - scheduled interest at customer rate",
    detail:
      "The engine constructs a separate first-year schedule at the carded or suggested benchmark rate, using the same principal and term. The difference can be negative if the customer rate is above that benchmark.",
    example: `Scheduled interest difference: ${fmtMoney(revenueLostVsCarded, 2)} versus carded, ${fmtMoney(revenueLostVsSuggested, 2)} versus suggested.`,
  },
  {
    title: "7. Gross margin dollars",
    formula:
      "grossMarginDollars = scheduled interest revenue - scheduled funding cost",
    detail:
      "The P&L waterfall uses net interest income from the declining-balance schedule. Multiplying the opening loan amount by the percentage margin would overstate this subtotal.",
    example: `${fmtMoney(annualInterestRevenue, 2)} - ${fmtMoney(annualFundingCost, 2)} = ${fmtMoney(grossMarginDollars, 2)}.`,
  },
  {
    title: "8. Net income",
    formula:
      "netIncome = grossMarginDollars - commissions + otherIncome + chargedUpfrontFee + (monthlyFee x 12)",
    detail:
      "The governed upfront and monthly fees are defaults that may each be overridden per quote. The effective monthly fee is annualised for this first-year view. Online channel always forces commissions to zero.",
    example: `${fmtMoney(grossMarginDollars, 2)} - ${fmtMoney(EXAMPLE.commissions, 2)} + ${fmtMoney(EXAMPLE.otherIncome, 2)} + ${fmtMoney(firstYearFeeIncome, 2)} = ${fmtMoney(netIncome, 2)}.`,
  },
  {
    title: "9. Operating profit before credit loss",
    formula: "operatingProfit = netIncome - expenses",
    detail:
      "This subtotal remains available even when expected loss cannot be calculated.",
    example: `${fmtMoney(netIncome, 2)} - ${fmtMoney(EXAMPLE.expenses, 2)} = ${fmtMoney(operatingProfitBeforeCreditLoss, 2)}.`,
  },
  {
    title: "10. Expected credit loss",
    formula: "ECL = exposureAtDefault x PD x LGD",
    detail:
      "PD comes from the risk-only score, LGD from the product and security scope, and EAD from the governed exposure method. There is no compiled or zero-loss fallback.",
    example: `${fmtMoney(EXAMPLE.exposureAtDefault, 2)} x ${fmtPct(EXAMPLE.probabilityOfDefaultPct)} x ${fmtPct(EXAMPLE.lossGivenDefaultPct)} = ${fmtMoney(expectedCreditLoss, 2)}.`,
  },
  {
    title: "11. Profit before tax",
    formula: "profitBeforeTax = operatingProfit - expectedCreditLoss",
    detail:
      "When model expected loss is unavailable, an explicit provisional amount (default zero) can complete provisional P&L. Risk assessment stays incomplete and review acceptance requires a saved, reasoned override.",
    example: `${fmtMoney(operatingProfitBeforeCreditLoss, 2)} - ${fmtMoney(expectedCreditLoss, 2)} = ${fmtMoney(profitBeforeTax, 2)}.`,
  },
  {
    title: "12. Tax expense",
    formula: `tax = max(0, profitBeforeTax) x ${TAX_RATE_DECIMAL}`,
    detail: `The model taxes positive profit before tax at ${TAX_RATE_LABEL}. Negative profit before tax produces zero tax, not a tax benefit.`,
    example: `max(0, ${fmtMoney(profitBeforeTax, 2)}) x ${TAX_RATE_DECIMAL} = ${fmtMoney(tax, 2)}.`,
  },
  {
    title: "13. Profit after tax",
    formula: "profitAfterTax = profitBeforeTax - tax",
    detail:
      "This is the final dollar profitability estimate for the quote scenario.",
    example: `${fmtMoney(profitBeforeTax, 2)} - ${fmtMoney(tax, 2)} = ${fmtMoney(profitAfterTax, 2)}.`,
  },
  {
    title: "14. Return on assets",
    formula:
      "returnOnAssets = (profitAfterTax / averageOutstandingBalance) x 100",
    detail:
      "ROA uses the average monthly opening balance from the same first-year cash-flow schedule. Profit after tax and a positive average asset base are required.",
    example: `(${fmtMoney(profitAfterTax, 2)} / ${fmtMoney(averageOutstandingBalance, 2)}) x 100 = ${fmtPct(returnOnAssets)}.`,
  },
  {
    title: "15. Risk-weighted assets",
    formula: "riskWeightedAssets = regulatoryExposure x riskWeightPct / 100",
    detail: `The exposure classification and risk weight are derived from APS 112. This worked example uses the calculator’s confirmed ${EXAMPLE_RISK_WEIGHT_PCT}% residential-mortgage risk weight.`,
    example: `${fmtMoney(EXAMPLE.loanAmount)} x (${EXAMPLE_RISK_WEIGHT_PCT} / 100) = ${fmtMoney(riskWeightedAssets, 2)}.`,
  },
  {
    title: "16. Allocated capital",
    formula: "allocatedCapital = riskWeightedAssets x capitalRatioPct / 100",
    detail: `The worked example uses the fictional ${CAPITAL_RATIO_PCT}% capital ratio used by the demo calculator. This is a pricing assumption and is not presented as an APS 112 minimum.`,
    example: `${fmtMoney(riskWeightedAssets, 2)} x (${CAPITAL_RATIO_PCT} / 100) = ${fmtMoney(allocatedCapital, 2)}.`,
  },
  {
    title: "17. Return on equity",
    formula: "returnOnEquity = profitAfterTax / allocatedCapital x 100",
    detail:
      "Indicative ROE is a pricing decision-support measure derived from the saved profitability and capital snapshots.",
    example: `(${fmtMoney(profitAfterTax, 2)} / ${fmtMoney(allocatedCapital, 2)}) x 100 = ${fmtPct(returnOnEquity)}.`,
  },
];

const NULL_RULES = [
  [
    "customerRate",
    "Unavailable if neither requested nor suggested rate exists.",
  ],
  [
    "costOfFunds",
    "Quote input must be >= 0. Otherwise it falls back to the selected active margin setting.",
  ],
  [
    "loanAmount",
    "Must be > 0. Zero, negative or blank makes the P&L waterfall unavailable.",
  ],
  [
    "commissions",
    "Online channel forces 0. Broker/direct use the entered value; blank is treated as 0 in rollups.",
  ],
  [
    "otherIncome, expenses",
    "Stored as nullable inputs, but treated as 0 once the related subtotal can be calculated.",
  ],
  [
    "expectedLoss",
    "Unavailable unless the active policy is complete, compatible and all required risk facts are present. It is never assumed to be zero.",
  ],
  [
    "tax, ROA and ROE",
    "An explicit provisional loss amount can complete provisional P&L while risk assessment remains incomplete. Review acceptance requires a saved, reasoned override. Tax is never negative.",
  ],
];

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-l border-border-strong py-0.5 pl-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="tnum mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}

function FormulaCard({
  title,
  formula,
  detail,
  example,
}: {
  title: string;
  formula: string;
  detail: string;
  example: string;
}) {
  return (
    <article className="border-t border-border pt-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-3 rounded-md bg-panel px-3 py-2 font-mono text-sm text-ink">
        {formula}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
      <p className="mt-3 border-t border-border pt-3 font-mono text-xs leading-5 text-muted">
        {example}
      </p>
    </article>
  );
}

export default function HomeProfitabilityGuide() {
  const policy = getHomeGuidePolicy();
  const sampleMargin =
    policy.marginSettings.find(
      (setting) =>
        setting.active &&
        setting.productId == null &&
        setting.loanPurpose == null &&
        setting.rateType == null,
    ) ??
    policy.marginSettings.find((setting) => setting.active) ??
    null;
  const defaultChannel = (["direct", "broker", "online"] as const).find(
    (channel) => policy.profitabilityDefaults[channel] != null,
  );
  const sampleDefaults = defaultChannel
    ? policy.profitabilityDefaults[defaultChannel]
    : null;
  const policyPct = (value: number | null | undefined) =>
    value == null ? "Not configured" : fmtPct(value);

  return (
    <div className="space-y-6 pb-8">
      <ScoreGuideTabs
        active="profitability"
        guidePath={PRODUCT_AREAS.home.guidePath}
      />

      <section className="border-t border-border pt-5">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              Pricing Tool · Pricing Engine
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.01em]">
              Home loan profitability calculation guide
            </h1>
            <p className="mt-2 text-xs leading-5 text-muted">
              Fictional demonstration assumptions. Indicative examples only; not
              an offer or credit decision.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              This page documents the home loan quote P&amp;L waterfall.
              Customer score explains why the suggested rate moves.
              Profitability explains the margin, revenue and P&amp;L mathematics
              after a customer rate has been selected.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-surface text-center">
            <div className="p-4">
              <p className="text-xs text-muted">Worked-example tax</p>
              <p className="tnum mt-1 text-2xl font-semibold">
                {TAX_RATE_LABEL}
              </p>
            </div>
            <div className="border-x border-border p-4">
              <p className="text-xs text-muted">Worked-example capital</p>
              <p className="tnum mt-1 text-2xl font-semibold">
                {fmtPct(CAPITAL_RATIO_PCT)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted">Online commission</p>
              <p className="tnum mt-1 text-2xl font-semibold">$0</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border py-5">
        <h2 className="text-lg font-semibold">Current governed assumptions</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          These fictional values come from the same bundled policy used by
          pricing. Margin rows may be more specific by product, purpose and rate
          type; the values below show the generic row when present, or the first
          active row. Profitability defaults visibly pre-fill the form and are
          saved as annual dollars.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Capital ratio", policyPct(policy.capitalRatioPct)],
            [
              "Standard upfront quote fee",
              fmtMoney(policy.quoteFeeSetting.standardUpfrontFee, 2),
            ],
            [
              "Monthly quote fee",
              fmtMoney(policy.quoteFeeSetting.monthlyFee, 2),
            ],
            ["Cost of funds", policyPct(sampleMargin?.estimatedCostOfFunds)],
            ["Target margin", policyPct(sampleMargin?.targetMargin)],
            ["Hard minimum", policyPct(sampleMargin?.hardMinimumMargin)],
            ["Default commission", policyPct(sampleDefaults?.commissionsPct)],
            ["Default other income", policyPct(sampleDefaults?.otherIncomePct)],
            ["Default expenses", policyPct(sampleDefaults?.expensesPct)],
            [
              "Expected-loss policy",
              policy.expectedLossPolicy
                ? `v${policy.expectedLossPolicy.version}`
                : "Not configured",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-panel p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="tnum mt-1 text-lg font-semibold text-ink">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Default example: {defaultChannel ?? "no active channel"}. Quote fee
          policy is{" "}
          {policy.quoteFeeSetting.configured ? "configured" : "unavailable"};
          unavailable policy resolves both quote fees to zero and produces a
          pricing warning.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <Metric
          label="Customer rate"
          value={fmtPct(customerRate)}
          hint="Requested rate wins over suggested rate."
        />
        <Metric
          label="Estimated margin"
          value={fmtPct(estimatedMargin)}
          hint="Customer rate minus cost of funds."
        />
        <Metric
          label="Profit after tax"
          value={fmtMoney(profitAfterTax)}
          hint={`After expenses, expected credit loss and ${TAX_RATE_LABEL} tax.`}
        />
        <Metric
          label="Return on assets"
          value={fmtPct(returnOnAssets)}
          hint="Profit after tax divided by average scheduled balance."
        />
        <Metric
          label="Return on equity"
          value={fmtPct(returnOnEquity)}
          hint="Profit after tax divided by allocated capital."
        />
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Margin setting selection</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          Cost of funds, target margin and hard minimum margin come from the
          quote input and active margin settings. The quote input cost of funds
          wins when it is entered and non-negative. Otherwise the engine filters
          active margin settings to those matching the product, loan purpose and
          rate type, where a blank setting field means “any”. If more than one
          setting matches, specificity wins: product match is worth 4 points,
          loan-purpose match is worth 2 points and rate-type match is worth 1
          point. The highest score is used.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
          If no margin setting matches, the engine can still calculate margin
          from the quote input cost of funds alone. In that fallback path,
          target margin and hard minimum margin are blank and the margin status
          is treated as healthy. If neither an input cost of funds nor a
          matching margin setting exists, margin and profitability status are
          unavailable.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-panel p-4">
            <p className="text-sm font-semibold">Healthy</p>
            <p className="mt-1 font-mono text-xs text-muted">
              estimatedMargin &gt;= targetMargin
            </p>
          </div>
          <div className="rounded-lg bg-panel p-4">
            <p className="text-sm font-semibold">Below target</p>
            <p className="mt-1 font-mono text-xs text-muted">
              hardMinimumMargin &lt;= estimatedMargin &lt; targetMargin
            </p>
          </div>
          <div className="rounded-lg bg-panel p-4">
            <p className="text-sm font-semibold">Below hard minimum</p>
            <p className="mt-1 font-mono text-xs text-muted">
              estimatedMargin &lt; hardMinimumMargin
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border py-5">
        <h2 className="text-lg font-semibold text-ink">
          Capital snapshot and acceptance
        </h2>
        <div className="mt-3 grid gap-x-6 md:grid-cols-2">
          <div className="border-t border-border py-4">
            <h3 className="text-sm font-semibold text-ink">
              Historical figures stay frozen
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              The saved profitability record includes regulatory exposure, APS
              112 classification, risk weight, risk-weighted assets, governed
              capital ratio, allocated capital and indicative ROE. Historical
              quotes are never recalculated from later policy settings.
            </p>
          </div>
          <div className="border-t border-border py-4">
            <h3 className="text-sm font-semibold text-ink">
              Confirmation is a separate control
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              An unconfirmed classification uses a conservative provisional
              result and blocks quote acceptance. Demo risk-weight and CCF
              overrides require a reason; the derived value, reason and browser
              history event are retained.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {FORMULA_STEPS.map((step) => (
          <FormulaCard key={step.title} {...step} />
        ))}
      </section>

      <section className="border-y border-border">
        <div className="border-b border-border px-0 py-3">
          <p className="font-mono text-xs text-muted">
            Scenario math · {fmtMoney(EXAMPLE.loanAmount)} loan ·{" "}
            {fmtPct(customerRate)} customer rate · {fmtPct(EXAMPLE.costOfFunds)}{" "}
            cost of funds
          </p>
        </div>
        <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="p-5">
            <h2 className="text-sm font-semibold">Rate and spread</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              {[
                ["Carded rate", fmtPct(EXAMPLE.cardedRate)],
                ["Suggested rate", fmtPct(EXAMPLE.suggestedRate)],
                ["Requested/customer rate", fmtPct(customerRate)],
                ["Cost of funds", fmtPct(EXAMPLE.costOfFunds)],
                ["Estimated margin", fmtPct(estimatedMargin)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tnum font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="p-5">
            <h2 className="text-sm font-semibold">Annual revenue</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              {[
                ["Interest revenue", fmtMoney(annualInterestRevenue, 2)],
                ["Funding cost", fmtMoney(annualFundingCost, 2)],
                ["Net interest income", fmtMoney(annualNetInterestIncome, 2)],
                [
                  "Average outstanding balance",
                  fmtMoney(averageOutstandingBalance, 2),
                ],
                ["Lost vs carded", fmtMoney(revenueLostVsCarded, 2)],
                ["Lost vs suggested", fmtMoney(revenueLostVsSuggested, 2)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tnum font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="p-5">
            <h2 className="text-sm font-semibold">P&amp;L waterfall</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              {[
                ["Gross margin dollars", fmtMoney(grossMarginDollars, 2)],
                ["Commission cost", fmtMoney(EXAMPLE.commissions, 2)],
                ["Other income", fmtMoney(EXAMPLE.otherIncome, 2)],
                [
                  "Standard upfront fee",
                  fmtMoney(EXAMPLE.standardUpfrontFee, 2),
                ],
                ["Charged upfront fee", fmtMoney(EXAMPLE.chargedUpfrontFee, 2)],
                ["Monthly fee", fmtMoney(EXAMPLE.monthlyFee, 2)],
                [
                  "Monthly fees (12 months)",
                  fmtMoney(annualRecurringFeeIncome, 2),
                ],
                [
                  "Total first-year fee income",
                  fmtMoney(firstYearFeeIncome, 2),
                ],
                ["Net income", fmtMoney(netIncome, 2)],
                ["Expenses", fmtMoney(EXAMPLE.expenses, 2)],
                [
                  "Operating profit before credit loss",
                  fmtMoney(operatingProfitBeforeCreditLoss, 2),
                ],
                ["Expected credit loss", fmtMoney(expectedCreditLoss, 2)],
                ["Profit before tax", fmtMoney(profitBeforeTax, 2)],
                ["Tax expense", fmtMoney(tax, 2)],
                ["Profit after tax", fmtMoney(profitAfterTax, 2)],
                ["Return on assets", fmtPct(returnOnAssets)],
                ["Risk-weighted assets", fmtMoney(riskWeightedAssets, 2)],
                ["Allocated capital", fmtMoney(allocatedCapital, 2)],
                ["Return on equity", fmtPct(returnOnEquity)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tnum font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-semibold text-ink">
          Nulls, defaults and exact implementation rules
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {NULL_RULES.map(([label, detail]) => (
            <div key={label} className="rounded-xl bg-surface p-4">
              <p className="font-mono text-xs text-brand-strong">{label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          The schedule rounds each monthly interest and funding-cost amount to
          cents before summing. Monetary outputs use two decimal places;
          calculated return percentages retain six decimal places and are
          displayed here to two decimal places.
        </p>
      </section>
    </div>
  );
}
