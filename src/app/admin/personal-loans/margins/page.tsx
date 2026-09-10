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
import { ConfirmedDeleteSubmit } from "@/components/admin/ConfirmedDeleteSubmit";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { StatusText } from "@/components/ui/StatusText";

const SECURITY_TYPES = [
  { value: "", label: "Any security" },
  { value: "secured", label: "Secured" },
  { value: "unsecured", label: "Unsecured" },
];

export default function PersonalMarginsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createPersonalMarginSetting,
    deletePersonalMarginSetting,
    updatePersonalMarginSetting,
  } = createConfigurationActions(configuration.version);
  const products = tables.personal_loan_product;
  const margins = tables.personal_margin_setting.map((row) => ({
    ...row,
    personalProduct:
      products.find((p) => p.id === row.personalProductId) ?? null,
  }));

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Personal loan margin settings</h2>
            <p className={adminTableDescription}>
              Estimated margin = customer rate minus cost of funds. Product
              scope wins over security type, then any-security defaults.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {margins.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Personal margin settings table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Product scope</th>
                <th className={th}>Security</th>
                <th className={th}>Cost of funds %</th>
                <th className={th}>Target %</th>
                <th className={th}>Hard min %</th>
                <th className={th}>Active</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {margins.map((m) => (
                <tr
                  key={m.id}
                  id={adminConfigTargetId("personal-margin", m.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    {m.personalProduct?.name ?? "Any product"}
                  </td>
                  <td className={td}>
                    <ConfigurationForm
                      id={`pmgn-${m.id}`}
                      action={updatePersonalMarginSetting}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="securityType"
                        defaultValue={m.securityType ?? ""}
                        className={inp}
                        aria-label="Security type"
                      >
                        {SECURITY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </ConfigurationForm>
                  </td>
                  <td className={td}>
                    <input
                      name="estimatedCostOfFunds"
                      form={`pmgn-${m.id}`}
                      defaultValue={m.estimatedCostOfFunds}
                      className={`${inp} w-24`}
                      aria-label="Cost of funds"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="targetMargin"
                      form={`pmgn-${m.id}`}
                      defaultValue={m.targetMargin}
                      className={`${inp} w-20`}
                      aria-label="Target margin"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="hardMinimumMargin"
                      form={`pmgn-${m.id}`}
                      defaultValue={m.hardMinimumMargin}
                      className={`${inp} w-20`}
                      aria-label="Hard minimum margin"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`pmgn-${m.id}`}
                      defaultChecked={m.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`pmgn-${m.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deletePersonalMarginSetting}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmedDeleteSubmit itemLabel="personal margin setting" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add personal margin setting"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={margins.length === 0}
      >
        <ConfigurationForm
          action={createPersonalMarginSetting}
          className="grid gap-3 text-sm sm:grid-cols-3"
        >
          <Field label="Product scope">
            <select
              name="personalProductId"
              className={inp}
              aria-label="Product scope"
            >
              <option value="">Any product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Security">
            <select name="securityType" className={inp} aria-label="Security">
              {SECURITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cost of funds">
            <input
              name="estimatedCostOfFunds"
              placeholder="Cost of funds %"
              required
              aria-label="Cost of funds"
              className={inp}
            />
          </Field>
          <Field label="Target margin">
            <input
              name="targetMargin"
              placeholder="Target margin %"
              required
              aria-label="Target margin"
              className={inp}
            />
          </Field>
          <Field label="Hard minimum margin">
            <input
              name="hardMinimumMargin"
              placeholder="Hard min margin %"
              required
              aria-label="Hard minimum margin"
              className={inp}
            />
          </Field>
          <button type="submit" className={btn}>
            Add setting
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
