"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

import {
  adminTableDescription,
  adminTableHeader,
  adminTableScroll,
  adminTableShell,
  adminTableTitle,
  btn,
  btnRowSave,
  inp,
  rowActions,
  td,
  th,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { StatusText } from "@/components/ui/StatusText";
import { FACILITY_TYPE_LABELS } from "@/lib/pricing/commercial/config";

const FACILITY_TYPES = Object.entries(FACILITY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export default function CommercialProductsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    applyDemoCommercialProductsAction,
    createCommercialLoanProduct,
    updateCommercialLoanProduct,
  } = createConfigurationActions(configuration.version);
  const products = tables.commercial_loan_product;

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Commercial loan products</h2>
            <p className={adminTableDescription}>
              One product per facility type. Fees are display and pricing
              context for the facility; the customer-score discount is
              subtracted from the selected base rate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted" size="sm">
              {products.length} rows
            </Badge>
            <ConfigurationForm action={applyDemoCommercialProductsAction}>
              <button type="submit" className={btn}>
                Apply demo commercial products
              </button>
            </ConfigurationForm>
          </div>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Commercial products table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Facility</th>
                <th className={th}>Base rate name</th>
                <th className={th}>Min amt</th>
                <th className={th}>Max amt</th>
                <th className={th}>Estab %</th>
                <th className={th}>Estab min</th>
                <th className={th}>Line fee %</th>
                <th className={th}>Doc fee</th>
                <th className={th}>Active</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr
                  key={p.id}
                  id={adminConfigTargetId("commercial-product", p.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={td}>
                    <ConfigurationForm
                      id={`cprd-${p.id}`}
                      action={updateCommercialLoanProduct}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="name"
                        defaultValue={p.name}
                        className={`${inp} w-44`}
                        aria-label="Name"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={td}>
                    <select
                      name="facilityType"
                      form={`cprd-${p.id}`}
                      defaultValue={p.facilityType}
                      className={inp}
                      aria-label="Facility type"
                    >
                      {FACILITY_TYPES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <input
                      name="baseRateName"
                      form={`cprd-${p.id}`}
                      defaultValue={p.baseRateName}
                      className={`${inp} w-48`}
                      aria-label="Base rate name"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="minLoanAmount"
                      form={`cprd-${p.id}`}
                      defaultValue={p.minLoanAmount ?? ""}
                      className={`${inp} w-24`}
                      aria-label="Min loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="maxLoanAmount"
                      form={`cprd-${p.id}`}
                      defaultValue={p.maxLoanAmount ?? ""}
                      className={`${inp} w-24`}
                      aria-label="Max loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="establishmentFeePct"
                      form={`cprd-${p.id}`}
                      defaultValue={p.establishmentFeePct ?? ""}
                      className={`${inp} w-16`}
                      aria-label="Establishment fee percent"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="establishmentFeeMin"
                      form={`cprd-${p.id}`}
                      defaultValue={p.establishmentFeeMin ?? ""}
                      className={`${inp} w-20`}
                      aria-label="Establishment fee minimum"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="annualLineFeePct"
                      form={`cprd-${p.id}`}
                      defaultValue={p.annualLineFeePct ?? ""}
                      className={`${inp} w-16`}
                      aria-label="Annual line fee percent"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="documentationFee"
                      form={`cprd-${p.id}`}
                      defaultValue={p.documentationFee ?? ""}
                      className={`${inp} w-20`}
                      aria-label="Documentation fee"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`cprd-${p.id}`}
                      defaultChecked={p.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`cprd-${p.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add commercial product"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={products.length === 0}
      >
        <ConfigurationForm
          action={createCommercialLoanProduct}
          className="grid gap-3 text-sm sm:grid-cols-3"
        >
          <Field label="Name">
            <input name="name" required aria-label="Name" className={inp} />
          </Field>
          <Field label="Facility type">
            <select
              name="facilityType"
              className={inp}
              aria-label="Facility type"
            >
              {FACILITY_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Base rate name">
            <input
              name="baseRateName"
              required
              aria-label="Base rate name"
              className={inp}
            />
          </Field>
          <Field label="Min loan amount">
            <input
              name="minLoanAmount"
              aria-label="Min loan amount"
              className={inp}
            />
          </Field>
          <Field label="Max loan amount">
            <input
              name="maxLoanAmount"
              aria-label="Max loan amount"
              className={inp}
            />
          </Field>
          <Field label="Establishment fee %">
            <input
              name="establishmentFeePct"
              aria-label="Establishment fee percent"
              className={inp}
            />
          </Field>
          <Field label="Establishment fee min">
            <input
              name="establishmentFeeMin"
              aria-label="Establishment fee minimum"
              className={inp}
            />
          </Field>
          <Field label="Annual line fee % (overdraft)">
            <input
              name="annualLineFeePct"
              aria-label="Annual line fee percent"
              className={inp}
            />
          </Field>
          <Field label="Documentation fee (equipment)">
            <input
              name="documentationFee"
              aria-label="Documentation fee"
              className={inp}
            />
          </Field>
          <Field label="Source URL">
            <input name="sourceUrl" aria-label="Source URL" className={inp} />
          </Field>
          <Field label="Notes">
            <input name="notes" aria-label="Notes" className={inp} />
          </Field>
          <button type="submit" className={btn}>
            Add product
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
