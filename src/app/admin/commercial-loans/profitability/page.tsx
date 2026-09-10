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
import { QuoteFeeSettingEditor } from "@/components/admin/QuoteFeeSettingEditor";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { StatusText } from "@/components/ui/StatusText";
import { ExpectedLossPolicyAdmin } from "@/components/admin/ExpectedLossPolicyAdmin";

const CHANNEL_LABELS: Record<string, string> = {
  broker: "Broker",
  online: "Online",
  direct: "Direct",
};
const FACILITY_LABELS: Record<string, string> = {
  term_loan: "Business term loan",
  overdraft: "Business overdraft",
  equipment_finance: "Equipment finance",
  commercial_property: "Commercial property",
};
const COMBINATIONS = Object.keys(CHANNEL_LABELS).flatMap((channel) =>
  Object.keys(FACILITY_LABELS).map((facilityType) => ({
    channel,
    facilityType,
    key: `${channel}:${facilityType}`,
  })),
);

export default function CommercialProfitabilityDefaultsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createCommercialProfitabilityDefault,
    deleteCommercialProfitabilityDefault,
    updateCommercialProfitabilityDefault,
  } = createConfigurationActions(configuration.version);
  const defaults = tables.commercial_profitability_default;
  const quoteFeeSetting =
    tables.quote_fee_setting.find((row) => row.vertical === "commercial") ??
    null;

  const used = new Set(
    defaults.map((item) => `${item.channel}:${item.facilityType}`),
  );
  const available = COMBINATIONS.filter((item) => !used.has(item.key));

  return (
    <div className="space-y-5">
      <QuoteFeeSettingEditor vertical="commercial" setting={quoteFeeSetting} />
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>
              Commercial loan profitability line-item defaults
            </h2>
            <p className={adminTableDescription}>
              Per-channel and per-facility defaults for the annual P&amp;L line
              items, entered as % of profitability exposure p.a. Blank quote
              line items resolve to these values; explicit inputs always win.
              Cost of funds lives under Margins.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {defaults.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Commercial profitability defaults table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Channel</th>
                <th className={th}>Facility</th>
                <th className={th}>Commissions %</th>
                <th className={th}>Other income %</th>
                <th className={th}>Expenses %</th>
                <th className={th}>Active</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {defaults.map((row) => (
                <tr
                  key={row.id}
                  id={adminConfigTargetId("commercial-profitability", row.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    <ConfigurationForm
                      id={`cpfd-${row.id}`}
                      action={updateCommercialProfitabilityDefault}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="channel" value={row.channel} />
                      <input
                        type="hidden"
                        name="facilityType"
                        value={row.facilityType}
                      />
                    </ConfigurationForm>
                    {CHANNEL_LABELS[row.channel] ?? row.channel}
                  </td>
                  <td className={`${td} text-muted`}>
                    {FACILITY_LABELS[row.facilityType] ?? row.facilityType}
                  </td>
                  <td className={td}>
                    {row.channel === "online" ? (
                      <span className="text-faint">Always 0</span>
                    ) : (
                      <input
                        name="commissionsPct"
                        form={`cpfd-${row.id}`}
                        defaultValue={row.commissionsPct ?? ""}
                        placeholder="No default"
                        className={`${inp} w-24`}
                        aria-label="Commissions percent of profitability exposure"
                      />
                    )}
                  </td>
                  <td className={td}>
                    <input
                      name="otherIncomePct"
                      form={`cpfd-${row.id}`}
                      defaultValue={row.otherIncomePct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Other income percent of profitability exposure"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="expensesPct"
                      form={`cpfd-${row.id}`}
                      defaultValue={row.expensesPct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Expenses percent of profitability exposure"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`cpfd-${row.id}`}
                      defaultChecked={row.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`cpfd-${row.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm
                      action={deleteCommercialProfitabilityDefault}
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmedDeleteSubmit itemLabel="commercial profitability default" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
              {defaults.length === 0 && (
                <tr>
                  <td className={`${td} text-muted`} colSpan={7}>
                    No commercial profitability defaults configured. Blank quote
                    line items resolve to zero until defaults exist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add commercial profitability defaults"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={defaults.length === 0}
      >
        {available.length === 0 ? (
          <p className="text-sm text-muted">
            Every channel and facility combination already has a defaults row.
          </p>
        ) : (
          <ConfigurationForm
            action={createCommercialProfitabilityDefault}
            className="grid gap-3 text-sm sm:grid-cols-3"
          >
            <Field label="Channel and facility">
              <select
                name="combination"
                className={inp}
                aria-label="Channel and facility"
              >
                {available.map((item) => (
                  <option key={item.key} value={item.key}>
                    {CHANNEL_LABELS[item.channel]} -{" "}
                    {FACILITY_LABELS[item.facilityType]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commissions" helper="Ignored for online channel.">
              <input
                name="commissionsPct"
                placeholder="% of exposure"
                aria-label="Commissions percent of profitability exposure"
                className={inp}
              />
            </Field>
            <Field label="Other income">
              <input
                name="otherIncomePct"
                placeholder="% of exposure"
                aria-label="Other income percent of profitability exposure"
                className={inp}
              />
            </Field>
            <Field label="Expenses">
              <input
                name="expensesPct"
                placeholder="% of exposure"
                aria-label="Expenses percent of profitability exposure"
                className={inp}
              />
            </Field>
            <button type="submit" className={btn}>
              Add defaults
            </button>
          </ConfigurationForm>
        )}
      </CollapsibleSection>
      <div id="expected-loss" className="scroll-mt-24">
        <ExpectedLossPolicyAdmin vertical="commercial" />
      </div>
    </div>
  );
}
