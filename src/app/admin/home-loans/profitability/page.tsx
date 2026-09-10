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
import { StatusText } from "@/components/ui/StatusText";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Field } from "@/components/ui/Field";
import { ExpectedLossPolicyAdmin } from "@/components/admin/ExpectedLossPolicyAdmin";

const CHANNEL_LABELS: Record<string, string> = {
  broker: "Broker",
  online: "Online",
  direct: "Direct",
};

export default function ProfitabilityDefaultsAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createProfitabilityDefault,
    deleteProfitabilityDefault,
    updateProfitabilityDefault,
  } = createConfigurationActions(configuration.version);
  const defaults = tables.profitability_default;
  const quoteFeeSetting =
    tables.quote_fee_setting.find((row) => row.vertical === "home") ?? null;

  const usedChannels = new Set(defaults.map((d) => d.channel));
  const availableChannels = Object.keys(CHANNEL_LABELS).filter(
    (c) => !usedChannels.has(c),
  );

  return (
    <div className="space-y-5">
      <QuoteFeeSettingEditor vertical="home" setting={quoteFeeSetting} />
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>
              Profitability line-item defaults
            </h2>
            <p className={adminTableDescription}>
              Per-channel defaults for the quote form&apos;s profitability line
              items, entered as % of loan amount p.a. They pre-fill new quotes;
              quote creators can type over any value. Online channel never
              carries a commission default (commissions are always 0 online).
              Cost of funds defaults live under Margins.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {defaults.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Home profitability defaults table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Channel</th>
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
              {defaults.map((d) => (
                <tr
                  key={d.id}
                  id={adminConfigTargetId("home-profitability", d.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={`${td} text-muted`}>
                    <ConfigurationForm
                      id={`pfd-${d.id}`}
                      action={updateProfitabilityDefault}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="channel" value={d.channel} />
                    </ConfigurationForm>
                    {CHANNEL_LABELS[d.channel] ?? d.channel}
                  </td>
                  <td className={td}>
                    {d.channel === "online" ? (
                      <span className="text-faint">Always 0</span>
                    ) : (
                      <input
                        name="commissionsPct"
                        form={`pfd-${d.id}`}
                        defaultValue={d.commissionsPct ?? ""}
                        placeholder="No default"
                        className={`${inp} w-24`}
                        aria-label="Commissions percent of loan amount"
                      />
                    )}
                  </td>
                  <td className={td}>
                    <input
                      name="otherIncomePct"
                      form={`pfd-${d.id}`}
                      defaultValue={d.otherIncomePct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Other income percent of loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      name="expensesPct"
                      form={`pfd-${d.id}`}
                      defaultValue={d.expensesPct ?? ""}
                      placeholder="No default"
                      className={`${inp} w-24`}
                      aria-label="Expenses percent of loan amount"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`pfd-${d.id}`}
                      defaultChecked={d.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`pfd-${d.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deleteProfitabilityDefault}>
                      <input type="hidden" name="id" value={d.id} />
                      <ConfirmedDeleteSubmit itemLabel="home profitability default" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
              {defaults.length === 0 && (
                <tr>
                  <td className={`${td} text-muted`} colSpan={6}>
                    No profitability defaults configured — quote line items
                    start blank until defaults are added below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add channel defaults"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={defaults.length === 0}
      >
        {availableChannels.length === 0 ? (
          <p className="text-sm text-muted">
            All channels already have a defaults row. Edit or delete the rows
            above.
          </p>
        ) : (
          <ConfigurationForm
            action={createProfitabilityDefault}
            className="grid gap-3 text-sm sm:grid-cols-3"
          >
            <Field label="Channel">
              <select name="channel" className={inp} aria-label="Channel">
                {availableChannels.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commissions" helper="Ignored for the online channel.">
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
        <ExpectedLossPolicyAdmin vertical="home" />
      </div>
    </div>
  );
}
