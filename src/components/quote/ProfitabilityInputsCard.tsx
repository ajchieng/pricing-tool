import { Field } from "@/components/ui/Field";
import { NumberInput, RateInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ProfitabilityChannel } from "@/lib/pricing/types";

// Section body: specialist P&L inputs for the profitability waterfall.
// Line items pre-fill from the fictional per-channel defaults (marked
// via `defaultFlags`); typing over a value overrides it for this quote. Items
// can be entered as $ / year or as a % of loan amount (converted by the parent).

export function ProfitabilityInputsCard({
  channel,
  costOfFunds,
  onCostOfFundsChange,
  costOfFundsDefaultApplied,
  commissions,
  onCommissionsChange,
  otherIncome,
  onOtherIncomeChange,
  expenses,
  onExpensesChange,
  defaultFlags,
  profitInputUnit,
  onSwitchUnit,
  profitUnitNotice,
  percentEnabled,
}: {
  channel: ProfitabilityChannel;
  costOfFunds: string;
  onCostOfFundsChange: (value: string) => void;
  costOfFundsDefaultApplied: boolean;
  commissions: string;
  onCommissionsChange: (value: string) => void;
  otherIncome: string;
  onOtherIncomeChange: (value: string) => void;
  expenses: string;
  onExpensesChange: (value: string) => void;
  defaultFlags: Record<"commissions" | "otherIncome" | "expenses", boolean>;
  profitInputUnit: "dollar" | "percent";
  onSwitchUnit: (unit: "dollar" | "percent") => void;
  profitUnitNotice: string | null;
  percentEnabled: boolean;
}) {
  const onlineChannel = channel === "online";
  const unitSuffix = profitInputUnit === "percent" ? "% loan" : "$ / yr";

  // No example-amount placeholders: a greyed number reads like a value, making
  // it unclear what is a pre-filled default versus an illustration.
  const lineItem = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { disabled?: boolean; helper?: string; defaultApplied?: boolean },
  ) => (
    <Field
      label={label}
      htmlFor={id}
      helper={
        opts?.helper ??
        (opts?.defaultApplied && value.trim() !== ""
          ? "Channel default — type to override."
          : undefined)
      }
    >
      <NumberInput
        id={id}
        suffix={unitSuffix}
        value={value}
        onChange={onChange}
        disabled={opts?.disabled}
      />
    </Field>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-xs text-muted">
          Optional — channel defaults pre-fill the line items; type over any
          value to use different figures for this quote.{" "}
          {profitInputUnit === "percent"
            ? "Line items are a % of loan amount. Tax is derived from profit before tax."
            : "Line items are annual dollar figures. Tax is derived from profit before tax."}
        </p>
        <SegmentedControl
          ariaLabel="Profitability input units"
          value={profitInputUnit}
          onChange={onSwitchUnit}
          options={[
            { value: "dollar", label: "$" },
            {
              value: "percent",
              label: "%",
              title: percentEnabled
                ? "Enter each line as a % of loan amount"
                : "Enter loan amount first to input percentages",
            },
          ]}
        />
      </div>
      {profitUnitNotice && (
        <p className="mb-3 rounded-md border border-info/25 bg-info-soft px-3 py-2 text-sm text-info">
          {profitUnitNotice}
        </p>
      )}
      <div className="grid gap-x-6 gap-y-4 @md:grid-cols-2">
        <Field
          label="Cost of funds"
          htmlFor="cost-of-funds"
          helper={
            costOfFundsDefaultApplied
              ? costOfFunds.trim() !== ""
                ? "Configured margin default — type to override."
                : "Percentage p.a. No configured margin default is available."
              : "Percentage p.a. Clear the field to restore the configured margin default."
          }
        >
          <RateInput
            id="cost-of-funds"
            value={costOfFunds}
            onChange={onCostOfFundsChange}
            placeholder="Configured default"
          />
        </Field>
        {lineItem(
          "commission-cost",
          "Commission cost",
          onlineChannel ? "0" : commissions,
          onCommissionsChange,
          {
            disabled: onlineChannel,
            helper: onlineChannel
              ? "Online channel has no commission cost."
              : undefined,
            defaultApplied: defaultFlags.commissions && !onlineChannel,
          },
        )}
        {lineItem(
          "other-income",
          "Other income",
          otherIncome,
          onOtherIncomeChange,
          { defaultApplied: defaultFlags.otherIncome },
        )}
        {lineItem("expenses", "Expenses", expenses, onExpensesChange, {
          defaultApplied: defaultFlags.expenses,
        })}
      </div>
    </div>
  );
}
