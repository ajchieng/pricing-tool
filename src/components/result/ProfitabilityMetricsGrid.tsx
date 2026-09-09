"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  PricingResult,
  Profitability,
  ProfitabilityChannel,
} from "@/lib/pricing/types";
import { KpiTile } from "@/components/ui/KpiTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Line, RailSegment } from "@/components/result/shared";
import { fmtMoney, fmtPct } from "@/lib/format";
import { MARGIN_STATUS } from "@/lib/status";
import { TONE } from "@/lib/tones";
import { CapitalAllocationResult } from "@/components/result/CapitalAllocationResult";
import { MarginHealthTrack } from "@/components/result/MarginHealthTrack";
import {
  ScenarioMetricDelta,
  ScenarioMetricValue,
} from "@/components/result/ScenarioMetricDelta";
import { ExpectedLossResult } from "@/components/result/ExpectedLossResult";

const CHANNEL_LABELS: Record<ProfitabilityChannel, string> = {
  broker: "Broker",
  online: "Online",
  direct: "Direct",
};

// Headline profitability as KPI tiles (annual interest revenue, funding cost,
// net interest income, NIM) with margin health; the full P&L waterfall stays
// available but collapsed.

export function ProfitabilityMetricsGrid({
  profitability: p,
  margin,
  bare = false,
  baselineProfitability,
}: {
  profitability: Profitability;
  margin: PricingResult["margin"];
  bare?: boolean;
  baselineProfitability?: Profitability | null;
}) {
  // Waterfall figures can be read as dollars or as a % of loan amount
  // (the classic spread waterfall). Toggle is display-only.
  const [profitMode, setProfitMode] = useState<"dollar" | "percent">("dollar");
  const [detailOpen, setDetailOpen] = useState(false);

  const marginState = MARGIN_STATUS[margin.status] ?? MARGIN_STATUS.unavailable;

  if (margin.status === "unavailable") {
    return (
      <RailSegment title={bare ? undefined : "Profitability"} bare={bare}>
        <p className="text-sm text-muted">
          Margin unavailable — cost of funds isn’t configured for this scenario.
        </p>
        {bare && (
          <div className="mt-2 border-t border-border pt-2">
            <Line
              label="Channel"
              value={CHANNEL_LABELS[p.channel] ?? "Direct"}
            />
            <Line label="Cost of funds" value={fmtPct(p.costOfFunds)} />
            <Line label="Commission cost" value={fmtMoney(p.commissions, 0)} />
            <Line label="Other income" value={fmtMoney(p.otherIncome, 0)} />
            <Line
              label="Charged upfront fee"
              value={fmtMoney(p.feeIncome.chargedUpfrontFee, 0)}
            />
            <Line
              label="Monthly fee"
              value={fmtMoney(p.feeIncome.monthlyFee, 0)}
            />
            <Line
              label="Monthly fees (12 months)"
              value={fmtMoney(p.feeIncome.annualRecurringFeeIncome, 0)}
            />
            <Line
              label="Total first-year fee income"
              value={fmtMoney(p.feeIncome.firstYearFeeIncome, 0)}
            />
            <Line label="Expenses" value={fmtMoney(p.expenses, 0)} />
            <ExpectedLossResult expectedLoss={p.expectedLoss} />
          </div>
        )}
      </RailSegment>
    );
  }

  // "%" mode needs a loan base to divide by; fall back to dollars without it.
  const profitabilityBase = p.averageAssets;
  const canShowPercent = profitabilityBase != null && profitabilityBase > 0;
  const showPercent = profitMode === "percent" && canShowPercent;
  const amount = (value: number | null) =>
    showPercent
      ? fmtPct(value == null ? null : (value / profitabilityBase) * 100)
      : fmtMoney(value, 0);

  return (
    <RailSegment
      title={bare ? undefined : "Profitability"}
      bare={bare}
      action={
        bare ? undefined : (
          <span className="text-xs text-faint">est. annual</span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          label="Interest revenue"
          value={fmtMoney(p.estimatedAnnualInterestRevenue, 0)}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.estimatedAnnualInterestRevenue}
                baseline={baselineProfitability.estimatedAnnualInterestRevenue}
                kind="money"
              />
            ) : undefined
          }
        />
        <KpiTile
          label="Funding cost"
          value={fmtMoney(p.estimatedAnnualFundingCost, 0)}
        />
        <KpiTile
          label="Net interest income"
          value={fmtMoney(p.estimatedAnnualNetInterestIncome, 0)}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.estimatedAnnualNetInterestIncome}
                baseline={
                  baselineProfitability.estimatedAnnualNetInterestIncome
                }
                kind="money"
              />
            ) : undefined
          }
          tone={
            (p.estimatedAnnualNetInterestIncome ?? 0) < 0 ? "warn" : undefined
          }
        />
        <KpiTile
          label="Net interest margin"
          value={fmtPct(p.netInterestMargin)}
          tone={marginState.tone}
          hint={marginState.label}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.netInterestMargin}
                baseline={baselineProfitability.netInterestMargin}
                kind="percentage-point"
              />
            ) : undefined
          }
        />
        <KpiTile
          label="Profit after tax"
          value={fmtMoney(p.profitAfterTax, 0)}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.profitAfterTax}
                baseline={baselineProfitability.profitAfterTax}
                kind="money"
              />
            ) : undefined
          }
          tone={(p.profitAfterTax ?? 0) < 0 ? "warn" : undefined}
        />
        <KpiTile
          label="Return on assets"
          value={fmtPct(p.returnOnAssets)}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.returnOnAssets}
                baseline={baselineProfitability.returnOnAssets}
                kind="percentage-point"
              />
            ) : undefined
          }
          tone={(p.returnOnAssets ?? 0) < 0 ? "warn" : undefined}
        />
        <KpiTile
          label="Indicative ROE"
          value={fmtPct(p.capitalAllocation?.returnOnEquity)}
          supporting={
            baselineProfitability ? (
              <ScenarioMetricDelta
                current={p.capitalAllocation?.returnOnEquity}
                baseline={
                  baselineProfitability.capitalAllocation?.returnOnEquity
                }
                kind="percentage-point"
              />
            ) : undefined
          }
          tone={
            (p.capitalAllocation?.returnOnEquity ?? 0) < 0 ? "warn" : undefined
          }
        />
      </div>

      <MarginHealthTrack margin={margin} />

      {/* Detail pages keep the waterfall always in view; the sidebar keeps it
          behind a toggle to preserve rail space. */}
      {!bare && (
        <button
          type="button"
          onClick={() => setDetailOpen((o) => !o)}
          aria-expanded={detailOpen}
          className="mt-3 flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          Full waterfall &amp; revenue impact
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            aria-hidden
            className={`transition-transform duration-150 ${
              detailOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {(bare || detailOpen) && (
        <div className="mt-1 border-t border-border pt-2">
          <div className="mb-1 flex items-center justify-end">
            <SegmentedControl
              ariaLabel="Waterfall display units"
              value={profitMode}
              onChange={setProfitMode}
              options={[
                { value: "dollar", label: "$" },
                {
                  value: "percent",
                  label: "%",
                  disabled: !canShowPercent,
                  title: canShowPercent
                    ? "Show each line as a % of loan amount"
                    : "Enter loan amount to view percentages",
                },
              ]}
            />
          </div>
          <Line label="Channel" value={CHANNEL_LABELS[p.channel] ?? "Direct"} />
          <Line label="Customer rate" value={fmtPct(p.customerRate)} />
          <Line
            label="Cost of funds"
            value={fmtPct(p.costOfFunds)}
            hint="Quote input when provided; otherwise the configured margin setting."
          />
          <Line
            label="Gross margin"
            value={
              <span className={TONE[marginState.tone].text}>
                {fmtPct(p.grossMarginPct)} ({marginState.label})
              </span>
            }
          />
          <div className="mt-1.5 border-t border-border pt-1.5">
            <Line label="Commission cost" value={amount(p.commissions)} />
            <Line label="Other income" value={amount(p.otherIncome)} />
            <Line
              label="Charged upfront fee"
              value={amount(p.feeIncome.chargedUpfrontFee)}
            />
            <Line
              label="Monthly fee"
              value={fmtMoney(p.feeIncome.monthlyFee, 0)}
            />
            <Line
              label="Monthly fees (12 months)"
              value={amount(p.feeIncome.annualRecurringFeeIncome)}
            />
            <Line
              label="Total first-year fee income"
              value={amount(p.feeIncome.firstYearFeeIncome)}
            />
            <Line
              label="Net income"
              value={
                <span className="font-semibold">{amount(p.netIncome)}</span>
              }
              hint="Gross margin x loan amount, less commission cost, plus other and first-year fee income."
            />
            <Line label="Expenses" value={amount(p.expenses)} />
            <Line
              label="Operating profit before credit loss"
              value={amount(
                p.expectedLoss?.operatingProfitBeforeCreditLossAmount ?? null,
              )}
            />
            <Line
              label="Expected credit loss"
              value={amount(
                p.expectedLoss?.effectiveExpectedCreditLossAmount ?? null,
              )}
              hint={
                p.expectedLoss?.basis === "calculated"
                  ? "PD × LGD × EAD from the active fictional policy."
                  : p.expectedLoss?.basis === "manual_override"
                    ? "Authorised quote-level override."
                    : "Provisional assumption while fictional ECL is unavailable."
              }
            />
            <Line
              label="Profit before tax"
              value={
                <span className="font-semibold">
                  {amount(p.profitBeforeTax)}
                </span>
              }
            />
            {p.taxRatePct != null ? (
              <Line
                label="Tax rate"
                value={fmtPct(p.taxRatePct)}
                hint="Effective rate applied to positive profit before tax."
              />
            ) : null}
            <Line
              label="Tax expense"
              value={amount(p.tax)}
              hint={
                p.taxRatePct == null
                  ? "The historical tax rate was not recorded."
                  : `Derived at ${fmtPct(p.taxRatePct)} of positive profit before tax.`
              }
            />
            <Line
              label="Profit after tax"
              value={
                baselineProfitability ? (
                  <ScenarioMetricValue
                    current={p.profitAfterTax}
                    baseline={baselineProfitability.profitAfterTax}
                    kind="money"
                  >
                    <span className="font-semibold">
                      {amount(p.profitAfterTax)}
                    </span>
                  </ScenarioMetricValue>
                ) : (
                  <span className="font-semibold">
                    {amount(p.profitAfterTax)}
                  </span>
                )
              }
            />
          </div>
          <div className="mt-1.5 border-t border-border pt-1.5">
            <Line
              label="Loan amount base"
              value={fmtMoney(profitabilityBase, 0)}
            />
            <Line
              label="Return on assets"
              value={
                baselineProfitability ? (
                  <ScenarioMetricValue
                    current={p.returnOnAssets}
                    baseline={baselineProfitability.returnOnAssets}
                    kind="percentage-point"
                  >
                    <span className="font-semibold">
                      {fmtPct(p.returnOnAssets)}
                    </span>
                  </ScenarioMetricValue>
                ) : (
                  <span className="font-semibold">
                    {fmtPct(p.returnOnAssets)}
                  </span>
                )
              }
              tone={(p.returnOnAssets ?? 0) < 0 ? "text-warn" : "text-ink"}
              hint="Profit after tax ÷ loan amount."
            />
          </div>
          {profitabilityBase == null && (
            <p className="mt-1 text-[11px] text-faint">
              Enter loan amount to compute the dollar waterfall and ROA.
            </p>
          )}
          <CapitalAllocationResult
            capital={p.capitalAllocation}
            baselineReturnOnEquity={
              baselineProfitability?.capitalAllocation?.returnOnEquity
            }
          />
          <ExpectedLossResult expectedLoss={p.expectedLoss} />
          <div className="mt-1.5 border-t border-border pt-1.5">
            <Line label="Target margin" value={fmtPct(margin.targetMargin)} />
            <Line
              label="Hard minimum"
              value={fmtPct(margin.hardMinimumMargin)}
            />
            <Line
              label="Revenue lost vs carded"
              value={amount(p.revenueLostVsCarded)}
              tone={(p.revenueLostVsCarded ?? 0) > 0 ? "text-warn" : "text-ink"}
            />
            <Line
              label="Revenue lost vs suggested"
              value={amount(p.revenueLostVsSuggested)}
              tone={
                (p.revenueLostVsSuggested ?? 0) > 0 ? "text-warn" : "text-ink"
              }
            />
          </div>
        </div>
      )}
    </RailSegment>
  );
}
