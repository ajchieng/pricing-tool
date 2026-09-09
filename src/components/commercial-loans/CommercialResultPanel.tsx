import type React from "react";
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
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import {
  dscrBandStatus,
  labelCommercialLoanType,
  labelCommercialSecurity,
} from "@/lib/pricing/commercial/labels";
import { customerScoreVisual } from "@/lib/quote-visuals";
import { quoteRecommendation } from "@/lib/quotes/recommendation";
import { TONE, type Tone } from "@/lib/tones";
import type { CommercialPricingResult } from "@/lib/pricing/commercial/types";
import { CapitalAllocationResult } from "@/components/result/CapitalAllocationResult";
import { MarginHealthTrack } from "@/components/result/MarginHealthTrack";
import { ScenarioMetricValue } from "@/components/result/ScenarioMetricDelta";
import { ExpectedLossResult } from "@/components/result/ExpectedLossResult";

// Presentational result panel for commercial loan pricing. Pure so it renders
// the live calculation preview (client form, layout="sidebar") and saved
// quote details (frozen browser snapshot, layout="detail") from the same figures. The
// sidebar is the dark decision surface plus one flush instrument column; the
// detail layout is the shared decision band plus always-open sections,
// matching the other lending verticals.

export function CommercialResultPanel({
  result,
  dense = false,
  layout = "sidebar",
  scenarioActive = false,
  scenarioBaseline,
  scenarioControl,
}: {
  result: CommercialPricingResult;
  dense?: boolean;
  layout?: "sidebar" | "detail";
  scenarioActive?: boolean;
  scenarioBaseline?: CommercialPricingResult | null;
  scenarioControl?: React.ReactNode;
}) {
  const dscr = dscrBandStatus(result.cashFlow.band);
  const scoreVisual = customerScoreVisual(result.customerScore?.score);
  const discountOnly = result.pricingBasis === "discount_entitlement_v1";
  const usingRequested = result.requestedRate != null;
  const requestedBelowIndicative =
    result.requestedRateBenchmark != null
      ? result.requestedRateBenchmark.requestedDiscountFromBenchmark > 0
      : result.requestedRate != null &&
        result.requestedRate < result.indicativeRate;
  const statusBadge: { tone: Tone; label: string } = result.customerScore
    ? { tone: scoreVisual.tone, label: scoreVisual.label }
    : { tone: dscr.tone, label: dscr.label };

  const dscrChip = (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${TONE[dscr.tone].text}`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${TONE[dscr.tone].bg}`}
      />
      {dscr.label}
    </span>
  );

  const marginBuildUpContent = (
    <>
      <Line
        label="Loan type"
        value={labelCommercialLoanType(result.loanType)}
      />
      <Line
        label={discountOnly ? "Starting base rate" : result.baseRateName}
        value={fmtPct(result.baseRate)}
        hint={discountOnly ? result.baseRateName : undefined}
      />
      {!discountOnly && (
        <Line
          label="Legacy score margin floor"
          value={fmtPct(result.margin.scoreMarginFloorPct)}
        />
      )}
      {result.customerScore ? (
        <>
          <Line
            label={
              discountOnly
                ? "Customer score discount"
                : "Legacy customer score margin"
            }
            value={
              discountOnly
                ? `${result.scoreDiscountPct.toFixed(2)}%`
                : fmtSignedPct(result.totalMargin)
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
        </>
      ) : (
        result.components.map((c) => (
          <Line
            key={c.key}
            label={c.label}
            value={fmtSignedPct(c.amount)}
            tone={c.amount < 0 ? "text-ok" : "text-high"}
            hint={c.reason}
          />
        ))
      )}
      <div className="mt-1 border-t border-border pt-2">
        {!discountOnly && (
          <Line
            label={
              result.marginFloorApplied
                ? "Legacy total margin (policy floor applied)"
                : "Legacy total margin"
            }
            value={<strong>{fmtPct(result.totalMargin)}</strong>}
          />
        )}
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
          label={discountOnly ? "Suggested rate" : "Indicative rate"}
          value={<strong>{fmtPct(result.indicativeRate)}</strong>}
          hint={
            result.floorRate != null && result.topRate != null
              ? discountOnly
                ? "Starting rate less the earned customer-score discount."
                : "Recommended rate within the legacy floor–top band."
              : undefined
          }
        />
        {result.competitorRate != null && (
          <Line
            label="Competitor evidence"
            value={fmtPct(result.competitorRate)}
            hint={
              result.competitorGapFromIndicative == null
                ? undefined
                : `${fmtSignedPct(result.competitorGapFromIndicative)} ${discountOnly ? "suggested" : "indicative"} minus competitor`
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

  const cashFlowContent =
    result.cashFlow.band === "not_assessed" ? (
      <p className="text-sm text-muted">
        Capture EBITDA and existing debt service to assess cash flow cover.
      </p>
    ) : (
      <>
        <Line label="EBITDA" value={fmtMoney(result.cashFlow.ebitda)} />
        <Line
          label="New facility debt service"
          value={fmtMoney(result.cashFlow.newAnnualDebtService)}
        />
        <Line
          label="Total annual debt service"
          value={fmtMoney(result.cashFlow.totalAnnualDebtService)}
        />
        <Line
          label="Debt service cover"
          value={
            <strong>
              {result.cashFlow.debtServiceCoverRatio == null
                ? "—"
                : `${result.cashFlow.debtServiceCoverRatio.toFixed(2)}x`}
            </strong>
          }
        />
      </>
    );

  const securityContent = (
    <>
      <Line
        label="Primary security"
        value={labelCommercialSecurity(result.security.primarySecurityType)}
      />
      <Line
        label="Total security value"
        value={fmtMoney(result.security.totalSecurityValue)}
      />
      <Line
        label="Total security coverage"
        value={
          result.security.securityCoverageRatio == null
            ? "—"
            : `${(result.security.securityCoverageRatio * 100).toFixed(0)}%`
        }
      />
    </>
  );

  const profitabilityContent =
    result.profitability.estimatedAnnualNetInterestIncome == null ? (
      <p className="text-sm text-muted">
        Cost of funds is unavailable, so the annual P&amp;L cannot be completed.
      </p>
    ) : (
      <>
        <Line
          label="Expected utilisation"
          value={fmtPct(result.profitability.expectedUtilisationPct)}
        />
        <Line
          label="Expected utilised exposure"
          value={fmtMoney(result.profitability.profitabilityExposure)}
        />
        <Line
          label="Annual interest income"
          value={
            scenarioBaseline ? (
              <ScenarioMetricValue
                current={result.profitability.estimatedAnnualInterestRevenue}
                baseline={
                  scenarioBaseline.profitability.estimatedAnnualInterestRevenue
                }
                kind="money"
              >
                {fmtMoney(result.profitability.estimatedAnnualInterestRevenue)}
              </ScenarioMetricValue>
            ) : (
              fmtMoney(result.profitability.estimatedAnnualInterestRevenue)
            )
          }
        />
        <Line
          label="Annual funding cost"
          value={fmtMoney(result.profitability.estimatedAnnualFundingCost)}
        />
        <Line
          label="Annual net interest income"
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
                  {fmtMoney(
                    result.profitability.estimatedAnnualNetInterestIncome,
                  )}
                </strong>
              </ScenarioMetricValue>
            ) : (
              <strong>
                {fmtMoney(
                  result.profitability.estimatedAnnualNetInterestIncome,
                )}
              </strong>
            )
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
                {fmtPct(result.profitability.netInterestMargin)}
              </ScenarioMetricValue>
            ) : (
              fmtPct(result.profitability.netInterestMargin)
            )
          }
        />
        <MarginHealthTrack margin={result.margin} />
        <Line
          label="Commission cost"
          value={fmtMoney(result.profitability.commissions)}
        />
        <Line
          label="Other income"
          value={fmtMoney(result.profitability.otherIncome)}
        />
        <Line
          label="Charged upfront fee"
          value={fmtMoney(result.profitability.feeIncome.chargedUpfrontFee)}
        />
        <Line
          label="Monthly fee"
          value={fmtMoney(result.profitability.feeIncome.monthlyFee)}
        />
        <Line
          label="Monthly fees (12 months)"
          value={fmtMoney(
            result.profitability.feeIncome.annualRecurringFeeIncome,
          )}
        />
        <Line
          label="Total first-year fee income"
          value={fmtMoney(result.profitability.feeIncome.firstYearFeeIncome)}
        />
        <Line
          label="Operating expenses"
          value={fmtMoney(result.profitability.expenses)}
        />
        <Line
          label="Operating profit before credit loss"
          value={fmtMoney(
            result.profitability.expectedLoss
              ?.operatingProfitBeforeCreditLossAmount ?? null,
          )}
        />
        <Line
          label="Expected credit loss"
          value={fmtMoney(
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
          value={fmtMoney(result.profitability.profitBeforeTax)}
        />
        {result.profitability.taxRatePct != null ? (
          <Line
            label="Tax rate"
            value={fmtPct(result.profitability.taxRatePct)}
            hint="Effective rate applied to positive profit before tax."
          />
        ) : null}
        <Line
          label="Tax"
          value={fmtMoney(result.profitability.tax)}
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
                <strong>{fmtMoney(result.profitability.profitAfterTax)}</strong>
              </ScenarioMetricValue>
            ) : (
              <strong>{fmtMoney(result.profitability.profitAfterTax)}</strong>
            )
          }
        />
        <Line
          label="ROA"
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
        />
        <CapitalAllocationResult
          capital={result.profitability.capitalAllocation}
          baselineReturnOnEquity={
            scenarioBaseline?.profitability.capitalAllocation?.returnOnEquity
          }
        />
        <ExpectedLossResult expectedLoss={result.profitability.expectedLoss} />
      </>
    );

  if (layout === "detail") {
    return (
      <div className="space-y-5">
        <QuoteDecisionBand
          rateLabel={discountOnly ? "Suggested rate" : "Indicative rate"}
          rateValue={result.indicativeRate}
          statusBadge={statusBadge}
          rateLines={
            <>
              <DecisionBandRateLine>
                {result.baseRateName} {fmtPct(result.baseRate)}
                <span className="mx-1.5 opacity-70">
                  {discountOnly ? "−" : "+"}
                </span>
                <span className="text-rail-ink">
                  {discountOnly
                    ? `score discount ${result.scoreDiscountPct.toFixed(2)}%`
                    : `legacy margin ${fmtPct(result.totalMargin)}`}
                </span>
              </DecisionBandRateLine>
              {result.requestedRate != null && (
                <DecisionBandRateLine warn={requestedBelowIndicative}>
                  Requested {fmtPct(result.requestedRate)}
                  {requestedBelowIndicative
                    ? ` — below ${discountOnly ? "suggested" : "indicative"}`
                    : ""}
                </DecisionBandRateLine>
              )}
            </>
          }
          approvalLevel={result.approvalLevel}
          approvalReasons={result.approvalReasons}
          nextAction={quoteRecommendation(result)}
          repaymentRows={
            result.monthlyRepayment == null
              ? []
              : [
                  {
                    label: "Monthly",
                    value: fmtMoney(result.monthlyRepayment, 2),
                  },
                  {
                    label: "Annual debt service",
                    value: fmtMoney(result.annualRepayment),
                  },
                ]
          }
          repaymentEmpty="Revolving facility — interest is charged on the drawn balance, so there is no scheduled repayment."
          repaymentNote={`At the ${
            usingRequested
              ? "requested rate"
              : discountOnly
                ? "suggested rate"
                : "indicative rate"
          }. Indicative estimates only — not an approval.`}
        />

        {result.warnings.length > 0 && (
          <WarningList warnings={result.warnings} dense />
        )}

        <DetailSectionGroup title="Pricing & customer detail">
          <DetailSection
            title={discountOnly ? "Rate build-up" : "Legacy margin build-up"}
            description={
              discountOnly
                ? "Starting rate, customer-score discount and suggested rate."
                : "Base rate, legacy customer score margin and the indicative rate."
            }
          >
            {marginBuildUpContent}
          </DetailSection>
          <DetailSection
            title="Cash flow cover"
            description="EBITDA against total debt service for this facility."
            action={dscrChip}
          >
            {cashFlowContent}
          </DetailSection>
          <DetailSection
            title="First-year profitability"
            description="Lender deal P&L on expected exposure. Facility fees are excluded."
          >
            {profitabilityContent}
          </DetailSection>
          <DetailSection
            title="Security"
            description="Security values and total facility coverage."
            className="simple-optional"
          >
            {securityContent}
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
          {discountOnly ? "Suggested rate" : "Indicative rate"}
        </div>
        <div
          data-quote-parameter-label={
            discountOnly ? "Suggested rate" : "Indicative rate"
          }
          data-quote-parameter-value
          className="tnum mt-2 font-serif text-[2.7rem] font-semibold leading-none text-brand-glow"
        >
          {fmtPct(result.indicativeRate)}
          <span className="ml-1.5 text-base font-medium tracking-normal text-brand-deep-muted">
            p.a.
          </span>
        </div>
        <p className="tnum mt-2.5 text-sm text-brand-deep-muted">
          {result.baseRateName} {fmtPct(result.baseRate)}{" "}
          {discountOnly
            ? `− score discount ${result.scoreDiscountPct.toFixed(2)}%`
            : `+ legacy margin ${fmtPct(result.totalMargin)}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            data-quote-parameter-label={
              result.customerScore ? "Customer score band" : "Cash flow band"
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
            drives the repayment figures below.
          </p>
        )}
      </section>
      {scenarioControl}

      <div className="mt-4 divide-y divide-border border-b border-border">
        <RailSegment
          title={discountOnly ? "Rate build-up" : "Legacy margin build-up"}
        >
          {marginBuildUpContent}
        </RailSegment>

        <RailSegment title="Cash flow cover" action={dscrChip}>
          {cashFlowContent}
        </RailSegment>

        <RailSegment title="First-year profitability">
          {profitabilityContent}
          <p className="mt-2 text-xs leading-5 text-muted">
            Facility fees are excluded from this P&amp;L.
          </p>
        </RailSegment>

        <RailSegment title="Security">{securityContent}</RailSegment>

        <RailSegment title="Indicative repayments">
          {result.monthlyRepayment == null ? (
            <p className="text-sm text-muted">
              Revolving facility — interest is charged on the drawn balance, so
              there is no scheduled repayment.
            </p>
          ) : (
            <>
              <Line
                label="Monthly repayment"
                value={<strong>{fmtMoney(result.monthlyRepayment, 2)}</strong>}
              />
              <Line
                label="Annual debt service"
                value={fmtMoney(result.annualRepayment)}
              />
              <Line
                label="Rate used"
                value={`${fmtPct(result.finalDisplayRate)} p.a.`}
              />
            </>
          )}
        </RailSegment>

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

        <p className="py-4 text-xs leading-relaxed text-muted">
          {result.explanationText}
        </p>
      </div>
    </div>
  );
}
