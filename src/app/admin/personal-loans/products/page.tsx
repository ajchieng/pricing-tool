"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";

import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
  btn,
  btnRowSave,
  inp,
} from "@/components/adminUi";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { StatusText } from "@/components/ui/StatusText";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

function ProductFields({
  form,
  product,
}: {
  form: string;
  product: {
    name?: string;
    productCategory?: string;
    securityType?: string;
    minLoanAmount?: number | null;
    maxLoanAmount?: number | null;
    minTermMonths?: number | null;
    maxTermMonths?: number | null;
    establishmentFee?: number | null;
    monthlyServiceFee?: number | null;
    onlineRedrawFee?: number | null;
    branchRedrawFee?: number | null;
    defaultFee?: number | null;
    redrawAvailable?: boolean;
    sourceUrl?: string | null;
    notes?: string | null;
  };
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Name" htmlFor={`${form}-name`}>
          <input
            id={`${form}-name`}
            name="name"
            form={form}
            defaultValue={product.name ?? ""}
            required
            className={inp}
          />
        </Field>
        <Field label="Category" htmlFor={`${form}-productCategory`}>
          <input
            id={`${form}-productCategory`}
            name="productCategory"
            form={form}
            defaultValue={product.productCategory ?? ""}
            required
            className={inp}
          />
        </Field>
        <Field label="Security" htmlFor={`${form}-securityType`}>
          <select
            id={`${form}-securityType`}
            name="securityType"
            form={form}
            defaultValue={product.securityType ?? "secured"}
            className={inp}
          >
            <option value="secured">Secured</option>
            <option value="unsecured">Unsecured</option>
          </select>
        </Field>
        <Field label="Source URL" htmlFor={`${form}-sourceUrl`}>
          <input
            id={`${form}-sourceUrl`}
            name="sourceUrl"
            form={form}
            defaultValue={product.sourceUrl ?? ""}
            className={inp}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {[
          ["minLoanAmount", "Min loan"],
          ["maxLoanAmount", "Max loan"],
          ["minTermMonths", "Min term"],
          ["maxTermMonths", "Max term"],
          ["establishmentFee", "Establishment"],
          ["monthlyServiceFee", "Monthly"],
          ["onlineRedrawFee", "Online redraw"],
          ["branchRedrawFee", "Branch redraw"],
          ["defaultFee", "Default fee"],
        ].map(([name, label]) => (
          <Field key={name} label={label} htmlFor={`${form}-${name}`}>
            <input
              id={`${form}-${name}`}
              name={name}
              form={form}
              defaultValue={String(product[name as keyof typeof product] ?? "")}
              className={inp}
            />
          </Field>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <Field label="Redraw" htmlFor={`${form}-redrawAvailable`}>
          <label className="flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm">
            <input
              id={`${form}-redrawAvailable`}
              type="checkbox"
              name="redrawAvailable"
              form={form}
              defaultChecked={product.redrawAvailable ?? true}
            />
            Redraw available
          </label>
        </Field>
        <Field label="Notes" htmlFor={`${form}-notes`}>
          <textarea
            id={`${form}-notes`}
            name="notes"
            form={form}
            defaultValue={product.notes ?? ""}
            rows={2}
            className={inp}
          />
        </Field>
      </div>
    </>
  );
}

export default function PersonalLoanProductsAdminPage() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    applyDemoPersonalProductsAction,
    createPersonalLoanProduct,
    updatePersonalLoanProduct,
  } = createConfigurationActions(configuration.version);
  const products = tables.personal_loan_product;

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Personal loan products</h2>
            <p className={adminTableDescription}>
              Fictional secured and unsecured personal-loan products, fees and
              feature notes. Fees and comparison rates are display-only context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted" size="sm">
              {products.length} rows
            </Badge>
            <ConfigurationForm action={applyDemoPersonalProductsAction}>
              <button type="submit" className={btn}>
                Apply demo personal products
              </button>
            </ConfigurationForm>
          </div>
        </div>

        <div className="divide-y divide-border">
          {products.map((product) => {
            const form = `personal-product-${product.id}`;
            return (
              <div
                key={product.id}
                id={adminConfigTargetId("personal-product", product.id)}
                data-admin-search-target
                tabIndex={-1}
                className="px-4 py-4 sm:px-5"
              >
                <ConfigurationForm id={form} action={updatePersonalLoanProduct}>
                  <input type="hidden" name="id" value={product.id} />
                </ConfigurationForm>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-ink">
                    #{product.id} {product.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm">
                      <input
                        type="checkbox"
                        name="active"
                        form={form}
                        defaultChecked={product.active}
                      />
                      Active
                    </label>
                    <button type="submit" form={form} className={btnRowSave}>
                      Save
                    </button>
                  </div>
                </div>
                <ProductFields form={form} product={product} />
              </div>
            );
          })}
        </div>
      </section>

      <CollapsibleSection
        title="Add personal loan product"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={products.length === 0}
      >
        <ConfigurationForm
          id="personal-product-new"
          action={createPersonalLoanProduct}
        >
          <ProductFields form="personal-product-new" product={{}} />
          <button type="submit" className={`${btn} mt-3`}>
            Add product
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
