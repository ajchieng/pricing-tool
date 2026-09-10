"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import {
  PUBLISHED_RATE_ROLES,
  PUBLISHED_RATE_ROLE_LABELS,
  publishedRateRole,
} from "@/lib/pricing/rate-role";

import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
  btn,
  btnRowSave,
  inp,
  rowActions,
  responsiveAdminMobileLabel,
  responsiveAdminTable,
  responsiveAdminTableBody,
  responsiveAdminTableCell,
  responsiveAdminTableHead,
  responsiveAdminTableRow,
  responsiveAdminTableScroll,
  th,
} from "@/components/adminUi";
import { ConfirmedDeleteSubmit } from "@/components/admin/ConfirmedDeleteSubmit";
import { Badge } from "@/components/ui/Badge";
import { StatusText } from "@/components/ui/StatusText";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";

export default function RatesAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { createRate, deleteRate, updateRate } = createConfigurationActions(
    configuration.version,
  );
  const products = tables.product;
  const rates = tables.product_rate.flatMap((row) => {
    const product = products.find((p) => p.id === row.productId);
    return product ? [{ ...row, product }] : [];
  });

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Rate bands</h2>
            <p className={adminTableDescription}>
              Carded rates by product and LVR band. Quote pricing starts from
              the active matching band.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rates.length} rows
          </Badge>
        </div>
        <div
          className={responsiveAdminTableScroll}
          role="region"
          aria-label="Home rate bands table"
          tabIndex={0}
        >
          <table className={responsiveAdminTable}>
            <thead className={responsiveAdminTableHead}>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>LVR min</th>
                <th className={th}>LVR max</th>
                <th className={th}>Pricing role</th>
                <th className={th}>Carded rate %</th>
                <th className={th}>Active</th>
                <th className={`${th} lg:w-36`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className={responsiveAdminTableBody}>
              {rates.map((r) => (
                <tr
                  key={r.id}
                  id={adminConfigTargetId("home-rate", r.id)}
                  data-admin-search-target
                  tabIndex={-1}
                  className={responsiveAdminTableRow}
                >
                  <td
                    className={`${responsiveAdminTableCell} sm:col-span-2 lg:table-cell`}
                  >
                    <span className={responsiveAdminMobileLabel}>Product</span>
                    <span className="font-semibold text-ink lg:font-normal lg:text-muted">
                      {r.product.name}
                    </span>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>LVR min</span>
                    <ConfigurationForm
                      id={`rate-${r.id}`}
                      action={updateRate}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="lvrMin"
                        defaultValue={r.lvrMin}
                        className={inp}
                        aria-label="LVR min"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>LVR max</span>
                    <input
                      name="lvrMax"
                      form={`rate-${r.id}`}
                      defaultValue={r.lvrMax}
                      className={inp}
                      aria-label="LVR max"
                    />
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Pricing role
                    </span>
                    <select
                      name="pricingRole"
                      form={`rate-${r.id}`}
                      defaultValue={publishedRateRole(r.pricingRole)}
                      className={inp}
                      aria-label="Pricing role"
                    >
                      {PUBLISHED_RATE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {PUBLISHED_RATE_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Carded rate %
                    </span>
                    <input
                      name="cardedRate"
                      form={`rate-${r.id}`}
                      defaultValue={r.cardedRate}
                      className={inp}
                      aria-label="Carded rate"
                    />
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>Active</span>
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        name="active"
                        form={`rate-${r.id}`}
                        defaultChecked={r.active}
                        aria-label="Active"
                      />
                      <span className="text-sm text-muted lg:sr-only">
                        Active
                      </span>
                    </label>
                  </td>
                  <td
                    className={`${responsiveAdminTableCell} sm:col-span-2 lg:table-cell lg:w-36`}
                  >
                    <div className={`${rowActions} lg:flex-nowrap`}>
                      <button
                        type="submit"
                        form={`rate-${r.id}`}
                        className={btnRowSave}
                      >
                        Save
                      </button>
                      <ConfigurationForm action={deleteRate}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmedDeleteSubmit itemLabel="home rate band" />
                      </ConfigurationForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add rate band"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rates.length === 0}
      >
        <ConfigurationForm
          action={createRate}
          className="grid gap-3 text-sm sm:grid-cols-4"
        >
          <Field label="Product" className="sm:col-span-2">
            <select name="productId" className={inp} aria-label="Product">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minimum LVR">
            <input
              name="lvrMin"
              placeholder="LVR min"
              required
              aria-label="Minimum LVR"
              className={inp}
            />
          </Field>
          <Field label="Maximum LVR">
            <input
              name="lvrMax"
              placeholder="LVR max"
              required
              aria-label="Maximum LVR"
              className={inp}
            />
          </Field>
          <Field label="Carded rate">
            <input
              name="cardedRate"
              placeholder="Carded %"
              required
              aria-label="Carded rate percentage"
              className={inp}
            />
          </Field>
          <Field label="Pricing role" className="sm:col-span-2">
            <select
              name="pricingRole"
              defaultValue="carded_pricing_anchor"
              className={inp}
              aria-label="Pricing role"
            >
              {PUBLISHED_RATE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PUBLISHED_RATE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className={btn}>
            Add band
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
