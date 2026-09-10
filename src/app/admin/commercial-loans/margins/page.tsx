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
import { FACILITY_TYPE_LABELS } from "@/lib/pricing/commercial/config";

const FACILITY_SCOPES = [
  { value: "", label: "Any facility" },
  ...Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function CommercialMarginsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createCommercialMarginSetting,
    deleteCommercialMarginSetting,
    updateCommercialMarginSetting,
  } = createConfigurationActions(configuration.version);
  const products = tables.commercial_loan_product;
  const margins = tables.commercial_margin_setting.map((row) => ({
    ...row,
    commercialProduct:
      products.find((p) => p.id === row.commercialProductId) ?? null,
  }));

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Commercial loan margin settings</h2>
            <p className={adminTableDescription}>
              Cost of funds and hard minimum NIM govern profitability review.
              Customer-score pricing starts at the selected base rate and does
              not use a score-margin floor. Product scope wins over facility
              type, then any-facility defaults.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {margins.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Commercial margin settings table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Product scope</th>
                <th className={th}>Facility</th>
                <th className={th}>Cost of funds %</th>
                <th className={th}>Target %</th>
                <th className={th}>Hard min NIM %</th>
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
                  id={adminConfigTargetId("commercial-margin", m.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    {m.commercialProduct?.name ?? "Any product"}
                  </td>
                  <td className={td}>
                    <ConfigurationForm
                      id={`cmgn-${m.id}`}
                      action={updateCommercialMarginSetting}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="facilityType"
                        defaultValue={m.facilityType ?? ""}
                        className={inp}
                        aria-label="Facility type"
                      >
                        {FACILITY_SCOPES.map((scope) => (
                          <option key={scope.value} value={scope.value}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                    </ConfigurationForm>
                  </td>
                  <td className={td}>
                    <input
                      name="estimatedCostOfFunds"
                      form={`cmgn-${m.id}`}
                      defaultValue={m.estimatedCostOfFunds}
                      className={`${inp} w-24`}
                      aria-label="Cost of funds"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="targetMargin"
                      form={`cmgn-${m.id}`}
                      defaultValue={m.targetMargin}
                      className={`${inp} w-20`}
                      aria-label="Target margin"
                    />
                  </td>
                  <input
                    type="hidden"
                    name="scoreMarginFloorPct"
                    form={`cmgn-${m.id}`}
                    value={m.scoreMarginFloorPct ?? m.hardMinimumMargin}
                  />
                  <td className={td}>
                    <input
                      name="hardMinimumNetInterestMarginPct"
                      form={`cmgn-${m.id}`}
                      defaultValue={
                        m.hardMinimumNetInterestMarginPct ?? m.hardMinimumMargin
                      }
                      className={`${inp} w-20`}
                      aria-label="Hard minimum net interest margin"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`cmgn-${m.id}`}
                      defaultChecked={m.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`cmgn-${m.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deleteCommercialMarginSetting}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmedDeleteSubmit itemLabel="commercial margin setting" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add commercial margin setting"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={margins.length === 0}
      >
        <ConfigurationForm
          action={createCommercialMarginSetting}
          className="grid gap-3 text-sm sm:grid-cols-3"
        >
          <Field label="Product scope">
            <select
              name="commercialProductId"
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
          <Field label="Facility">
            <select name="facilityType" className={inp} aria-label="Facility">
              {FACILITY_SCOPES.map((scope) => (
                <option key={scope.value} value={scope.value}>
                  {scope.label}
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
          <input type="hidden" name="scoreMarginFloorPct" value="0" />
          <Field label="Hard minimum NIM">
            <input
              name="hardMinimumNetInterestMarginPct"
              placeholder="Hard min NIM %"
              required
              aria-label="Hard minimum net interest margin"
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
