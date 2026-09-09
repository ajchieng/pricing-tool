import { useId } from "react";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import { Field, inputClass } from "@/components/ui/Field";

// Shared helpers and small controls for the quote form section components.
// Purely presentational — no form state lives here.

export const PROFITABILITY_CHANNEL_OPTIONS: Array<{
  value: ProfitabilityChannel;
  label: string;
}> = [
  { value: "broker", label: "Broker" },
  { value: "online", label: "Online" },
  { value: "direct", label: "Direct (includes branch)" },
];

export function fixedPeriodLabel(months: number | null): string {
  if (!months) return "";
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${months} months`;
}

export function normalizeProfitabilityChannel(
  value: unknown,
): ProfitabilityChannel {
  return value === "broker" || value === "online" || value === "direct"
    ? value
    : "direct";
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  helper?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} helper={helper}>
      <select
        id={id}
        aria-label={label}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Info({
  label: lbl,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{lbl}</span>
      <span className="tnum font-medium text-ink">{value}</span>
    </div>
  );
}
