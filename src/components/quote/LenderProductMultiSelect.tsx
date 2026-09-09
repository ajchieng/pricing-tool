"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import {
  Lender_PRODUCT_OPTIONS,
  lenderProductsFromJson,
  type LenderProduct,
} from "@/lib/pricing/lender-products";

export function toggleLenderProduct(
  values: readonly LenderProduct[],
  product: LenderProduct,
): LenderProduct[] {
  const next = values.includes(product)
    ? values.filter((value) => value !== product)
    : [...values, product];
  return lenderProductsFromJson(next);
}

export function LenderProductMultiSelect({
  value,
  onChange,
}: {
  value: LenderProduct[];
  onChange: (value: LenderProduct[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const optionsId = useId();

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("en-AU");
    return term
      ? Lender_PRODUCT_OPTIONS.filter((option) =>
          option.label.toLocaleLowerCase("en-AU").includes(term),
        )
      : Lender_PRODUCT_OPTIONS;
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpenState(false);
        document.getElementById(triggerId)?.focus();
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, triggerId]);

  function setOpenState(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <Field label="Existing Lender products" htmlFor={triggerId}>
      <div ref={rootRef} className="relative">
        {value.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {Lender_PRODUCT_OPTIONS.filter((option) =>
              value.includes(option.value),
            ).map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-2.5 py-1 text-xs font-medium text-ink"
              >
                {option.label}
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
                  onClick={() =>
                    onChange(toggleLenderProduct(value, option.value))
                  }
                >
                  <X aria-hidden size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          id={triggerId}
          type="button"
          aria-expanded={open}
          aria-controls={optionsId}
          className={`${inputClass} flex items-center justify-between text-left`}
          onClick={() => setOpenState(!open)}
        >
          <span className={value.length ? "text-ink" : "text-muted"}>
            {value.length
              ? `${value.length} product${value.length === 1 ? "" : "s"} selected`
              : "Select products"}
          </span>
          <ChevronDown
            aria-hidden
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full rounded-xl border border-border-strong bg-surface p-2 shadow-xl">
            <input
              autoFocus
              type="search"
              aria-label="Search Lender products"
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
            />
            <div
              id={optionsId}
              role="group"
              aria-label="Lender products"
              className="mt-2 max-h-60 space-y-1 overflow-y-auto"
            >
              {filteredOptions.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-panel"
                  >
                    <span>{option.label}</span>
                    <span className="relative grid h-5 w-5 place-items-center">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 appearance-none rounded border border-border-strong checked:border-brand checked:bg-brand"
                        checked={selected}
                        onChange={() =>
                          onChange(toggleLenderProduct(value, option.value))
                        }
                      />
                      <Check
                        aria-hidden
                        size={13}
                        className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
                      />
                    </span>
                  </label>
                );
              })}
              {filteredOptions.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted">
                  No products found.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
