"use client";

import { ChevronDown } from "lucide-react";
import type {
  BrokerVolumeBand,
  HomeLoanCustomerStream,
  PricingResult,
  ProfitabilityChannel,
  ServiceabilityIncomeMeasure,
} from "@/lib/pricing/types";
import type { LenderProduct } from "@/lib/pricing/lender-products";
import { fmtMoney, fmtPct, fmtSignedPct } from "@/lib/format";
import { MARGIN_STATUS } from "@/lib/status";
import { SuggestedRateHero } from "@/components/result/SuggestedRateHero";
import { ApprovalStatusCard } from "@/components/result/ApprovalStatusCard";
import { WarningList } from "@/components/result/WarningList";
import { IndicativeRepaymentCard } from "@/components/result/IndicativeRepaymentCard";
import { PricingBreakdownCard } from "@/components/result/PricingBreakdownCard";
import { ProfitabilityMetricsGrid } from "@/components/result/ProfitabilityMetricsGrid";
import { CustomerScorePanel } from "@/components/result/CustomerScorePanel";
import { MarketComparisonPanel } from "@/components/result/MarketComparisonPanel";
import { InputsSummaryCard } from "@/components/result/InputsSummaryCard";
import {
  DecisionBandRateLine,
  QuoteDecisionBand,
} from "@/components/result/QuoteDecisionBand";
import {
  DetailSection,
  DetailSectionGroup,
  PricingExplanationDisclosure,
} from "@/components/result/shared";

// Risk-flavoured warning codes render inside the risk summary; everything else
// surfaces at the top of the panel.
const RISK_WARNING_CODES = [
  "risk_not_assessed",
  "serviceability_borderline",
  "serviceability_review",
  "income_non_standard",
  "income_review",
];

export interface QuoteContext {
  customerStream: HomeLoanCustomerStream;
  channel: ProfitabilityChannel;
  creditScore?: number | null;
  dtiRatio?: number | null;
  grossAnnualIncome?: number | null;
  serviceabilityIncomeMeasure?: ServiceabilityIncomeMeasure;
  serviceabilityNsi?: number | null;
  currentCustomerRate?: number | null;
  retentionArrearsHardship18Months?: boolean | null;
  retentionArrearsPast12Months?: boolean | null;
  existingMember: boolean;
  livesInServiceRegion: string;
  lenderProducts: LenderProduct[];
  retentionScenario: boolean;
  newToBankGrowthOpportunity: boolean;
  vipCustomer: boolean;
  yearsAsMember?: number | null;
  brokerName?: string | null;
  brokerCompany?: string | null;
  brokerInRegion?: "yes" | "no" | null;
  brokerVolumeBand?: BrokerVolumeBand | null;
  brokerDiscretionPct?: number | null;
}

// Decision-first ordering: the answer (rate + approval + margin), then why
// (approval reasons, warnings), then the numbers behind it, then the echo of
// the inputs. Nothing critical below the fold.

export function ResultPanel({
  result,
  loading,
  context,
  layout = "sidebar",
  scenarioActive = false,
  scenarioBaseline,
  scenarioControl,
}: {
  result: PricingResult | null;
  loading?: boolean;
  context?: QuoteContext;
  layout?: "sidebar" | "detail";
  scenarioActive?: boolean;
  scenarioBaseline?: PricingResult | null;
  scenarioControl?: React.ReactNode;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-6 text-sm leading-relaxed text-muted">
        Select a product and enter the loan amount and property value to see a
        suggested rate, indicative repayments and the approval requirement.
      </div>
    );
  }

  const usingRequested = result.requestedRate != null;
  const requestedBelowSuggested =
    result.requestedRateAnalysis?.belowApprovalBenchmark ??
    result.requestedRateAnalysis?.belowSuggested ??
    false;
  const riskWarnings = result.warnings.filter((w) =>
    RISK_WARNING_CODES.includes(w.code),
  );
  const nonRiskWarnings = result.warnings.filter(
    (w) => !RISK_WARNING_CODES.includes(w.code),
  );
  const isDetail = layout === "detail";
  const retentionNotice = result.retentionPricing
    ? result.retentionPricing.outcome === "no_further_discount"
      ? "No further discount can be provided."
      : result.retentionPricing.outcome === "partial_additional_discount"
        ? "A demo-policy share of the available additional discount has been applied because arrears or hardship was recorded in the past 18 months."
        : result.retentionPricing.outcome === "standard"
          ? "Retention pricing has applied the available additional discount from the customer’s current rate."
          : null
    : null;

  const retentionNoticeSection = retentionNotice ? (
    <div className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm text-info">
      <span className="font-semibold">Retention pricing:</span>{" "}
      {retentionNotice}
    </div>
  ) : null;

  const warningsSection =
    nonRiskWarnings.length > 0 ? (
      <WarningList warnings={nonRiskWarnings} />
    ) : null;

  const breakdownSection = (
    <PricingBreakdownCard
      cardedRate={result.cardedRate}
      cardedComparisonRate={result.cardedComparisonRate}
      suggestedRate={result.suggestedRate}
      floorRate={result.floorRate}
      topRate={result.topRate}
      requestedRate={result.requestedRate}
      finalDisplayRate={result.finalDisplayRate}
      totalAdjustment={result.totalAdjustment}
      pricingBasis={result.pricingBasis}
      scoreDiscountPct={result.scoreDiscountPct}
      discountBlockedByFloorPct={result.discountBlockedByFloorPct}
      requestedBelowSuggested={requestedBelowSuggested}
      requestedRateLabel={
        scenarioActive ? "Scenario customer rate" : "Requested rate"
      }
      bare={isDetail}
    />
  );

  const profitabilitySection = (
    <ProfitabilityMetricsGrid
      profitability={result.profitability}
      margin={result.margin}
      bare={isDetail}
      baselineProfitability={
        scenarioActive ? scenarioBaseline?.profitability : undefined
      }
    />
  );

  const scoreSection = result.customerScore ? (
    <CustomerScorePanel customerScore={result.customerScore} bare={isDetail} />
  ) : null;

  const marketSection = result.competitorComparison ? (
    <MarketComparisonPanel
      comparison={result.competitorComparison}
      bare={isDetail}
    />
  ) : null;

  const inputsSummarySection = (
    <InputsSummaryCard
      lvr={result.lvr}
      context={context}
      riskWarnings={riskWarnings}
      bare={isDetail}
    />
  );

  const explanationSection = result.explanationText ? (
    <details className="group">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-3 text-[13px] font-semibold text-ink transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
        Pricing explanation
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 text-faint transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <pre className="whitespace-pre-wrap pb-4 font-sans text-xs leading-relaxed text-muted">
        {result.explanationText}
      </pre>
    </details>
  ) : null;

  const opacityClass = loading ? "opacity-60" : "opacity-100";

  // Sidebar: the dark decision surface, then one flush instrument column —
  // segments separated by hairlines, never boxed.
  if (!isDetail) {
    return (
      <div className={`transition-opacity duration-150 ${opacityClass}`}>
        <SuggestedRateHero
          suggestedRate={result.suggestedRate}
          cardedRate={result.cardedRate}
          totalAdjustment={result.totalAdjustment}
          pricingBasis={result.pricingBasis}
          approvalLevel={result.approvalLevel}
          marginStatus={result.margin.status}
          requestedRate={result.requestedRate}
          requestedBelowSuggested={requestedBelowSuggested}
          requestedRateLabel={
            scenarioActive ? "Scenario customer rate" : "Requested"
          }
          loading={loading}
        />
        {scenarioControl}
        {retentionNoticeSection && (
          <div className="mt-3">{retentionNoticeSection}</div>
        )}
        <div className="mt-4 divide-y divide-border border-b border-border">
          <ApprovalStatusCard
            approvalLevel={result.approvalLevel}
            reasons={result.approvalReasons}
            nextAction={result.suggestedNextAction}
          />
          {warningsSection && <div className="py-4">{warningsSection}</div>}
          <IndicativeRepaymentCard
            monthlyRepayment={result.monthlyRepayment}
            fortnightlyRepayment={result.fortnightlyRepayment}
            usingRequested={usingRequested}
            rateLabel={scenarioActive ? "scenario customer rate" : undefined}
          />
          <div className="simple-optional">{breakdownSection}</div>
          <div className="simple-optional">{profitabilitySection}</div>
          {scoreSection && (
            <div className="simple-optional">{scoreSection}</div>
          )}
          {marketSection && (
            <div className="simple-optional">{marketSection}</div>
          )}
          <div className="simple-optional">{inputsSummarySection}</div>
          {explanationSection && (
            <div className="simple-optional">{explanationSection}</div>
          )}
          <details className="simple-only group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 py-3 text-[13px] font-semibold text-ink transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
              More pricing detail
              <ChevronDown
                size={15}
                strokeWidth={1.75}
                aria-hidden
                className="shrink-0 text-faint transition-transform duration-150 group-open:rotate-180"
              />
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {breakdownSection}
              {profitabilitySection}
              {scoreSection}
              {marketSection}
              {inputsSummarySection}
              {explanationSection}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Detail: the shared decision band (rate, approval, repayments), then the
  // full working in always-open sections — nothing behind a disclosure except
  // the long-form explanation.
  const marginState =
    MARGIN_STATUS[result.margin.status] ?? MARGIN_STATUS.unavailable;

  return (
    <div
      className={`space-y-5 transition-opacity duration-150 ${opacityClass}`}
    >
      <QuoteDecisionBand
        rateLabel="Suggested rate"
        rateValue={result.suggestedRate}
        statusBadge={{
          tone: marginState.tone,
          label: `Margin: ${marginState.label}`,
        }}
        rateLines={
          <>
            {result.cardedRate != null && (
              <DecisionBandRateLine>
                Carded {fmtPct(result.cardedRate)}
                <span className="mx-1.5 opacity-70">→</span>
                <span
                  className={
                    result.totalAdjustment < 0
                      ? "text-brand-glow"
                      : "text-rail-ink"
                  }
                >
                  {result.pricingBasis === "discount_entitlement_v1"
                    ? `${Math.max(0, -result.totalAdjustment).toFixed(2)}% total discount`
                    : `${fmtSignedPct(result.totalAdjustment)} legacy adjustment`}
                </span>
              </DecisionBandRateLine>
            )}
            {result.requestedRate != null && (
              <DecisionBandRateLine warn={requestedBelowSuggested}>
                Requested {fmtPct(result.requestedRate)}
                {requestedBelowSuggested ? " — below suggested" : ""}
              </DecisionBandRateLine>
            )}
          </>
        }
        approvalLevel={result.approvalLevel}
        approvalReasons={result.approvalReasons}
        nextAction={result.suggestedNextAction}
        repaymentRows={[
          { label: "Monthly", value: fmtMoney(result.monthlyRepayment, 2) },
          {
            label: "Fortnightly",
            value: fmtMoney(result.fortnightlyRepayment, 2),
          },
        ]}
        repaymentNote={`At the ${
          usingRequested ? "requested rate" : "suggested rate"
        }. Indicative estimates, principal & interest.`}
        loading={loading}
      />

      {retentionNoticeSection}

      {result.warnings.length > 0 && (
        <WarningList warnings={result.warnings} dense />
      )}

      <DetailSectionGroup title="Pricing & customer detail">
        <DetailSection
          title="Rate path & pricing breakdown"
          description="Carded, suggested, requested and customer-rate path."
        >
          {breakdownSection}
        </DetailSection>
        <DetailSection
          title="First-year profitability"
          description="Annual revenue, funding cost, NIM and the full waterfall."
          className="simple-optional"
        >
          {profitabilitySection}
        </DetailSection>
        {scoreSection && (
          <DetailSection
            title="Customer score"
            description="Score, band and the category drivers behind it."
            className="simple-optional"
          >
            {scoreSection}
          </DetailSection>
        )}
        {marketSection && (
          <DetailSection
            title="Market comparison"
            description="Where the suggested rate sits against the market."
            className="simple-optional"
          >
            {marketSection}
          </DetailSection>
        )}
      </DetailSectionGroup>

      {result.explanationText && (
        <div className="simple-optional">
          <PricingExplanationDisclosure text={result.explanationText} />
        </div>
      )}
    </div>
  );
}
