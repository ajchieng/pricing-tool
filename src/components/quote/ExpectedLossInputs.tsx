import { Field, inputClass } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/inputs";
import { StatusText } from "@/components/ui/StatusText";
import { fmtMoney } from "@/lib/format";
import type { ExpectedLossResult } from "@/lib/pricing/credit-risk/expected-loss";

export function ExpectedLossInputs({
  amount,
  onAmountChange,
  unit,
  percentLabel,
  expectedLoss,
  canAuthorise,
  overrideEnabled,
  onOverrideEnabledChange,
  overrideReason,
  onOverrideReasonChange,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  unit: "dollar" | "percent";
  percentLabel: string;
  expectedLoss: ExpectedLossResult | null | undefined;
  canAuthorise: boolean;
  overrideEnabled: boolean;
  onOverrideEnabledChange: (enabled: boolean) => void;
  overrideReason: string;
  onOverrideReasonChange: (reason: string) => void;
}) {
  const suffix = unit === "percent" ? percentLabel : "$ / yr";
  const basis = expectedLoss?.basis;
  const status =
    basis === "manual_override"
      ? {
          tone: "warn" as const,
          label: `Demo override in use: ${fmtMoney(
            expectedLoss?.effectiveExpectedCreditLossAmount,
          )}`,
        }
      : basis === "calculated"
        ? {
            tone: "info" as const,
            label: `Fictional ECL in use: ${fmtMoney(
              expectedLoss?.effectiveExpectedCreditLossAmount,
            )}`,
          }
        : expectedLoss?.effectiveExpectedCreditLossAmount != null
          ? {
              tone: "warn" as const,
              label: `Provisional assumption in use: ${fmtMoney(
                expectedLoss.effectiveExpectedCreditLossAmount,
              )}`,
            }
          : { tone: "muted" as const, label: "Awaiting calculation" };

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-xs leading-5 text-muted">
          Used provisionally when fictional expected credit loss (ECL) cannot be
          calculated. Fictional ECL wins automatically unless an authorised
          override is enabled.
        </p>
        <StatusText tone={status.tone}>{status.label}</StatusText>
      </div>
      <div className="grid gap-4 @md:grid-cols-2">
        <Field
          label="Expected credit loss assumption"
          htmlFor="expected-credit-loss-override"
          helper={
            unit === "percent"
              ? `Percentage of ${percentLabel.replace("% ", "")}.`
              : "Annual dollar amount. Defaults to $0."
          }
        >
          <NumberInput
            id="expected-credit-loss-override"
            suffix={suffix}
            value={amount}
            onChange={onAmountChange}
          />
        </Field>
        {canAuthorise ? (
          <Field label="Override authority">
            <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={overrideEnabled}
                onChange={(event) =>
                  onOverrideEnabledChange(event.target.checked)
                }
              />
              <span>Use as demo override</span>
            </label>
          </Field>
        ) : null}
        {canAuthorise && overrideEnabled ? (
          <Field
            label="Expected-loss override reason"
            htmlFor="expected-loss-override-reason"
            required
            className="@md:col-span-2"
            helper="Saved with your identity in the audit history."
          >
            <textarea
              id="expected-loss-override-reason"
              className={`${inputClass} min-h-20`}
              value={overrideReason}
              onChange={(event) => onOverrideReasonChange(event.target.value)}
              required
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}
