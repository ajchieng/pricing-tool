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
const SECURITY_LABELS: Record<string, string> = {
  secured: "Secured",
  unsecured: "Unsecured",
};
const COMBINATIONS = Object.keys(CHANNEL_LABELS).flatMap((channel) =>
  Object.keys(SECURITY_LABELS).map((securityType) => ({
    channel,
    securityType,
    key: `${channel}:${securityType}`,
  })),
);

export default function PersonalProfitabilityDefaultsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createPersonalProfitabilityDefault,
    deletePersonalProfitabilityDefault,
    updatePersonalProfitabilityDefault,
  } = createConfigurationActions(configuration.version);
  const defaults = tables.personal_profitability_default;
  const quoteFeeSetting =
    tables.quote_fee_setting.find((row) => row.vertical === "personal") ?? null;

  const used = new Set(
    defaults.map((item) => `${item.channel}:${item.securityType}`),
  );
  const available = COMBINATIONS.filter((item) => !used.has(item.key));

  return (
    <div className="space-y-5">
      <QuoteFeeSettingEditor vertical="personal" setting={quoteFeeSetting} />
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>
              Personal loan profitability line-item defaults
            </h2>
            <p className={adminTableDescription}>
              Per-channel and per-security defaults for the quote form, entered
              as % of loan amount p.a. Cost of funds lives under Margins.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {defaults.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Personal profitability defaults table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Channel</th>
                <th className={th}>Security</th>
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
                  id={adminConfigTargetId("personal-profitability", row.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    <ConfigurationForm
                      id={`ppfd-${row.id}`}
                      action={updatePersonalProfitabilityDefault}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="channel" value={row.channel} />
                      <input
                        type="hidden"
                        name="securityType"
                        value={row.securityType}
                      />
                    </ConfigurationForm>
                    {CHANNEL_LABELS[row.channel] ?? row.channel}
                  </td>
                  <td className={`${td} text-muted`}>
                    {SECURITY_LABELS[row.securityType] ?? row.securityType}
                  </td>
                  <td className={td}>
                    {row.channel === "online" ? (
                      <span className="text-faint">Always 0</span>
                    ) : (
                      <input
                        name="commissionsPct"
                        form={`ppfd-${row.id}`}
                        defaultValue={row.commissionsPct ?? ""}
                        placeholder="No default"
                        className={`${inp} w-24`}
                        aria-label="Commissions percent of loan amount"
                      />
                    )}
                  </td>
                  <td className={td}>
                    <input
                      name="otherIncomePct"
                      form={`ppfd-${row.id}`}
                      defaultValue={row.otherIncomePct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Other income percent of loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="expensesPct"
                      form={`ppfd-${row.id}`}
                      defaultValue={row.expensesPct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Expenses percent of loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`ppfd-${row.id}`}
                      defaultChecked={row.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`ppfd-${row.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm
                      action={deletePersonalProfitabilityDefault}
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmedDeleteSubmit itemLabel="personal profitability default" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
              {defaults.length === 0 && (
                <tr>
                  <td className={`${td} text-muted`} colSpan={7}>
                    No personal profitability defaults configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add personal profitability defaults"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={defaults.length === 0}
      >
        {available.length === 0 ? (
          <p className="text-sm text-muted">
            Every channel and security combination already has a defaults row.
          </p>
        ) : (
          <ConfigurationForm
            action={createPersonalProfitabilityDefault}
            className="grid gap-3 text-sm sm:grid-cols-3"
          >
            <Field label="Channel and security">
              <select
                name="combination"
                className={inp}
                aria-label="Channel and security"
              >
                {available.map((item) => (
                  <option key={item.key} value={item.key}>
                    {CHANNEL_LABELS[item.channel]} -{" "}
                    {SECURITY_LABELS[item.securityType]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commissions" helper="Ignored for online channel.">
              <input
                name="commissionsPct"
                placeholder="% of loan"
                aria-label="Commissions percent of loan amount"
                className={inp}
              />
            </Field>
            <Field label="Other income">
              <input
                name="otherIncomePct"
                placeholder="% of loan"
                aria-label="Other income percent of loan amount"
                className={inp}
              />
            </Field>
            <Field label="Expenses">
              <input
                name="expensesPct"
                placeholder="% of loan"
                aria-label="Expenses percent of loan amount"
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
        <ExpectedLossPolicyAdmin vertical="personal" />
      </div>
    </div>
  );
}
