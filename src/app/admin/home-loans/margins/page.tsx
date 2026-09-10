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
import { StatusText } from "@/components/ui/StatusText";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";

export default function MarginsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { createMarginSetting, deleteMarginSetting, updateMarginSetting } =
    createConfigurationActions(configuration.version);
  const products = tables.product;
  const margins = tables.margin_setting.map((row) => ({
    ...row,
    product: products.find((p) => p.id === row.productId) ?? null,
  }));

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Margin settings</h2>
            <p className={adminTableDescription}>
              Estimated Margin = Customer Rate minus Estimated Cost of Funds.
              The most specific applicable setting wins.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {margins.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Home margin settings table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Scope (product)</th>
                <th className={th}>Loan purpose</th>
                <th className={th}>Rate type</th>
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
                  id={adminConfigTargetId("home-margin", m.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    {m.product?.name ?? "— (any)"}
                  </td>
                  <td className={td}>
                    <ConfigurationForm
                      id={`mgn-${m.id}`}
                      action={updateMarginSetting}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="loanPurpose"
                        defaultValue={m.loanPurpose ?? ""}
                        className={inp}
                        aria-label="Loan purpose"
                      >
                        <option value="">Any</option>
                        <option value="owner_occupied">Owner Occupied</option>
                        <option value="investment">Investment</option>
                      </select>
                    </ConfigurationForm>
                  </td>
                  <td className={td}>
                    <select
                      name="rateType"
                      form={`mgn-${m.id}`}
                      defaultValue={m.rateType ?? ""}
                      className={inp}
                      aria-label="Rate type"
                    >
                      <option value="">Any</option>
                      <option value="variable">Variable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </td>
                  <td className={td}>
                    <input
                      name="estimatedCostOfFunds"
                      form={`mgn-${m.id}`}
                      defaultValue={m.estimatedCostOfFunds}
                      className={`${inp} w-24`}
                      aria-label="Cost of funds"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="targetMargin"
                      form={`mgn-${m.id}`}
                      defaultValue={m.targetMargin}
                      className={`${inp} w-20`}
                      aria-label="Target margin"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="hardMinimumMargin"
                      form={`mgn-${m.id}`}
                      defaultValue={m.hardMinimumMargin}
                      className={`${inp} w-20`}
                      aria-label="Hard minimum margin"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`mgn-${m.id}`}
                      defaultChecked={m.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`mgn-${m.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deleteMarginSetting}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmedDeleteSubmit itemLabel="home margin setting" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add margin setting"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={margins.length === 0}
      >
        <ConfigurationForm
          action={createMarginSetting}
          className="grid gap-3 text-sm sm:grid-cols-3"
        >
          <Field label="Product scope">
            <select name="productId" className={inp} aria-label="Product scope">
              <option value="">Any product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loan purpose">
            <select
              name="loanPurpose"
              className={inp}
              aria-label="Loan purpose"
            >
              <option value="">Any purpose</option>
              <option value="owner_occupied">Owner Occupied</option>
              <option value="investment">Investment</option>
            </select>
          </Field>
          <Field label="Rate type">
            <select name="rateType" className={inp} aria-label="Rate type">
              <option value="">Any rate type</option>
              <option value="variable">Variable</option>
              <option value="fixed">Fixed</option>
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
