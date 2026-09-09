import { Field, inputClass } from "@/components/ui/Field";
import { RateInput } from "@/components/ui/inputs";
import { Select } from "@/components/quote-form-ui";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function RetentionRiskCard({
  currentCustomerRate,
  onCurrentCustomerRateChange,
  arrearsHardship18Months,
  onArrearsHardship18MonthsChange,
  arrearsPast12Months,
  onArrearsPast12MonthsChange,
  riskNotes,
  onRiskNotesChange,
}: {
  currentCustomerRate: string;
  onCurrentCustomerRateChange: (value: string) => void;
  arrearsHardship18Months: string;
  onArrearsHardship18MonthsChange: (value: string) => void;
  arrearsPast12Months: string;
  onArrearsPast12MonthsChange: (value: string) => void;
  riskNotes: string;
  onRiskNotesChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-4 max-w-prose text-xs text-muted">
        Retention pricing starts from the customer&apos;s current rate and
        limits any further discount according to recent arrears or hardship
        history.
      </p>
      <div className="grid gap-4 @md:grid-cols-2">
        <Field
          label="Current customer rate"
          htmlFor="current-customer-rate"
          helper="Required for a retention quote."
        >
          <RateInput
            id="current-customer-rate"
            value={currentCustomerRate}
            onChange={onCurrentCustomerRateChange}
          />
        </Field>
        <Select
          label="Any arrears or hardship in the past 18 months?"
          value={arrearsHardship18Months}
          onChange={onArrearsHardship18MonthsChange}
          options={YES_NO_OPTIONS}
          placeholder="Select…"
        />
        {arrearsHardship18Months === "yes" && (
          <Select
            label="Any arrears in the past 12 months?"
            value={arrearsPast12Months}
            onChange={onArrearsPast12MonthsChange}
            options={YES_NO_OPTIONS}
            placeholder="Select…"
          />
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
            onChange={(event) => onRiskNotesChange(event.target.value)}
            placeholder="Optional context for the retention assessment."
          />
        </Field>
      </div>
    </div>
  );
}
