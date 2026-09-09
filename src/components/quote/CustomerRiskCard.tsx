import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, NumberInput } from "@/components/ui/inputs";
import { CreditScoreFields } from "@/components/quote/CreditScoreFields";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ServiceabilityIncomeMeasure } from "@/lib/pricing/types";

// Section body: customer risk context. Exact figures feed the customer score;
// the selects are manual flags for when figures aren't available.

export function CustomerRiskCard({
  creditScores,
  onCreditScoresChange,
  dtiRatio,
  onDtiRatioChange,
  grossAnnualIncome,
  onGrossAnnualIncomeChange,
  serviceabilityIncomeMeasure,
  onServiceabilityIncomeMeasureChange,
  serviceabilityNsi,
  onServiceabilityNsiChange,
  serviceabilityNsiEnabled,
  riskNotes,
  onRiskNotesChange,
}: {
  creditScores: string[];
  onCreditScoresChange: (value: string[]) => void;
  dtiRatio: string;
  onDtiRatioChange: (value: string) => void;
  grossAnnualIncome: string;
  onGrossAnnualIncomeChange: (value: string) => void;
  serviceabilityIncomeMeasure: ServiceabilityIncomeMeasure;
  onServiceabilityIncomeMeasureChange: (
    value: ServiceabilityIncomeMeasure,
  ) => void;
  serviceabilityNsi: string;
  onServiceabilityNsiChange: (value: string) => void;
  serviceabilityNsiEnabled: boolean;
  riskNotes: string;
  onRiskNotesChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-4 max-w-prose text-xs text-muted">
        Enter exact figures where known — they feed the customer score, pricing
        adjustment, warnings and approval thresholds. Pricing is indicative and
        subject to credit assessment.
      </p>
      <div className="grid gap-4 @md:grid-cols-2">
        <CreditScoreFields
          idPrefix="credit-score"
          creditScores={creditScores}
          onCreditScoresChange={onCreditScoresChange}
        />
        <Field
          label="Debt-to-income ratio"
          htmlFor="dti-ratio"
          helper="Total debt ÷ gross annual income."
        >
          <NumberInput
            id="dti-ratio"
            suffix="×"
            value={dtiRatio}
            onChange={onDtiRatioChange}
            placeholder="5.5"
          />
        </Field>
        {serviceabilityNsiEnabled && (
          <Field label="Income measure" className="@md:col-span-2">
            <SegmentedControl
              value={serviceabilityIncomeMeasure}
              onChange={onServiceabilityIncomeMeasureChange}
              ariaLabel="Income measure"
              fullWidth
              options={[
                {
                  value: "gross_annual_income",
                  label: "Gross annual income",
                },
                {
                  value: "serviceability_nsi",
                  label: "Serviceability NSI",
                },
              ]}
            />
          </Field>
        )}
        {serviceabilityIncomeMeasure === "serviceability_nsi" &&
        serviceabilityNsiEnabled ? (
          <Field
            label="Serviceability NSI"
            htmlFor="serviceability-nsi"
            helper="Monthly net surplus income after assessed commitments and living expenses."
            className="@md:col-span-2"
          >
            <MoneyInput
              id="serviceability-nsi"
              value={serviceabilityNsi}
              onChange={onServiceabilityNsiChange}
              placeholder="2,500"
            />
          </Field>
        ) : (
          <Field
            label="Gross annual income"
            htmlFor="gross-income"
            className="@md:col-span-2"
          >
            <MoneyInput
              id="gross-income"
              value={grossAnnualIncome}
              onChange={onGrossAnnualIncomeChange}
              placeholder="145,000"
            />
          </Field>
        )}
        <Field
          label="Risk notes"
          htmlFor="risk-notes"
          className="@md:col-span-2"
        >
          <textarea
            id="risk-notes"
            className={inputClass}
            rows={2}
            value={riskNotes}
            onChange={(e) => onRiskNotesChange(e.target.value)}
            placeholder="Anything affecting risk that isn't captured above."
          />
        </Field>
      </div>
    </div>
  );
}
