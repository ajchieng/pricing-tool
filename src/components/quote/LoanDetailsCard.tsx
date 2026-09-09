import type React from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, NumberInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Info } from "@/components/quote-form-ui";
import { fmtPct } from "@/lib/format";
import type { ProductOption } from "@/lib/products/types";

// Section body: loan scenario + product selection. LVR is a derived read-out,
// not an input; the product summary is context pulled from the selection.

export function LoanDetailsCard({
  loanPurpose,
  onLoanPurposeChange,
  rateType,
  onRateTypeChange,
  fixedPeriodMonths,
  onFixedPeriodChange,
  fixedPeriods,
  productId,
  onProductIdChange,
  filteredProducts,
  selectedProduct,
  loanAmount,
  onLoanAmountChange,
  loanAmountRef,
  propertyValue,
  onPropertyValueChange,
  loanTermYears,
  onLoanTermYearsChange,
  lvr,
  cardedRate,
}: {
  loanPurpose: "owner_occupied" | "investment";
  onLoanPurposeChange: (value: "owner_occupied" | "investment") => void;
  rateType: "variable" | "fixed";
  onRateTypeChange: (value: "variable" | "fixed") => void;
  fixedPeriodMonths: number | null;
  onFixedPeriodChange: (value: number | null) => void;
  fixedPeriods: Array<[number, string]>;
  productId: number | null;
  onProductIdChange: (value: number | null) => void;
  filteredProducts: ProductOption[];
  selectedProduct: ProductOption | null;
  loanAmount: string;
  onLoanAmountChange: (value: string) => void;
  loanAmountRef?: React.Ref<HTMLInputElement>;
  propertyValue: string;
  onPropertyValueChange: (value: string) => void;
  loanTermYears: string;
  onLoanTermYearsChange: (value: string) => void;
  lvr: number | null;
  cardedRate: number | null;
}) {
  const overMaxLvr =
    lvr != null &&
    selectedProduct?.maxLvr != null &&
    lvr > selectedProduct.maxLvr;

  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <div>
        <span className="mb-1 block text-sm font-medium text-ink">
          Loan purpose
        </span>
        <SegmentedControl
          ariaLabel="Loan purpose"
          size="md"
          fullWidth
          value={loanPurpose}
          onChange={onLoanPurposeChange}
          options={[
            { value: "owner_occupied", label: "Owner occupied" },
            { value: "investment", label: "Investment" },
          ]}
        />
      </div>
      <div>
        <span className="mb-1 block text-sm font-medium text-ink">
          Rate type
        </span>
        <SegmentedControl
          ariaLabel="Rate type"
          size="md"
          fullWidth
          value={rateType}
          onChange={onRateTypeChange}
          options={[
            { value: "variable", label: "Variable" },
            { value: "fixed", label: "Fixed" },
          ]}
        />
      </div>

      {rateType === "fixed" && (
        <Field label="Fixed period" htmlFor="fixed-period" required>
          <select
            id="fixed-period"
            aria-label="Fixed period"
            className={inputClass}
            value={fixedPeriodMonths ?? ""}
            onChange={(e) =>
              onFixedPeriodChange(
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="">Select…</option>
            {fixedPeriods.map(([months, lbl]) => (
              <option key={months} value={months}>
                {lbl}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field
        label="Product"
        htmlFor="product"
        required
        className="@md:col-span-2"
      >
        <select
          id="product"
          aria-label="Product"
          className={inputClass}
          value={productId ?? ""}
          onChange={(e) =>
            onProductIdChange(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Select a product…</option>
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {filteredProducts.length === 0 && (
          <p className="mt-1 text-xs font-medium text-warn">
            No active products match this scenario.
            {rateType === "fixed" && fixedPeriodMonths == null
              ? " Select a fixed period."
              : ""}
          </p>
        )}
      </Field>

      <Field label="Loan amount" htmlFor="loan-amount" required>
        <MoneyInput
          id="loan-amount"
          inputRef={loanAmountRef}
          value={loanAmount}
          onChange={onLoanAmountChange}
          placeholder="500,000"
        />
      </Field>
      <Field label="Property value" htmlFor="property-value" required>
        <MoneyInput
          id="property-value"
          value={propertyValue}
          onChange={onPropertyValueChange}
          placeholder="650,000"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-y border-border py-2.5 @md:col-span-2">
        <span className="text-sm text-muted">
          Loan-to-value ratio{" "}
          <span className="text-faint">— loan ÷ property value</span>
        </span>
        <span className="flex items-center gap-3">
          {overMaxLvr && selectedProduct?.maxLvr != null && (
            <span className="text-xs font-medium text-warn">
              Above product max ({selectedProduct.maxLvr}%)
            </span>
          )}
          <span
            className={`tnum text-sm font-semibold ${
              overMaxLvr ? "text-warn" : "text-ink"
            }`}
          >
            {lvr != null ? `${lvr.toFixed(2)}%` : "—"}
          </span>
        </span>
      </div>

      <Field label="Loan term" htmlFor="loan-term">
        <NumberInput
          id="loan-term"
          suffix="years"
          value={loanTermYears}
          onChange={onLoanTermYearsChange}
          placeholder="30"
        />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-medium text-ink">
          Repayment type
        </span>
        <div className="flex min-h-[44px] items-center text-sm text-muted">
          Principal &amp; Interest
        </div>
      </div>

      {selectedProduct && (
        <div className="grid gap-x-6 gap-y-1 border-t border-border pt-3 text-sm @md:col-span-2 @md:grid-cols-2">
          <Info
            label="Carded rate"
            value={cardedRate != null ? fmtPct(cardedRate) : "—"}
          />
          <Info
            label="Max LVR"
            value={
              selectedProduct.maxLvr != null
                ? `${selectedProduct.maxLvr}%`
                : "—"
            }
          />
          <Info
            label="Min loan"
            value={
              selectedProduct.minLoanAmount != null
                ? `$${selectedProduct.minLoanAmount.toLocaleString()}`
                : "—"
            }
          />
          <Info
            label="Max loan"
            value={
              selectedProduct.maxLoanAmount != null
                ? `$${selectedProduct.maxLoanAmount.toLocaleString()}`
                : "—"
            }
          />
          {selectedProduct.notes && (
            <div className="text-muted @md:col-span-2">
              {selectedProduct.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
