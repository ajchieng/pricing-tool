import type { RefObject } from "react";
import type { PricingResult } from "@/lib/pricing/types";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import type { ProductOption } from "@/lib/products/types";
import type { FormState } from "@/components/home-loans/form-state";
import { LoanDetailsCard } from "@/components/quote/LoanDetailsCard";
import { CustomerRiskCard } from "@/components/quote/CustomerRiskCard";
import { RetentionRiskCard } from "@/components/quote/RetentionRiskCard";
import { RelationshipContextCard } from "@/components/quote/RelationshipContextCard";
import { StrategicContextCard } from "@/components/quote/StrategicContextCard";
import { CapitalAllocationCard } from "@/components/quote/CapitalAllocationCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field, inputClass } from "@/components/ui/Field";
import { StatusText } from "@/components/ui/StatusText";

export type HomeFieldSetter = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type SectionShellProps = {
  open: boolean;
  onToggle: (open: boolean) => void;
};

export function HomeLoanDetailsSection({
  form,
  set,
  complete,
  fixedPeriods,
  filteredProducts,
  selectedProduct,
  loanAmountRef,
  lvr,
  cardedRate,
  onLoanPurposeChange,
  onRateTypeChange,
  onFixedPeriodChange,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
  complete: boolean;
  fixedPeriods: [number, string][];
  filteredProducts: ProductOption[];
  selectedProduct: ProductOption | null;
  loanAmountRef: RefObject<HTMLInputElement | null>;
  lvr: number | null;
  cardedRate: number | null;
  onLoanPurposeChange: (value: FormState["loanPurpose"]) => void;
  onRateTypeChange: (value: FormState["rateType"]) => void;
  onFixedPeriodChange: (value: number | null) => void;
}) {
  return (
    <CollapsibleSection
      id="quote-section-loan"
      layout="hanging"
      title="Loan details"
      chip={
        complete ? (
          <StatusText tone="ok">Complete</StatusText>
        ) : (
          <StatusText tone="muted">Incomplete</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <LoanDetailsCard
        loanPurpose={form.loanPurpose}
        onLoanPurposeChange={onLoanPurposeChange}
        rateType={form.rateType}
        onRateTypeChange={onRateTypeChange}
        fixedPeriodMonths={form.fixedPeriodMonths}
        onFixedPeriodChange={onFixedPeriodChange}
        fixedPeriods={fixedPeriods}
        productId={form.productId}
        onProductIdChange={(value) => set("productId", value)}
        filteredProducts={filteredProducts}
        selectedProduct={selectedProduct}
        loanAmount={form.loanAmount}
        onLoanAmountChange={(value) => set("loanAmount", value)}
        loanAmountRef={loanAmountRef}
        propertyValue={form.propertyValue}
        onPropertyValueChange={(value) => set("propertyValue", value)}
        loanTermYears={form.loanTermYears}
        onLoanTermYearsChange={(value) => set("loanTermYears", value)}
        lvr={lvr}
        cardedRate={cardedRate}
      />
    </CollapsibleSection>
  );
}

export function HomeRiskSection({
  form,
  set,
  assessed,
  retentionScenario,
  serviceabilityNsiEnabled,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
  assessed: boolean;
  retentionScenario: boolean;
  serviceabilityNsiEnabled: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-risk"
      layout="hanging"
      title="Customer risk"
      chip={
        assessed ? (
          <StatusText tone="ok">Assessed</StatusText>
        ) : (
          <StatusText tone="warn">Not assessed</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      {retentionScenario ? (
        <RetentionRiskCard
          currentCustomerRate={form.currentCustomerRate}
          onCurrentCustomerRateChange={(value) =>
            set("currentCustomerRate", value)
          }
          arrearsHardship18Months={form.retentionArrearsHardship18Months}
          onArrearsHardship18MonthsChange={(value) => {
            set("retentionArrearsHardship18Months", value);
            if (value !== "yes") set("retentionArrearsPast12Months", "");
          }}
          arrearsPast12Months={form.retentionArrearsPast12Months}
          onArrearsPast12MonthsChange={(value) =>
            set("retentionArrearsPast12Months", value)
          }
          riskNotes={form.riskNotes}
          onRiskNotesChange={(value) => set("riskNotes", value)}
        />
      ) : (
        <CustomerRiskCard
          creditScores={form.creditScores}
          onCreditScoresChange={(value) => set("creditScores", value)}
          dtiRatio={form.dtiRatio}
          onDtiRatioChange={(value) => set("dtiRatio", value)}
          grossAnnualIncome={form.grossAnnualIncome}
          onGrossAnnualIncomeChange={(value) => set("grossAnnualIncome", value)}
          serviceabilityIncomeMeasure={form.serviceabilityIncomeMeasure}
          onServiceabilityIncomeMeasureChange={(value) => {
            set("serviceabilityIncomeMeasure", value);
            if (value === "serviceability_nsi") {
              set("grossAnnualIncome", "");
            } else {
              set("serviceabilityNsi", "");
            }
          }}
          serviceabilityNsi={form.serviceabilityNsi}
          onServiceabilityNsiChange={(value) => set("serviceabilityNsi", value)}
          serviceabilityNsiEnabled={serviceabilityNsiEnabled}
          riskNotes={form.riskNotes}
          onRiskNotesChange={(value) => set("riskNotes", value)}
        />
      )}
    </CollapsibleSection>
  );
}

export function HomeRelationshipSection({
  form,
  set,
  provided,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
  provided: boolean;
}) {
  return (
    <CollapsibleSection
      id="quote-section-relationship"
      layout="hanging"
      title="Relationship"
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
      <RelationshipContextCard
        yearsAsMember={form.yearsAsMember}
        onYearsAsMemberChange={(value) => set("yearsAsMember", value)}
        existingLenderLoan={form.existingLenderLoan}
        onExistingLenderLoanChange={(value) => set("existingLenderLoan", value)}
        lenderProducts={form.lenderProducts}
        onLenderProductsChange={(value) => set("lenderProducts", value)}
        relationshipNotes={form.relationshipNotes}
        onRelationshipNotesChange={(value) => set("relationshipNotes", value)}
      />
    </CollapsibleSection>
  );
}

/**
 * Rendered under the `competitor` section key — the workspace label is
 * "Strategic" but the key and imported-field mapping predate the rename.
 */
export function HomeStrategicSection({
  form,
  set,
  provided,
  marketEvidence,
  onDetachMarketEvidence,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
  provided: boolean;
  marketEvidence: MarketQuoteEvidence | null;
  onDetachMarketEvidence: () => void;
}) {
  return (
    <CollapsibleSection
      id="quote-section-strategic"
      layout="hanging"
      title="Strategic"
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
      <StrategicContextCard
        livesInServiceRegion={form.livesInServiceRegion}
        onLivesInServiceRegionChange={(value) =>
          set("livesInServiceRegion", value)
        }
        vipCustomer={form.vipCustomer}
        onVipCustomerChange={(value) => set("vipCustomer", value)}
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
    </CollapsibleSection>
  );
}

export function HomeCapitalSection({
  form,
  set,
  canOverride,
  capitalAllocation,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
  canOverride: boolean;
  capitalAllocation: PricingResult["profitability"]["capitalAllocation"] | null;
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
        variant="home"
        canOverride={canOverride}
        capitalAllocation={capitalAllocation}
        capitalStandardStatus={form.capitalStandardStatus}
        onCapitalStandardStatusChange={(value) =>
          set("capitalStandardStatus", value)
        }
        eligibleLmi={form.eligibleLmi}
        onEligibleLmiChange={(value) => set("eligibleLmi", value)}
        homeGuaranteeSchemeEligible={form.homeGuaranteeSchemeEligible}
        onHomeGuaranteeSchemeEligibleChange={(value) =>
          set("homeGuaranteeSchemeEligible", value)
        }
        riskWeightOverridePct={form.riskWeightOverridePct}
        onRiskWeightOverridePctChange={(value) =>
          set("riskWeightOverridePct", value)
        }
        taxRateOverridePct={form.taxRateOverridePct}
        onTaxRateOverridePctChange={(value) => set("taxRateOverridePct", value)}
        capitalOverrideReason={form.capitalOverrideReason}
        onCapitalOverrideReasonChange={(value) =>
          set("capitalOverrideReason", value)
        }
      />
    </CollapsibleSection>
  );
}

export function HomeNotesSection({
  form,
  set,
  open,
  onToggle,
}: SectionShellProps & {
  form: FormState;
  set: HomeFieldSetter;
}) {
  return (
    <CollapsibleSection
      id="quote-section-notes"
      layout="hanging"
      title="Notes"
      open={open}
      onToggle={onToggle}
    >
      <Field label="Quote notes" htmlFor="quote-notes">
        <textarea
          id="quote-notes"
          className={inputClass}
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Context for this quote — saved on the record."
        />
      </Field>
    </CollapsibleSection>
  );
}
