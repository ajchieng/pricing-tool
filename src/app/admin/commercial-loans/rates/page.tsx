"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

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
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { StatusText } from "@/components/ui/StatusText";
import { fmtDateTime } from "@/lib/format";
import {
  COMMERCIAL_LOAN_TYPE_LABELS,
  labelFacilityType,
} from "@/lib/pricing/commercial/labels";
import {
  PUBLISHED_RATE_ROLES,
  PUBLISHED_RATE_ROLE_LABELS,
  publishedRateRole,
} from "@/lib/pricing/rate-role";

export default function CommercialRatesAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createCommercialLoanRate,
    deleteCommercialLoanRate,
    updateCommercialLoanRate,
  } = createConfigurationActions(configuration.version);
  const products = tables.commercial_loan_product;
  const rates = tables.commercial_loan_product_rate.flatMap((row) => {
    const product = products.find((p) => p.id === row.productId);
    return product ? [{ ...row, product }] : [];
  });

  if (products.length === 0) {
    return (
      <EmptyState
        title="No commercial products yet"
        body="Add a commercial product before setting its base rate."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Commercial base rates</h2>
            <p className={adminTableDescription}>
              Maintain Standard and Non-Standard base rates for each facility.
              The customer-score discount is subtracted from the selected base.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rates.length} rows
          </Badge>
        </div>
        <div
          className={responsiveAdminTableScroll}
          role="region"
          aria-label="Commercial rates table"
          tabIndex={0}
        >
          <table className={responsiveAdminTable}>
            <thead className={responsiveAdminTableHead}>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Facility</th>
                <th className={th}>Loan type</th>
                <th className={th}>Base rate %</th>
                <th className={th}>Pricing role</th>
                <th className={th}>Effective from</th>
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
                  id={adminConfigTargetId("commercial-rate", r.id)}
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
                    <span className={responsiveAdminMobileLabel}>Facility</span>
                    <span className="text-muted">
                      {labelFacilityType(r.product.facilityType)}
                    </span>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Loan type
                    </span>
                    <select
                      name="loanType"
                      form={`crate-${r.id}`}
                      defaultValue={r.loanType ?? ""}
                      className={inp}
                      aria-label="Loan type"
                      required
                    >
                      {r.loanType == null && (
                        <option value="" disabled>
                          Legacy / unclassified
                        </option>
                      )}
                      {Object.entries(COMMERCIAL_LOAN_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Base rate %
                    </span>
                    <ConfigurationForm
                      id={`crate-${r.id}`}
                      action={updateCommercialLoanRate}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="baseRate"
                        defaultValue={r.baseRate}
                        className={inp}
                        aria-label="Base rate"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>
                      Pricing role
                    </span>
                    <select
                      name="pricingRole"
                      form={`crate-${r.id}`}
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
                      Effective from
                    </span>
                    <span className="text-muted">
                      {fmtDateTime(r.effectiveFrom)}
                    </span>
                  </td>
                  <td className={responsiveAdminTableCell}>
                    <span className={responsiveAdminMobileLabel}>Active</span>
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        name="active"
                        form={`crate-${r.id}`}
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
                        form={`crate-${r.id}`}
                        className={btnRowSave}
                      >
                        Save
                      </button>
                      <ConfigurationForm action={deleteCommercialLoanRate}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmedDeleteSubmit itemLabel="commercial rate" />
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
        title="Add commercial base rate"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rates.length === 0}
      >
        <ConfigurationForm
          action={createCommercialLoanRate}
          className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Product">
            <select
              name="productId"
              className={inp}
              aria-label="Product"
              required
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {labelFacilityType(product.facilityType)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loan type">
            <select
              name="loanType"
              defaultValue="standard"
              className={inp}
              aria-label="Loan type"
              required
            >
              {Object.entries(COMMERCIAL_LOAN_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Base rate %">
            <input
              name="baseRate"
              placeholder="Base rate %"
              required
              aria-label="Base rate"
              className={inp}
            />
          </Field>
          <Field label="Pricing role">
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
            Add base rate
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
