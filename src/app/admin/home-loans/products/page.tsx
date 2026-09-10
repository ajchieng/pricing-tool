"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import type React from "react";
import { ChevronDown } from "lucide-react";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
  btn,
  btnRowSave,
  inp,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { StatusText } from "@/components/ui/StatusText";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";

// Structured fee fields (AUD). Display-only on quotes; not used in pricing.
const FEE_FIELDS = [
  { name: "establishmentFee", label: "Establishment" },
  { name: "monthlyServiceFee", label: "Monthly service" },
  { name: "loanContractVariationFee", label: "Variation" },
  { name: "defaultFee", label: "Default" },
  { name: "titleSearchFee", label: "Title search" },
  { name: "dischargeFee", label: "Discharge" },
  { name: "progressPaymentFee", label: "Progress pmt" },
] as const;

function MiniField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-baseline gap-1.5 text-xs font-medium text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ProductsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { applyDemoHomeProductsAction, createProduct, updateProduct } =
    createConfigurationActions(configuration.version);
  const products = tables.product;

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Products</h2>
            <p className={adminTableDescription}>
              The fictional home-loan catalogue and rate bands are editable in
              this browser. Apply demo products to restore the original
              demonstration catalogue and rates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted" size="sm">
              {products.length} rows
            </Badge>
            <ConfigurationForm action={applyDemoHomeProductsAction}>
              <button type="submit" className={btn}>
                Apply demo products
              </button>
            </ConfigurationForm>
          </div>
        </div>

        <div className="divide-y divide-border">
          {products.map((p) => {
            const feeCount = FEE_FIELDS.filter((f) => p[f.name] != null).length;
            return (
              <div
                key={p.id}
                id={adminConfigTargetId("home-product", p.id)}
                data-admin-search-target
                tabIndex={-1}
                className="px-4 py-4 sm:px-5"
              >
                <ConfigurationForm
                  id={`prod-${p.id}`}
                  action={updateProduct}
                  className="contents"
                >
                  <input type="hidden" name="id" value={p.id} />
                </ConfigurationForm>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-0 grow basis-72">
                    <MiniField
                      label={
                        <>
                          Product name
                          <span className="font-normal text-faint">
                            #{p.id}
                          </span>
                        </>
                      }
                    >
                      <input
                        name="name"
                        form={`prod-${p.id}`}
                        defaultValue={p.name}
                        className={inp}
                        aria-label="Product name"
                      />
                    </MiniField>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        name="active"
                        form={`prod-${p.id}`}
                        defaultChecked={p.active}
                        className="h-4 w-4"
                        aria-label="Active"
                      />
                      Active
                    </label>
                    <button
                      type="submit"
                      form={`prod-${p.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <MiniField label="Purpose">
                    <select
                      name="loanPurpose"
                      form={`prod-${p.id}`}
                      defaultValue={p.loanPurpose}
                      className={inp}
                      aria-label="Loan purpose"
                    >
                      <option value="owner_occupied">Owner Occupied</option>
                      <option value="investment">Investment</option>
                    </select>
                  </MiniField>
                  <MiniField label="Rate type">
                    <select
                      name="rateType"
                      form={`prod-${p.id}`}
                      defaultValue={p.rateType}
                      className={inp}
                      aria-label="Rate type"
                    >
                      <option value="variable">Variable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </MiniField>
                  <MiniField label="Fixed (months)">
                    <input
                      name="fixedPeriodMonths"
                      form={`prod-${p.id}`}
                      defaultValue={p.fixedPeriodMonths ?? ""}
                      className={inp}
                      aria-label="Fixed period months"
                    />
                  </MiniField>
                  <MiniField label="Min loan ($)">
                    <input
                      name="minLoanAmount"
                      form={`prod-${p.id}`}
                      defaultValue={p.minLoanAmount ?? ""}
                      className={inp}
                      aria-label="Min loan"
                    />
                  </MiniField>
                  <MiniField label="Max loan ($)">
                    <input
                      name="maxLoanAmount"
                      form={`prod-${p.id}`}
                      defaultValue={p.maxLoanAmount ?? ""}
                      className={inp}
                      aria-label="Max loan"
                    />
                  </MiniField>
                  <MiniField label="Max LVR (%)">
                    <input
                      name="maxLvr"
                      form={`prod-${p.id}`}
                      defaultValue={p.maxLvr ?? ""}
                      className={inp}
                      aria-label="Max LVR"
                    />
                  </MiniField>
                </div>

                <details className="group mt-3 border-t border-border">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                    <span>
                      Structured fees
                      <span className="ml-1.5 font-normal text-faint">
                        {feeCount > 0 ? `${feeCount} of 7 set` : "none set"} ·
                        context only, not used in pricing
                      </span>
                    </span>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.75}
                      aria-hidden
                      className="shrink-0 transition-transform duration-150 group-open:rotate-180"
                    />
                  </summary>
                  <div className="grid gap-3 border-t border-border py-3 sm:grid-cols-4 xl:grid-cols-7">
                    {FEE_FIELDS.map((f) => (
                      <MiniField key={f.name} label={`${f.label} ($)`}>
                        <input
                          name={f.name}
                          form={`prod-${p.id}`}
                          defaultValue={p[f.name] ?? ""}
                          className={inp}
                          aria-label={f.label}
                        />
                      </MiniField>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <CollapsibleSection
        title="Add product"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={products.length === 0}
      >
        <ConfigurationForm
          action={createProduct}
          className="grid gap-3 text-sm sm:grid-cols-3"
        >
          <Field label="Product name">
            <input
              name="name"
              placeholder="Name"
              required
              aria-label="Product name"
              className={inp}
            />
          </Field>
          <Field label="Category">
            <input
              name="productCategory"
              placeholder="Category"
              required
              aria-label="Product category"
              className={inp}
            />
          </Field>
          <Field label="Loan purpose">
            <select
              name="loanPurpose"
              className={inp}
              aria-label="Loan purpose"
            >
              <option value="owner_occupied">Owner Occupied</option>
              <option value="investment">Investment</option>
            </select>
          </Field>
          <Field label="Rate type">
            <select name="rateType" className={inp} aria-label="Rate type">
              <option value="variable">Variable</option>
              <option value="fixed">Fixed</option>
            </select>
          </Field>
          <Field
            label="Fixed period months"
            helper="Leave blank for variable rates."
          >
            <input
              name="fixedPeriodMonths"
              placeholder="Fixed months"
              aria-label="Fixed period months"
              className={inp}
            />
          </Field>
          <Field label="Maximum LVR">
            <input
              name="maxLvr"
              placeholder="Max LVR"
              aria-label="Maximum LVR"
              className={inp}
            />
          </Field>
          <Field label="Minimum loan">
            <input
              name="minLoanAmount"
              placeholder="Min loan"
              aria-label="Minimum loan amount"
              className={inp}
            />
          </Field>
          <Field label="Maximum loan">
            <input
              name="maxLoanAmount"
              placeholder="Max loan"
              aria-label="Maximum loan amount"
              className={inp}
            />
          </Field>
          {FEE_FIELDS.map((f) => (
            <Field key={f.name} label={`${f.label} fee`}>
              <input
                name={f.name}
                placeholder={`${f.label} fee ($)`}
                aria-label={`${f.label} fee`}
                className={inp}
              />
            </Field>
          ))}
          <Field label="Notes">
            <input
              name="notes"
              placeholder="Notes"
              aria-label="Product notes"
              className={inp}
            />
          </Field>
          <div>
            <button type="submit" className={btn}>
              Add product
            </button>
          </div>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
