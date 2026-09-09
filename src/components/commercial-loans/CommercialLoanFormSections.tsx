"use client";

import {
  FINANCIALS_QUALITY_LABELS,
  INDUSTRY_LABELS,
  PROFIT_TREND_LABELS,
  REVENUE_TREND_LABELS,
  RISK_GRADE_LABELS,
  TAX_STATUS_LABELS,
} from "@/lib/pricing/commercial/config";
import type { CommercialPricingResult } from "@/lib/pricing/commercial/types";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import type { FormState } from "@/components/commercial-loans/form-state";
import { CapitalAllocationCard } from "@/components/quote/CapitalAllocationCard";
import { CompetitorPricingCard } from "@/components/quote/CompetitorPricingCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, NumberInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusText } from "@/components/ui/StatusText";

export type CommercialFieldSetter = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

interface SectionStateProps {
  open: boolean;
  onToggle: (open: boolean) => void;
}

export function CommercialRiskSection({
  form,
  set,
  customerConcentrationThresholdPct,
  assessed,
  open,
  onToggle,
}: SectionStateProps & {
  form: FormState;
  set: CommercialFieldSetter;
  customerConcentrationThresholdPct: number;
  assessed: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-risk"
      layout="hanging"
      title="Business risk"
      chip={
        assessed ? (
          <StatusText tone="ok">Assessed</StatusText>
        ) : (
          <StatusText tone="warn">Needs detail</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Industry" htmlFor="cl-industry">
          <select
            id="cl-industry"
            className={inputClass}
            value={form.industryCategory}
            onChange={(event) => set("industryCategory", event.target.value)}
          >
            {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Business risk grade"
          htmlFor="cl-grade"
          helper="From the credit assessment; grade 1 is strongest."
        >
          <select
            id="cl-grade"
            className={inputClass}
            value={form.businessRiskGrade}
            onChange={(event) => set("businessRiskGrade", event.target.value)}
          >
            {Object.entries(RISK_GRADE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Years trading" htmlFor="cl-trading">
          <NumberInput
            id="cl-trading"
            suffix="years"
            value={form.yearsTrading}
            onChange={(value) => set("yearsTrading", value)}
          />
        </Field>
        <Field label="Annual revenue" htmlFor="cl-revenue">
          <MoneyInput
            id="cl-revenue"
            value={form.annualRevenue}
            onChange={(value) => set("annualRevenue", value)}
          />
        </Field>
        <Field
          label="EBITDA"
          htmlFor="cl-ebitda"
          helper="Annual cash flow available for debt service."
        >
          <MoneyInput
            id="cl-ebitda"
            value={form.ebitda}
            onChange={(value) => set("ebitda", value)}
          />
        </Field>
        <Field label="Existing annual debt service" htmlFor="cl-debtservice">
          <MoneyInput
            id="cl-debtservice"
            value={form.existingAnnualDebtService}
            onChange={(value) => set("existingAnnualDebtService", value)}
          />
        </Field>
        <Field
          label="Financials quality"
          htmlFor="cl-financials-quality"
          helper="Confidence in the figures used for assessment."
        >
          <select
            id="cl-financials-quality"
            className={inputClass}
            value={form.financialsQuality}
            onChange={(event) => set("financialsQuality", event.target.value)}
          >
            {Object.entries(FINANCIALS_QUALITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Financials age"
          htmlFor="cl-financials-age"
          helper="Months since the financials period end."
        >
          <NumberInput
            id="cl-financials-age"
            suffix="months"
            value={form.financialsAgeMonths}
            onChange={(value) => set("financialsAgeMonths", value)}
          />
        </Field>
        <Field label="Revenue trend" htmlFor="cl-revenue-trend">
          <select
            id="cl-revenue-trend"
            className={inputClass}
            value={form.revenueTrend}
            onChange={(event) => set("revenueTrend", event.target.value)}
          >
            {Object.entries(REVENUE_TREND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profit trend" htmlFor="cl-profit-trend">
          <select
            id="cl-profit-trend"
            className={inputClass}
            value={form.profitTrend}
            onChange={(event) => set("profitTrend", event.target.value)}
          >
            {Object.entries(PROFIT_TREND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ATO tax status" htmlFor="cl-tax-status">
          <select
            id="cl-tax-status"
            className={inputClass}
            value={form.taxStatus}
            onChange={(event) => set("taxStatus", event.target.value)}
          >
            {Object.entries(TAX_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={`Does the largest customer contribute more than ${customerConcentrationThresholdPct.toLocaleString(
            "en-AU",
            { maximumFractionDigits: 2 },
          )}% of annual revenue?`}
          helper="Select Yes or No. The cutoff is fictional in Commercial policy thresholds."
        >
          <SegmentedControl
            value={form.largestCustomerRevenueAboveThreshold}
            onChange={(value) =>
              set("largestCustomerRevenueAboveThreshold", value)
            }
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            ariaLabel={`Largest customer contributes more than ${customerConcentrationThresholdPct}% of annual revenue`}
            size="md"
            fullWidth
          />
        </Field>
      </div>
    </CollapsibleSection>
  );
}

export function CommercialRelationshipSection({
  form,
  set,
  provided,
  open,
  onToggle,
}: SectionStateProps & {
  form: FormState;
  set: CommercialFieldSetter;
  provided: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-relationship"
      layout="hanging"
      title="Relationship value"
      chip={
        provided ? (
          <StatusText tone="info">Provided</StatusText>
        ) : (
          <StatusText tone="muted">Optional</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Relationship">
          <label className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.existingRelationship}
              onChange={(event) =>
                set("existingRelationship", event.target.checked)
              }
            />
            Existing Lender business relationship
          </label>
        </Field>
        <Field label="Strategic relationship">
          <label className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.vipCustomer}
              onChange={(event) => set("vipCustomer", event.target.checked)}
            />
            VIP customer
          </label>
        </Field>
        <Field
          label="Operating / based in Region"
          htmlFor="cl-operating-in-region"
          helper="Whether the business operates or is based in Lender's region."
        >
          <select
            id="cl-operating-in-region"
            className={inputClass}
            value={form.operatingInRegion}
            onChange={(event) =>
              set(
                "operatingInRegion",
                event.target.value as FormState["operatingInRegion"],
              )
            }
          >
            <option value="">Not entered</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Years with Lender" htmlFor="cl-yearswith">
          <NumberInput
            id="cl-yearswith"
            suffix="years"
            value={form.yearsWithLender}
            onChange={(value) => set("yearsWithLender", value)}
            disabled={!form.existingRelationship}
          />
        </Field>
        <Field
          label="Other Lender lending exposure"
          htmlFor="cl-exposure"
          helper="Counts toward aggregate exposure limits."
        >
          <MoneyInput
            id="cl-exposure"
            value={form.otherLenderExposure}
            onChange={(value) => set("otherLenderExposure", value)}
          />
        </Field>
      </div>
    </CollapsibleSection>
  );
}

export function CommercialCapitalSection({
  form,
  set,
  capitalAllocation,
  isOverdraft,
  canOverride,
  open,
  onToggle,
}: SectionStateProps & {
  form: FormState;
  set: CommercialFieldSetter;
  capitalAllocation:
    CommercialPricingResult["profitability"]["capitalAllocation"] | null;
  isOverdraft: boolean;
  canOverride: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-capital"
      layout="hanging"
      title="Capital allocation"
      chip={
        capitalAllocation?.classificationBasis === "provisional" ? (
          <StatusText tone="warn">Unconfirmed</StatusText>
        ) : (
          <StatusText tone="muted">Capital policy</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <CapitalAllocationCard
        variant="commercial"
        canOverride={canOverride}
        capitalAllocation={capitalAllocation}
        isOverdraft={isOverdraft}
        isCommercialProperty={
          form.facilityType === "commercial_property" ||
          form.apsExposureClass === "commercial_property_dependent"
        }
        currentDrawnBalance={form.currentDrawnBalance}
        onCurrentDrawnBalanceChange={(value) =>
          set("currentDrawnBalance", value)
        }
        apsExposureClass={form.apsExposureClass}
        onApsExposureClassChange={(value) => set("apsExposureClass", value)}
        capitalClassificationConfirmed={form.capitalClassificationConfirmed}
        onCapitalClassificationConfirmedChange={(value) =>
          set("capitalClassificationConfirmed", value)
        }
        capitalPropertyStandardStatus={form.capitalPropertyStandardStatus}
        onCapitalPropertyStandardStatusChange={(value) =>
          set("capitalPropertyStandardStatus", value)
        }
        capitalPropertyCashFlowDependent={form.capitalPropertyCashFlowDependent}
        onCapitalPropertyCashFlowDependentChange={(value) =>
          set("capitalPropertyCashFlowDependent", value)
        }
        riskWeightOverridePct={form.riskWeightOverridePct}
        onRiskWeightOverridePctChange={(value) =>
          set("riskWeightOverridePct", value)
        }
        taxRateOverridePct={form.taxRateOverridePct}
        onTaxRateOverridePctChange={(value) => set("taxRateOverridePct", value)}
        creditConversionFactorOverridePct={
          form.creditConversionFactorOverridePct
        }
        onCreditConversionFactorOverridePctChange={(value) =>
          set("creditConversionFactorOverridePct", value)
        }
        capitalOverrideReason={form.capitalOverrideReason}
        onCapitalOverrideReasonChange={(value) =>
          set("capitalOverrideReason", value)
        }
      />
    </CollapsibleSection>
  );
}

export function CommercialRequestedPricingSection({
  form,
  set,
  marketEvidence,
  onDetachMarketEvidence,
  inPlay,
  open,
  onToggle,
}: SectionStateProps & {
  form: FormState;
  set: CommercialFieldSetter;
  marketEvidence: MarketQuoteEvidence | null;
  onDetachMarketEvidence: () => void;
  inPlay: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-requested"
      layout="hanging"
      title="Requested rate & notes"
      chip={
        inPlay ? (
          <StatusText tone="info">In play</StatusText>
        ) : (
          <StatusText tone="muted">Optional</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <CompetitorPricingCard
          competitorLender={form.competitorLender}
          onCompetitorLenderChange={(value) => set("competitorLender", value)}
          competitorRate={form.competitorRate}
          onCompetitorRateChange={(value) => set("competitorRate", value)}
          competitorNotes={form.competitorNotes}
          onCompetitorNotesChange={(value) => set("competitorNotes", value)}
          requestedRate={form.requestedRate}
          onRequestedRateChange={(value) => set("requestedRate", value)}
          requestedReason={form.requestedReason}
          onRequestedReasonChange={(value) => set("requestedReason", value)}
          requestedReasonNotes={form.requestedReasonNotes}
          onRequestedReasonNotesChange={(value) =>
            set("requestedReasonNotes", value)
          }
          marketEvidence={marketEvidence}
          onDetachMarketEvidence={onDetachMarketEvidence}
        />
        <Field label="Notes" htmlFor="cl-notes" className="@md:col-span-2">
          <textarea
            id="cl-notes"
            rows={3}
            className={`${inputClass} min-h-[80px]`}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
      </div>
    </CollapsibleSection>
  );
}
