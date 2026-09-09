import { EMPLOYMENT_OPTIONS } from "@/lib/format";
import {
  PERSONAL_LOAN_LIMITS,
  PERSONAL_PURPOSE_LABELS,
} from "@/lib/pricing/personal/config";
import type { PersonalPricingResult } from "@/lib/pricing/personal/types";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import type { FormState } from "@/components/personal-loans/form-state";
import type { PersonalLoanProductOption } from "@/components/personal-loans/form-initialization";
import { RetentionRiskCard } from "@/components/quote/RetentionRiskCard";
import { CreditScoreFields } from "@/components/quote/CreditScoreFields";
import { CompetitorPricingCard } from "@/components/quote/CompetitorPricingCard";
import { CapitalAllocationCard } from "@/components/quote/CapitalAllocationCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, NumberInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusText } from "@/components/ui/StatusText";

export type PersonalFieldSetter = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type SectionShellProps = {
  open: boolean;
  onToggle: (open: boolean) => void;
};

export function PersonalLoanDetailsSection({
  form,
  products,
  selectedProduct,
  complete,
  open,
  onToggle,
  set,
  onProductChange,
  onSecurityChange,
}: SectionShellProps & {
  form: FormState;
  products: PersonalLoanProductOption[];
  selectedProduct: PersonalLoanProductOption | undefined;
  complete: boolean;
  set: PersonalFieldSetter;
  onProductChange: (productId: string) => void;
  onSecurityChange: (securityType: FormState["securityType"]) => void;
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
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Loan purpose" htmlFor="pl-purpose" required>
          <select
            id="pl-purpose"
            className={inputClass}
            value={form.loanPurpose}
            onChange={(event) => set("loanPurpose", event.target.value)}
          >
            {Object.entries(PERSONAL_PURPOSE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Personal loan product"
          htmlFor="pl-product"
          helper={
            selectedProduct?.cardedRate != null
              ? `${selectedProduct.cardedRate.toFixed(2)}% p.a.${
                  selectedProduct.comparisonRate != null
                    ? ` · ${selectedProduct.comparisonRate.toFixed(2)}% comparison`
                    : ""
                }`
              : "Falls back to the official secured/unsecured carded rate if no catalogue row is active."
          }
        >
          <select
            id="pl-product"
            className={inputClass}
            value={form.productId}
            onChange={(event) => onProductChange(event.target.value)}
          >
            {products.length === 0 && (
              <option value="">Official fallback rates</option>
            )}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Security"
          required
          helper="Security is the primary rate driver for personal lending."
        >
          <SegmentedControl
            ariaLabel="Security type"
            fullWidth
            value={form.securityType}
            onChange={onSecurityChange}
            options={[
              {
                value: "secured_vehicle",
                label: "Vehicle",
                disabled: selectedProduct?.securityType === "unsecured",
              },
              {
                value: "secured_savings",
                label: "Savings",
                disabled: selectedProduct?.securityType === "unsecured",
              },
              {
                value: "unsecured",
                label: "Unsecured",
                disabled: selectedProduct?.securityType === "secured",
              },
            ]}
          />
        </Field>
        <Field
          label="Loan amount"
          htmlFor="pl-amount"
          required
          helper={`$${PERSONAL_LOAN_LIMITS.minLoanAmount.toLocaleString("en-AU")} – $${PERSONAL_LOAN_LIMITS.maxLoanAmount.toLocaleString("en-AU")} (unsecured to $${PERSONAL_LOAN_LIMITS.maxUnsecuredLoanAmount.toLocaleString("en-AU")}).`}
        >
          <MoneyInput
            id="pl-amount"
            value={form.loanAmount}
            onChange={(value) => set("loanAmount", value)}
          />
        </Field>
        <Field
          label="Term"
          htmlFor="pl-term"
          required
          helper={`${PERSONAL_LOAN_LIMITS.minTermMonths}–${PERSONAL_LOAN_LIMITS.maxTermMonths} months.`}
        >
          <NumberInput
            id="pl-term"
            suffix="months"
            value={form.loanTermMonths}
            onChange={(value) => set("loanTermMonths", value)}
          />
        </Field>
      </div>
    </CollapsibleSection>
  );
}

export function PersonalRiskSection({
  form,
  assessed,
  open,
  onToggle,
  set,
}: SectionShellProps & {
  form: FormState;
  assessed: boolean;
  set: PersonalFieldSetter;
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
      {form.customerStream === "retention" ? (
        <RetentionRiskCard
          currentCustomerRate={form.currentCustomerRate}
          onCurrentCustomerRateChange={(value) =>
            set("currentCustomerRate", value)
          }
          arrearsHardship18Months={form.retentionArrearsHardship18Months}
          onArrearsHardship18MonthsChange={(value) =>
            set("retentionArrearsHardship18Months", value)
          }
          arrearsPast12Months={form.retentionArrearsPast12Months}
          onArrearsPast12MonthsChange={(value) =>
            set("retentionArrearsPast12Months", value)
          }
          riskNotes={form.riskNotes}
          onRiskNotesChange={(value) => set("riskNotes", value)}
        />
      ) : (
        <div className="grid gap-4 @md:grid-cols-2">
          <CreditScoreFields
            idPrefix="pl-score"
            creditScores={form.creditScores}
            onCreditScoresChange={(value) => set("creditScores", value)}
          />
          <Field label="Employment / income stability" htmlFor="pl-employment">
            <select
              id="pl-employment"
              className={inputClass}
              value={form.employmentIncomeStability}
              onChange={(event) =>
                set("employmentIncomeStability", event.target.value)
              }
            >
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </CollapsibleSection>
  );
}

export function PersonalRelationshipSection({
  yearsAsMember,
  provided,
  open,
  onToggle,
  set,
}: SectionShellProps & {
  yearsAsMember: string;
  provided: boolean;
  set: PersonalFieldSetter;
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
      <Field
        label="Years as member"
        htmlFor="pl-years-member"
        helper="Leave blank if the membership tenure is unknown."
      >
        <NumberInput
          id="pl-years-member"
          suffix="years"
          value={yearsAsMember}
          onChange={(value) => set("yearsAsMember", value)}
        />
      </Field>
    </CollapsibleSection>
  );
}

export function PersonalAffordabilitySection({
  form,
  assessed,
  open,
  onToggle,
  set,
}: SectionShellProps & {
  form: FormState;
  assessed: boolean;
  set: PersonalFieldSetter;
}) {
  return (
    <CollapsibleSection
      id="quote-section-affordability"
      layout="hanging"
      title="Repayment affordability"
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
      <p className="mb-3 text-xs text-muted">
        Monthly figures. The repayment is assessed against the surplus of income
        over expenses and existing commitments.
      </p>
      <div className="grid gap-4 @md:grid-cols-3">
        <Field label="Net monthly income" htmlFor="pl-income">
          <MoneyInput
            id="pl-income"
            value={form.netMonthlyIncome}
            onChange={(value) => set("netMonthlyIncome", value)}
          />
        </Field>
        <Field label="Living expenses" htmlFor="pl-expenses">
          <MoneyInput
            id="pl-expenses"
            value={form.monthlyLivingExpenses}
            onChange={(value) => set("monthlyLivingExpenses", value)}
          />
        </Field>
        <Field label="Existing debt repayments" htmlFor="pl-debt">
          <MoneyInput
            id="pl-debt"
            value={form.existingMonthlyDebtRepayments}
            onChange={(value) => set("existingMonthlyDebtRepayments", value)}
          />
        </Field>
      </div>
    </CollapsibleSection>
  );
}

export function PersonalRequestedPricingSection({
  form,
  requestedInPlay,
  marketEvidence,
  open,
  onToggle,
  set,
  onDetachMarketEvidence,
}: SectionShellProps & {
  form: FormState;
  requestedInPlay: boolean;
  marketEvidence: MarketQuoteEvidence | null;
  set: PersonalFieldSetter;
  onDetachMarketEvidence: () => void;
}) {
  return (
    <CollapsibleSection
      id="quote-section-requested"
      layout="hanging"
      title="Requested pricing"
      chip={
        requestedInPlay ? (
          <StatusText tone="info">In play</StatusText>
        ) : (
          <StatusText tone="muted">Optional</StatusText>
        )
      }
      open={open}
      onToggle={onToggle}
    >
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
    </CollapsibleSection>
  );
}

export function PersonalCapitalSection({
  form,
  capitalAllocation,
  canOverride,
  open,
  onToggle,
  set,
}: SectionShellProps & {
  form: FormState;
  capitalAllocation:
    PersonalPricingResult["profitability"]["capitalAllocation"] | null;
  canOverride: boolean;
  set: PersonalFieldSetter;
}) {
  return (
    <CollapsibleSection
      id="quote-section-capital"
      layout="hanging"
      title="Capital allocation"
      chip={<StatusText tone="muted">Capital policy · 100%</StatusText>}
      open={open}
      onToggle={onToggle}
    >
      <CapitalAllocationCard
        variant="personal"
        canOverride={canOverride}
        capitalAllocation={capitalAllocation}
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

export function PersonalNotesSection({
  notes,
  open,
  onToggle,
  set,
}: SectionShellProps & {
  notes: string;
  set: PersonalFieldSetter;
}) {
  return (
    <CollapsibleSection
      id="quote-section-notes"
      layout="hanging"
      title="Notes"
      open={open}
      onToggle={onToggle}
    >
      <Field label="Quote notes" htmlFor="pl-notes">
        <textarea
          id="pl-notes"
          rows={3}
          className={`${inputClass} min-h-[80px]`}
          value={notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Context for this quote — saved on the record."
        />
      </Field>
    </CollapsibleSection>
  );
}
