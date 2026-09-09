import { Field } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/inputs";
import { Button } from "@/components/ui/Button";
import type { QuoteFeeSettingConfig } from "@/lib/pricing/quote-fees";
import type { ReferenceFeeItem } from "@/lib/products/fees";

const MONEY = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function QuoteFeeInputs({
  idPrefix,
  setting,
  overrideEnabled,
  onOverrideEnabledChange,
  overrideValue,
  onOverrideValueChange,
  monthlyOverrideEnabled,
  onMonthlyOverrideEnabledChange,
  monthlyOverrideValue,
  onMonthlyOverrideValueChange,
  referenceFees = [],
  referenceFeeEmpty = "Select a product to view its reference fees.",
}: {
  idPrefix: string;
  setting: QuoteFeeSettingConfig;
  overrideEnabled: boolean;
  onOverrideEnabledChange: (enabled: boolean) => void;
  overrideValue: string;
  onOverrideValueChange: (value: string) => void;
  monthlyOverrideEnabled: boolean;
  onMonthlyOverrideEnabledChange: (enabled: boolean) => void;
  monthlyOverrideValue: string;
  onMonthlyOverrideValueChange: (value: string) => void;
  referenceFees?: ReferenceFeeItem[];
  referenceFeeEmpty?: string;
}) {
  const inputId = `${idPrefix}-upfront-fee-override`;
  const monthlyInputId = `${idPrefix}-monthly-fee-override`;
  const effectiveUpfrontFee = overrideEnabled
    ? overrideValue
    : String(setting.standardUpfrontFee);
  const effectiveMonthlyFee = monthlyOverrideEnabled
    ? monthlyOverrideValue
    : String(setting.monthlyFee);

  return (
    <div
      role="group"
      aria-label="Fees included in profitability"
      className="rounded-lg bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            Fees included in profitability
          </p>
          <p className="mt-0.5 max-w-[62ch] text-xs leading-5 text-muted">
            These are the only fees counted as first-year fee income.
          </p>
        </div>
        <details className="w-full sm:w-72">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-panel">
            <span>Reference fees</span>
            <span className="tnum text-xs text-muted">
              {referenceFees.length}
            </span>
          </summary>
          <div className="mt-2 border-y border-border py-1">
            {referenceFees.length > 0 ? (
              <dl className="divide-y divide-border">
                {referenceFees.map((fee) => (
                  <div
                    key={`${fee.label}-${fee.value}`}
                    className="flex items-baseline justify-between gap-4 py-2 text-sm"
                  >
                    <dt className="text-muted">{fee.label}</dt>
                    <dd className="tnum text-right font-semibold text-ink">
                      {fee.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="py-2 text-xs leading-5 text-muted">
                {referenceFeeEmpty}
              </p>
            )}
            <p className="border-t border-border py-2 text-xs leading-5 text-faint">
              Reference only. These fees are not included in quote
              profitability.
            </p>
          </div>
        </details>
      </div>

      {!setting.configured && (
        <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Fictional fee settings are unavailable. Any fee without a quote
          override will use $0, and the quote will retain a policy warning.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Charged upfront fee"
          htmlFor={inputId}
          helper={
            overrideEnabled
              ? `Custom for this quote. Fictional standard: ${MONEY.format(setting.standardUpfrontFee)}.`
              : "Fictional standard. Edit this amount to negotiate a different upfront fee."
          }
        >
          <MoneyInput
            id={inputId}
            value={effectiveUpfrontFee}
            onChange={(value) => {
              if (!overrideEnabled) onOverrideEnabledChange(true);
              onOverrideValueChange(value);
            }}
          />
          {overrideEnabled && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 -ml-3"
              onClick={() => onOverrideEnabledChange(false)}
            >
              Use fictional standard
            </Button>
          )}
        </Field>

        <Field
          label="Monthly fee"
          htmlFor={monthlyInputId}
          helper={
            monthlyOverrideEnabled
              ? `Custom for this quote. Fictional standard: ${MONEY.format(setting.monthlyFee)} per month.`
              : "Fictional standard. Edit this amount to negotiate a different monthly fee."
          }
        >
          <MoneyInput
            id={monthlyInputId}
            value={effectiveMonthlyFee}
            onChange={(value) => {
              if (!monthlyOverrideEnabled) {
                onMonthlyOverrideEnabledChange(true);
              }
              onMonthlyOverrideValueChange(value);
            }}
          />
          {monthlyOverrideEnabled && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 -ml-3"
              onClick={() => onMonthlyOverrideEnabledChange(false)}
            >
              Use fictional standard
            </Button>
          )}
        </Field>
      </div>
    </div>
  );
}
