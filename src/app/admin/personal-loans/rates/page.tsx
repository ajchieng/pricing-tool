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
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { StatusText } from "@/components/ui/StatusText";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import {
  PUBLISHED_RATE_ROLES,
  PUBLISHED_RATE_ROLE_LABELS,
  publishedRateRole,
} from "@/lib/pricing/rate-role";

export default function PersonalLoanRatesAdminPage() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createPersonalLoanRate,
    deletePersonalLoanRate,
    updatePersonalLoanRate,
  } = createConfigurationActions(configuration.version);
  const products = tables.personal_loan_product;
  const rates = tables.personal_loan_product_rate.flatMap((row) => {
    const product = products.find((p) => p.id === row.productId);
    return product ? [{ ...row, product }] : [];
  });

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Personal loan carded rates</h2>
            <p className={adminTableDescription}>
              Active rate rows set the carded product rate used before the
              customer score adjustment. Comparison rates are display-only.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rates.length} rows
          </Badge>
        </div>

        <div
          className={responsiveAdminTableScroll}
          role="region"
          aria-label="Personal rates table"
          tabIndex={0}
        >
          <table className={responsiveAdminTable}>
            <thead className={responsiveAdminTableHead}>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Carded rate %</th>
                <th className={th}>Comparison %</th>
                <th className={th}>Pricing role</th>
                <th className={th}>Active</th>
                <th className={`${th} lg:w-36`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className={responsiveAdminTableBody}>
              {rates.map((rate) => (
                <tr
                  key={rate.id}
                  id={adminConfigTargetId("personal-rate", rate.id)}
                  data-admin-search-target
                  tabIndex={-1}
                  className={responsiveAdminTableRow}
                >
                  <td
                    className={`${responsiveAdminTableCell} sm:col-span-2 lg:table-cell`}
                  >
                    <span className={responsiveAdminMobileLabel}>Product</span>
                    <span className="font-semibold text-ink lg:font-normal lg:text-muted">
                      {rate.product.name}
                    </span>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Carded rate %
                    </span>
                    <ConfigurationForm
                      id={`personal-rate-${rate.id}`}
                      action={updatePersonalLoanRate}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={rate.id} />
                      <input
                        name="cardedRate"
                        defaultValue={rate.cardedRate}
                        className={inp}
                        aria-label="Carded rate"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Comparison %
                    </span>
                    <input
                      name="comparisonRate"
                      form={`personal-rate-${rate.id}`}
                      defaultValue={rate.comparisonRate ?? ""}
                      className={inp}
                      aria-label="Comparison rate"
                    />
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Pricing role
                    </span>
                    <select
                      name="pricingRole"
                      form={`personal-rate-${rate.id}`}
                      defaultValue={publishedRateRole(rate.pricingRole)}
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
                    <span className={responsiveAdminMobileLabel}>Active</span>
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        name="active"
                        form={`personal-rate-${rate.id}`}
                        defaultChecked={rate.active}
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
                        form={`personal-rate-${rate.id}`}
                        className={btnRowSave}
                      >
                        Save
                      </button>
                      <ConfigurationForm action={deletePersonalLoanRate}>
                        <input type="hidden" name="id" value={rate.id} />
                        <ConfirmedDeleteSubmit itemLabel="personal rate" />
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
        title="Add personal loan rate"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rates.length === 0}
      >
        <ConfigurationForm
          action={createPersonalLoanRate}
          className="grid gap-3 text-sm sm:grid-cols-4"
        >
          <Field label="Product" className="sm:col-span-2">
            <select name="productId" className={inp} aria-label="Product">
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Carded rate">
            <input
              name="cardedRate"
              required
              aria-label="Carded rate percentage"
              className={inp}
            />
          </Field>
          <Field label="Comparison rate">
            <input
              name="comparisonRate"
              aria-label="Comparison rate percentage"
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
            Add rate
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
