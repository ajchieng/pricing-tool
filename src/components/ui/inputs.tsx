"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/Field";

// Numeric text inputs with unit affordances. Values stay plain strings in the
// caller's state (parsed at payload time, exactly as before); MoneyInput shows
// thousands grouping while unfocused and strips it on change so parseFloat
// keeps working.

type BaseProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  "aria-required"?: true;
  inputRef?: React.Ref<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

function groupThousands(raw: string): string {
  if (!raw.trim()) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-AU", { maximumFractionDigits: 2 });
}

function stripGrouping(raw: string): string {
  return raw.replace(/[,\s$]/g, "");
}

export function MoneyInput({ value, onChange, inputRef, ...props }: BaseProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
      >
        $
      </span>
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`${inputClass} pl-7 tnum`}
        value={focused ? value : groupThousands(value)}
        onChange={(e) => onChange(stripGrouping(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export function RateInput({ value, onChange, inputRef, ...props }: BaseProps) {
  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`${inputClass} pr-8 tnum`}
        value={value}
        onChange={(e) => onChange(stripGrouping(e.target.value))}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
      >
        %
      </span>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  suffix,
  inputRef,
  ...props
}: BaseProps & { suffix?: string }) {
  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={`${inputClass} tnum ${suffix ? "pr-14" : ""}`}
        value={value}
        onChange={(e) => onChange(stripGrouping(e.target.value))}
      />
      {suffix && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
