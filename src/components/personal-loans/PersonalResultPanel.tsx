"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ApprovalBadge } from "@/components/ApprovalBadge";
import { Badge } from "@/components/ui/Badge";
import { CustomerScorePanel } from "@/components/result/CustomerScorePanel";
import { WarningList } from "@/components/result/WarningList";
import {
  DetailSection,
  DetailSectionGroup,
  Line,
  PricingExplanationDisclosure,
  RailSegment,
} from "@/components/result/shared";
import {
  DecisionBandRateLine,
  QuoteDecisionBand,
} from "@/components/result/QuoteDecisionBand";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { affordabilityStatus } from "@/lib/pricing/personal/labels";
import type { PersonalPricingResult } from "@/lib/pricing/personal/types";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import { customerScoreVisual } from "@/lib/quote-visuals";
import { quoteRecommendation } from "@/lib/quotes/recommendation";
import { MARGIN_STATUS } from "@/lib/status";
import { TONE, type Tone } from "@/lib/tones";
import { CapitalAllocationResult } from "@/components/result/CapitalAllocationResult";
import { MarginHealthTrack } from "@/components/result/MarginHealthTrack";
import { ScenarioMetricValue } from "@/components/result/ScenarioMetricDelta";
import { ExpectedLossResult } from "@/components/result/ExpectedLossResult";

// Presentational result panel for personal loan pricing. Pure so it renders
// the live calculation preview (client form, layout="sidebar") and saved
// quote details (frozen browser snapshot, layout="detail") from the same figures. The
// sidebar is the dark decision surface plus one flush instrument column; the
// detail layout is the shared decision band plus always-open sections,
// matching the other lending verticals.

const CHANNEL_LABELS: Record<ProfitabilityChannel, string> = {
  broker: "Broker",
  online: "Online",
  direct: "Direct",
};

export type PersonalProfitDisplayMode = "dollar" | "percent";

export function personalProfitDisplayValue(
  value: number | null,
  mode: PersonalProfitDisplayMode,
  loanAmountBase: number | null,
): string {
  if (mode === "percent" && loanAmountBase != null && loanAmountBase > 0) {
    return fmtPct(value == null ? null : (value / loanAmountBase) * 100);
  }
  return fmtMoney(value, 0);
}

export function PersonalResultPanel({
  result,
  dense = false,
  layout = "sidebar",
  scenarioActive = false,
  scenarioBaseline,
  scenarioControl,
}: {
  result: PersonalPricingResult;
  dense?: boolean;
  layout?: "sidebar" | "detail";
  scenarioActive?: boolean;
  scenarioBaseline?: PersonalPricingResult | null;
  scenarioControl?: React.ReactNode;
}) {
  const afford = affordabilityStatus(result.affordability.status);
  const scoreVisual = customerScoreVisual(result.customerScore?.score);
  const discountOnly = result.pricingBasis === "discount_entitlement_v1";
  const legacyRiskLabel = result.riskTierLabel ?? "Legacy risk tier";
  const [profitDisplayMode, setProfitDisplayMode] =
    useState<PersonalProfitDisplayMode>("dollar");
  const profitabilityBase = result.profitability.averageAssets;
  const marginStatus =
    MARGIN_STATUS[result.profitability.marginStatus] ??
    MARGIN_STATUS.unavailable;
  const amount = (value: number | null) =>
    personalProfitDisplayValue(value, profitDisplayMode, profitabilityBase);

  const usingRequested =
    result.requestedRate != null &&
    Math.abs(result.finalDisplayRate - result.requestedRate) < 0.0001;
  const requestedBelowSuggested =
    result.requestedRateBenchmark != null
      ? result.requestedRateBenchmark.requestedDiscountFromBenchmark > 0
      : result.requestedRate != null &&
        result.requestedRate < result.suggestedRate;
  const scoreAdjustment =
    (result.customerScore ? result.totalAdjustment : result.riskTierMargin) ??
    0;
  const statusBadge: { tone: Tone; label: string } = result.customerScore
    ? { tone: scoreVisual.tone, label: scoreVisual.label }
    : {
        tone: result.riskTier === "not_scored" ? "muted" : "info",
        label: legacyRiskLabel,
      };
  const retentionNotice =
    result.retentionPricing?.outcome === "no_further_discount"
      ? "No further discount can be provided."
      : result.retentionPricing?.outcome === "partial_additional_discount"
        ? "A demo-policy share of the available additional discount can be provided."
        : result.retentionPricing?.outcome === "standard"
          ? "The sharper of the current and ordinary suggested rates has been applied."
          : null;

  const affordabilityChip = (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${TONE[afford.tone].text}`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${TONE[afford.tone].bg}`}
      />
      {afford.label}
    </span>
  );

  const profitDisplayToggle = (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-faint sm:inline">est. annual</span>
      <SegmentedControl
        ariaLabel="Personal profitability display units"
        value={profitDisplayMode}
        onChange={(value) => setProfitDisplayMode(value)}
        options={[
          { value: "dollar", label: "$" },
          {
            value: "percent",
            label: "%",
            disabled: !(profitabilityBase != null && profitabilityBase > 0),
            title:
              profitabilityBase != null && profitabilityBase > 0
                ? "Show each amount as a % of loan amount"
                : "Loan amount is required to view percentages",
          },
        ]}
      />
    </div>
  );

  const rateBuildUpContent = (
    <>
      <Line
        label={
          result.productName ? "Carded product rate" : "Fallback carded rate"
        }
        value={fmtPct(result.baseRate)}
        hint={result.productName ?? undefined}
      />
      {result.comparisonRate != null && (
        <Line
          label="Comparison rate"
          value={`${fmtPct(result.comparisonRate)} p.a.`}
          hint="Display-only public comparison rate; not used in score or pricing formulas."
        />
      )}
      {result.customerScore ? (
        <>
          <Line
            label={
              discountOnly
                ? "Customer score discount"
                : "Legacy score adjustment"
            }
            value={
              discountOnly
                ? `${result.scoreDiscountPct.toFixed(2)}%`
                : fmtSignedPct(result.totalAdjustment)
            }
            tone={
              discountOnly && result.scoreDiscountPct > 0
                ? "text-ok"
                : "text-ink"
            }
          />
          {discountOnly && result.discountBlockedByFloorPct > 0 && (
            <Line
              label="Discount blocked by floor"
              value={`${result.discountBlockedByFloorPct.toFixed(2)}%`}
              tone="text-warn"
            />
          )}
          <CustomerScorePanel customerScore={result.customerScore} bare />
          {result.components.map((component) => (
            <Line
              key={component.key}
              label={component.label}
              value={fmtSignedPct(component.amount)}
              tone={component.amount < 0 ? "text-ok" : "text-high"}
              hint={component.reason}
            />
          ))}
        </>
      ) : (
        <>
          <Line
            label={legacyRiskLabel}
            value={fmtSignedPct(result.riskTierMargin)}
          />
          {result.components.map((c) => (
            <Line
              key={c.key}
              label={c.label}
              value={fmtSignedPct(c.amount)}
              tone={c.amount < 0 ? "text-ok" : "text-high"}
              hint={c.reason}
            />
          ))}
        </>
      )}
      <div className="mt-1 border-t border-border pt-2">
        {result.floorRate != null && result.topRate != null && (
          <Line
            label={discountOnly ? "Score-100 rate" : "Floor rate"}
            value={<span className="text-ok">{fmtPct(result.floorRate)}</span>}
            hint={
              discountOnly
                ? "Theoretical rate at a customer score of 100; active model inputs may not reach that score."
                : "Best rate the legacy score curve can reach."
            }
          />
        )}
        <Line
          label="Suggested rate"
          value={<strong>{fmtPct(result.suggestedRate)}</strong>}
          hint={
            result.floorRate != null && result.topRate != null
              ? discountOnly
                ? "Carded rate less the earned customer-score discount."
                : "Recommended rate within the legacy floor–top band."
              : undefined
          }
        />
        {result.competitorRate != null && (
          <Line
            label="Competitor evidence"
            value={fmtPct(result.competitorRate)}
            hint={
              result.competitorGapFromSuggested == null
                ? undefined
                : `${fmtSignedPct(result.competitorGapFromSuggested)} suggested minus competitor`
            }
          />
        )}
        {result.floorRate != null &&
          result.topRate != null &&
          !discountOnly && (
            <Line
              label="Top rate"
              value={
                <span className="text-warn">{fmtPct(result.topRate)}</span>
              }
              hint="Highest rate the customer score can reach (max loading)."
            />
          )}
      </div>
    </>
  );

  const affordabilityContent =
    result.affordability.status === "not_assessed" ? (
      <p className="text-sm text-muted">
        Capture net monthly income and living expenses to assess repayment
        affordability.
      </p>
    ) : (
      <>
        <Line
          label="Monthly surplus before this loan"
          value={fmtMoney(result.affordability.monthlySurplus, 0)}
        />
        <Line
          label="Repayment share of surplus"
          value={fmtPct(result.affordability.repaymentToSurplusPct, 0)}
        />
        <Line
          label="Residual surplus after repayment"
          value={fmtMoney(result.affordability.residualMonthlyIncome, 0)}
          tone={
            (result.affordability.residualMonthlyIncome ?? 0) < 0
              ? "text-alert"
              : undefined
          }
        />
      </>
    );

  const profitabilityContent = (
    <>
      <div className="grid gap-x-3 gap-y-1 text-sm">
        <Line
          label="Interest revenue"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.estimatedAnnualInterestRevenue}
                baseline={
                  scenarioBaseline.profitability.estimatedAnnualInterestRevenue
                }
                kind="money"
              >
                {amount(result.profitability.estimatedAnnualInterestRevenue)}
              </ScenarioMetricValue>
            ) : (
              amount(result.profitability.estimatedAnnualInterestRevenue)
            )
          }
        />
        <Line
          label="Funding cost"
          value={amount(result.profitability.estimatedAnnualFundingCost)}
        />
        <Line
          label="Net interest income"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.estimatedAnnualNetInterestIncome}
                baseline={
                  scenarioBaseline.profitability
                    .estimatedAnnualNetInterestIncome
                }
                kind="money"
              >
                <strong>
                  {amount(
                    result.profitability.estimatedAnnualNetInterestIncome,
                  )}
                </strong>
              </ScenarioMetricValue>
            ) : (
              <strong>
                {amount(result.profitability.estimatedAnnualNetInterestIncome)}
              </strong>
            )
          }
          tone={
            (result.profitability.estimatedAnnualNetInterestIncome ?? 0) < 0
              ? "text-warn"
              : undefined
          }
        />
        <Line
          label="Net interest margin"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.netInterestMargin}
                baseline={scenarioBaseline.profitability.netInterestMargin}
                kind="percentage-point"
              >
                <span className={TONE[marginStatus.tone].text}>
                  {fmtPct(result.profitability.netInterestMargin)} (
                  {marginStatus.label})
                </span>
              </ScenarioMetricValue>
            ) : (
              <span className={TONE[marginStatus.tone].text}>
                {fmtPct(result.profitability.netInterestMargin)} (
                {marginStatus.label})
              </span>
            )
          }
        />
      </div>
      <MarginHealthTrack
        margin={{
          estimatedMargin: result.profitability.netInterestMargin,
          targetMargin: result.profitability.targetMargin,
          hardMinimumMargin: result.profitability.hardMinimumMargin,
          status: result.profitability.marginStatus,
        }}
      />
      <div className="mt-2 border-t border-border pt-2">
        <Line
          label="Channel"
          value={CHANNEL_LABELS[result.profitability.channel] ?? "Direct"}
        />
        <Line
          label="Cost of funds"
          value={fmtPct(result.profitability.costOfFunds)}
        />
        <Line
          label="Target margin"
          value={fmtPct(result.profitability.targetMargin)}
        />
        <Line
          label="Hard minimum"
          value={fmtPct(result.profitability.hardMinimumMargin)}
        />
        <Line
          label="Commission cost"
          value={amount(result.profitability.commissions)}
        />
        <Line
          label="Other income"
          value={amount(result.profitability.otherIncome)}
        />
        <Line
          label="Charged upfront fee"
          value={amount(result.profitability.feeIncome.chargedUpfrontFee)}
        />
        <Line
          label="Monthly fee"
          value={fmtMoney(result.profitability.feeIncome.monthlyFee)}
        />
        <Line
          label="Monthly fees (12 months)"
          value={amount(
            result.profitability.feeIncome.annualRecurringFeeIncome,
          )}
        />
        <Line
          label="Total first-year fee income"
          value={amount(result.profitability.feeIncome.firstYearFeeIncome)}
        />
        <Line label="Expenses" value={amount(result.profitability.expenses)} />
        <Line
          label="Operating profit before credit loss"
          value={amount(
            result.profitability.expectedLoss
              ?.operatingProfitBeforeCreditLossAmount ?? null,
          )}
        />
        <Line
          label="Expected credit loss"
          value={amount(
            result.profitability.expectedLoss
              ?.effectiveExpectedCreditLossAmount ?? null,
          )}
          hint={
            result.profitability.expectedLoss?.basis === "calculated"
              ? "PD × LGD × EAD from the active fictional policy."
              : result.profitability.expectedLoss?.basis === "manual_override"
                ? "Authorised quote-level override."
                : "Provisional assumption while fictional ECL is unavailable."
          }
        />
        <Line
          label="Profit before tax"
          value={amount(result.profitability.profitBeforeTax)}
        />
        {result.profitability.taxRatePct != null ? (
          <Line
            label="Tax rate"
            value={fmtPct(result.profitability.taxRatePct)}
            hint="Effective rate applied to positive profit before tax."
          />
        ) : null}
        <Line
          label="Tax expense"
          value={amount(result.profitability.tax)}
          hint={
            result.profitability.taxRatePct == null
              ? "The historical tax rate was not recorded."
              : `Derived at ${fmtPct(result.profitability.taxRatePct)} of positive profit before tax.`
          }
        />
        <Line
          label="Profit after tax"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.profitAfterTax}
                baseline={scenarioBaseline.profitability.profitAfterTax}
                kind="money"
              >
                <strong>{amount(result.profitability.profitAfterTax)}</strong>
              </ScenarioMetricValue>
            ) : (
              <strong>{amount(result.profitability.profitAfterTax)}</strong>
            )
          }
        />
        <Line
          label="ROA on loan amount"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.returnOnAssets}
                baseline={scenarioBaseline.profitability.returnOnAssets}
                kind="percentage-point"
              >
                {fmtPct(result.profitability.returnOnAssets)}
              </ScenarioMetricValue>
            ) : (
              fmtPct(result.profitability.returnOnAssets)
            )
          }
          tone={
            (result.profitability.returnOnAssets ?? 0) < 0
              ? "text-warn"
              : undefined
          }
        />
        <CapitalAllocationResult
          capital={result.profitability.capitalAllocation}
          baselineReturnOnEquity={
            scenarioBaseline?.profitability.capitalAllocation?.returnOnEquity
          }
        />
        <ExpectedLossResult expectedLoss={result.profitability.expectedLoss} />
      </div>
    </>
  );

  if (layout === "detail") {
    return (
      <div className="space-y-5">
        <QuoteDecisionBand
          rateLabel="Suggested rate"
          rateValue={result.suggestedRate}
          statusBadge={statusBadge}
          rateLines={
            <>
              <DecisionBandRateLine>
                Carded {fmtPct(result.baseRate)}
                <span className="mx-1.5 opacity-70">→</span>
                <span
                  className={
                    scoreAdjustment < 0 ? "text-brand-glow" : "text-rail-ink"
                  }
                >
                  {discountOnly
                    ? `${result.scoreDiscountPct.toFixed(2)}% score discount`
                    : `${fmtSignedPct(scoreAdjustment)} legacy adjustment`}
                </span>
              </DecisionBandRateLine>
              {result.requestedRate != null && (
                <DecisionBandRateLine warn={requestedBelowSuggested}>
                  Requested {fmtPct(result.requestedRate)}
                  {!usingRequested
                    ? ` — constrained to ${fmtPct(result.finalDisplayRate)}`
                    : requestedBelowSuggested
                      ? " — below suggested"
                      : ""}
                </DecisionBandRateLine>
              )}
              {retentionNotice && (
                <DecisionBandRateLine warn>
                  {retentionNotice}
                </DecisionBandRateLine>
              )}
            </>
          }
          approvalLevel={result.approvalLevel}
          approvalReasons={result.approvalReasons}
          nextAction={quoteRecommendation(result)}
          repaymentRows={[
            { label: "Monthly", value: fmtMoney(result.monthlyRepayment, 2) },
            {
              label: "Total interest over term",
              value: fmtMoney(result.totalInterestOverTerm),
            },
          ]}
          repaymentNote={`At the ${
            usingRequested ? "requested rate" : "suggested rate"
          }. Indicative estimates, principal & interest.`}
        />

        {result.warnings.length > 0 && (
          <WarningList warnings={result.warnings} dense />
        )}

        <DetailSectionGroup title="Pricing & customer detail">
          <DetailSection
            title="Rate build-up"
            description="Carded product rate, customer score and the suggested rate."
          >
            {rateBuildUpContent}
          </DetailSection>
          <DetailSection
            title="Repayment affordability"
            description="Surplus and repayment share behind the affordability check."
            action={affordabilityChip}
          >
            {affordabilityContent}
          </DetailSection>
          <DetailSection
            title="First-year profitability"
            description="Estimated annual P&L for this loan."
            action={profitDisplayToggle}
            className="simple-optional"
          >
            {profitabilityContent}
          </DetailSection>
        </DetailSectionGroup>

        {result.explanationText && (
          <div className="simple-optional">
            <PricingExplanationDisclosure text={result.explanationText} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <section
        data-quote-parameter-group="Decision"
        className="rounded-2xl bg-brand-deep p-5 text-rail-ink shadow-[var(--shadow-md)]"
      >
        <div className="text-sm font-medium text-brand-deep-muted">
          Suggested rate
        </div>
        <div
          data-quote-parameter-label="Suggested rate"
          data-quote-parameter-value
          className="tnum mt-2 font-serif text-[2.7rem] font-semibold leading-none text-brand-glow"
        >
          {fmtPct(result.suggestedRate)}
          <span className="ml-1.5 text-base font-medium tracking-normal text-brand-deep-muted">
            p.a.
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            data-quote-parameter-label={
              result.customerScore ? "Customer score band" : "Risk tier"
            }
          >
            <span data-quote-parameter-value>
              <Badge tone={statusBadge.tone} size="sm">
                {statusBadge.label}
              </Badge>
            </span>
          </span>
          <span data-quote-parameter-label="Approval requirement">
            <span data-quote-parameter-value>
              <ApprovalBadge level={result.approvalLevel} size="sm" />
            </span>
          </span>
        </div>
        {result.requestedRate != null && (
          <p
            data-quote-parameter-label={
              scenarioActive ? "Scenario customer rate" : "Requested rate"
            }
            className="mt-3 text-sm text-brand-deep-muted"
          >
            {scenarioActive ? "Scenario customer rate" : "Requested rate"}{" "}
            <strong data-quote-parameter-value className="tnum text-rail-ink">
              {fmtPct(result.requestedRate)}
            </strong>{" "}
            {usingRequested
              ? "drives the repayment figures below."
              : `was constrained; ${fmtPct(result.finalDisplayRate)} drives the repayment figures below.`}
          </p>
        )}
        {retentionNotice && (
          <p className="mt-3 text-sm font-medium text-warn-bright">
            {retentionNotice}
          </p>
        )}
      </section>
      {scenarioControl}

      <div className="mt-4 divide-y divide-border border-b border-border">
        <RailSegment title="Indicative repayments">
          <Line
            label="Monthly repayment"
            value={<strong>{fmtMoney(result.monthlyRepayment, 2)}</strong>}
          />
          <Line
            label="Total interest over term"
            value={fmtMoney(result.totalInterestOverTerm)}
          />
          <Line
            label="Rate used"
            value={`${fmtPct(result.finalDisplayRate)} p.a.`}
          />
        </RailSegment>

        <div className="simple-optional">
          <RailSegment title="Rate build-up">{rateBuildUpContent}</RailSegment>
        </div>

        <RailSegment title="Repayment affordability" action={affordabilityChip}>
          {affordabilityContent}
        </RailSegment>

        <div className="simple-optional">
          <RailSegment
            title="First-year profitability"
            action={profitDisplayToggle}
          >
            {profitabilityContent}
          </RailSegment>
        </div>

        <details className="simple-only group">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-3 text-[13px] font-semibold text-ink transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
            More pricing detail
            <ChevronDown
              size={15}
              strokeWidth={1.75}
              aria-hidden
              className="text-faint transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-border py-3">
            <RailSegment title="Rate build-up" bare>
              <Line
                label={
                  result.productName
                    ? "Carded product rate"
                    : "Fallback carded rate"
                }
                value={fmtPct(result.baseRate)}
                hint={result.productName ?? undefined}
              />
              {result.customerScore ? (
                <>
                  <Line
                    label={
                      discountOnly
                        ? "Customer score discount"
                        : "Legacy score adjustment"
                    }
                    value={
                      discountOnly
                        ? `${result.scoreDiscountPct.toFixed(2)}%`
                        : fmtSignedPct(result.totalAdjustment)
                    }
                    tone={
                      discountOnly && result.scoreDiscountPct > 0
                        ? "text-ok"
                        : "text-ink"
                    }
                  />
                  {discountOnly && result.discountBlockedByFloorPct > 0 && (
                    <Line
                      label="Discount blocked by floor"
                      value={`${result.discountBlockedByFloorPct.toFixed(2)}%`}
                      tone="text-warn"
                    />
                  )}
                  {result.components.map((component) => (
                    <Line
                      key={component.key}
                      label={component.label}
                      value={fmtSignedPct(component.amount)}
                      tone={component.amount < 0 ? "text-ok" : "text-high"}
                    />
                  ))}
                </>
              ) : (
                <Line
                  label={legacyRiskLabel}
                  value={fmtSignedPct(result.riskTierMargin)}
                />
              )}
              {result.floorRate != null && result.topRate != null && (
                <Line
                  label={discountOnly ? "Score-100 rate" : "Floor rate"}
                  value={
                    <span className="text-ok">{fmtPct(result.floorRate)}</span>
                  }
                />
              )}
              <Line
                label="Suggested rate"
                value={<strong>{fmtPct(result.suggestedRate)}</strong>}
              />
              {result.floorRate != null &&
                result.topRate != null &&
                !discountOnly && (
                  <Line
                    label="Top rate"
                    value={
                      <span className="text-warn">
                        {fmtPct(result.topRate)}
                      </span>
                    }
                  />
                )}
            </RailSegment>
            <div className="mt-3 border-t border-border pt-3">
              <RailSegment title="First-year profitability" bare>
                <Line
                  label="Net interest income"
                  value={
                    <strong>
                      {amount(
                        result.profitability.estimatedAnnualNetInterestIncome,
                      )}
                    </strong>
                  }
                  tone={
                    (result.profitability.estimatedAnnualNetInterestIncome ??
                      0) < 0
                      ? "text-warn"
                      : undefined
                  }
                />
                <Line
                  label="Net interest margin"
                  value={
                    <span className={TONE[marginStatus.tone].text}>
                      {fmtPct(result.profitability.netInterestMargin)} (
                      {marginStatus.label})
                    </span>
                  }
                />
                <Line
                  label="Profit after tax"
                  value={
                    <strong>
                      {amount(result.profitability.profitAfterTax)}
                    </strong>
                  }
                />
              </RailSegment>
            </div>
          </div>
        </details>

        {result.approvalReasons.length > 0 && (
          <RailSegment title="Approval required">
            <ul className="space-y-1.5 text-sm text-ink/90">
              {result.approvalReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ApprovalBadge level={r.level} size="sm" short />
                  <span>{r.message}</span>
                </li>
              ))}
            </ul>
          </RailSegment>
        )}

        {result.warnings.length > 0 && (
          <div className="py-4">
            <WarningList warnings={result.warnings} dense={dense} />
          </div>
        )}

        <RailSegment title="Recommended next step">
          <p className="text-sm leading-6 text-ink">
            {quoteRecommendation(result)}
          </p>
        </RailSegment>

        <p className="simple-optional py-4 text-xs leading-relaxed text-muted">
          {result.explanationText}
        </p>
      </div>
    </div>
  );
}
