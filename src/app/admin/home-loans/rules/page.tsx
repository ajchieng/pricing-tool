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

// Condition types the pricing engine (evaluateAdjustmentRules) actually
// consumes. Keep this list in sync with the switch in
// src/lib/pricing/calculate.ts.
const CONDITION_TYPES = [
  "lvr",
  "loan_amount",
  "existing_member",
  "retention_scenario",
  "multiple_lender_products",
];
const OPERATORS = ["lte", "lt", "gte", "gt", "eq"];
const LOAN_PURPOSES = ["owner_occupied", "investment"];
const RATE_TYPES = ["variable", "fixed"];

export default function RulesAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { createAdjustmentRule, deleteAdjustmentRule, updateAdjustmentRule } =
    createConfigurationActions(configuration.version);
  const rules = [...tables.pricing_adjustment_rule].sort(
    (a, b) => a.priority - b.priority,
  );
  const products = tables.product;

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Pricing rules</h2>
            <p className={adminTableDescription}>
              Product discounts stack <strong>additively</strong> with the
              customer-score discount. Scope broadly with &ldquo;Any&rdquo;, or
              target a product, purpose and rate type.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rules.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Home pricing rules table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Prio</th>
                <th className={th}>Name</th>
                <th className={th}>Scope</th>
                <th className={th}>Type</th>
                <th className={th}>Amount</th>
                <th className={th}>Condition</th>
                <th className={th}>Op</th>
                <th className={th}>Value</th>
                <th className={th}>Appr.</th>
                <th className={th}>Active</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((r) => (
                <tr
                  key={r.id}
                  id={adminConfigTargetId("home-rule", r.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={td}>
                    <ConfigurationForm
                      id={`rule-${r.id}`}
                      action={updateAdjustmentRule}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="priority"
                        defaultValue={r.priority}
                        className={`${inp} w-14`}
                        aria-label="Priority"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={`${td} min-w-[160px]`}>
                    <input
                      name="name"
                      form={`rule-${r.id}`}
                      defaultValue={r.name}
                      className={inp}
                      aria-label="Name"
                    />
                    <input
                      name="reasonText"
                      form={`rule-${r.id}`}
                      defaultValue={r.reasonText ?? ""}
                      placeholder="Reason shown to staff"
                      className={`${inp} mt-1 text-xs`}
                      aria-label="Reason"
                    />
                  </td>
                  <td className={`${td} min-w-[180px]`}>
                    <select
                      name="appliesToProductId"
                      form={`rule-${r.id}`}
                      defaultValue={r.appliesToProductId ?? ""}
                      className={inp}
                      aria-label="Applies to product"
                    >
                      <option value="">All products</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex gap-1">
                      <select
                        name="appliesToLoanPurpose"
                        form={`rule-${r.id}`}
                        defaultValue={r.appliesToLoanPurpose ?? ""}
                        className={`${inp} text-xs`}
                        aria-label="Applies to loan purpose"
                      >
                        <option value="">Any purpose</option>
                        {LOAN_PURPOSES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <select
                        name="appliesToRateType"
                        form={`rule-${r.id}`}
                        defaultValue={r.appliesToRateType ?? ""}
                        className={`${inp} text-xs`}
                        aria-label="Applies to rate type"
                      >
                        <option value="">Any type</option>
                        {RATE_TYPES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className={td}>
                    <input
                      type="hidden"
                      name="ruleType"
                      form={`rule-${r.id}`}
                      value={r.ruleType}
                    />
                    {r.ruleType === "loading" ? (
                      <Badge tone="muted" size="sm">
                        Legacy loading
                      </Badge>
                    ) : (
                      <span className="text-sm text-ink">Discount</span>
                    )}
                  </td>
                  <td className={td}>
                    <input
                      name="adjustmentAmount"
                      form={`rule-${r.id}`}
                      defaultValue={r.adjustmentAmount}
                      className={`${inp} w-20`}
                      aria-label="Amount"
                    />
                  </td>
                  <td className={td}>
                    <select
                      name="conditionType"
                      form={`rule-${r.id}`}
                      defaultValue={r.conditionType}
                      className={inp}
                      aria-label="Condition type"
                    >
                      {CONDITION_TYPES.map((c) => (
                        <option key={c} value={c}>
                          {c === "multiple_lender_products"
                            ? "multiple lender products"
                            : c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      name="conditionOperator"
                      form={`rule-${r.id}`}
                      defaultValue={r.conditionOperator}
                      className={inp}
                      aria-label="Operator"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <input
                      name="conditionValue"
                      form={`rule-${r.id}`}
                      defaultValue={r.conditionValue}
                      className={`${inp} w-24`}
                      aria-label="Condition value"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="requiresApproval"
                      form={`rule-${r.id}`}
                      defaultChecked={r.requiresApproval}
                      aria-label="Requires approval"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`rule-${r.id}`}
                      defaultChecked={r.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`rule-${r.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deleteAdjustmentRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmedDeleteSubmit itemLabel="home pricing rule" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add pricing rule"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rules.length === 0}
      >
        <ConfigurationForm
          action={createAdjustmentRule}
          className="grid gap-3 text-sm sm:grid-cols-4"
        >
          <Field label="Rule name">
            <input
              name="name"
              placeholder="Name"
              required
              aria-label="Rule name"
              className={inp}
            />
          </Field>
          <Field label="Applies to product">
            <select
              name="appliesToProductId"
              className={inp}
              aria-label="Applies to product"
              defaultValue=""
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loan purpose">
            <select
              name="appliesToLoanPurpose"
              className={inp}
              aria-label="Applies to loan purpose"
              defaultValue=""
            >
              <option value="">Any purpose</option>
              {LOAN_PURPOSES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rate type">
            <select
              name="appliesToRateType"
              className={inp}
              aria-label="Applies to rate type"
              defaultValue=""
            >
              <option value="">Any rate type</option>
              {RATE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="ruleType" value="discount" />
          <Field label="Discount amount">
            <input
              name="adjustmentAmount"
              placeholder="Amount (pp)"
              required
              aria-label="Discount amount in percentage points"
              className={inp}
            />
          </Field>
          <Field label="Priority">
            <input
              name="priority"
              placeholder="Priority (100)"
              aria-label="Priority"
              className={inp}
            />
          </Field>
          <Field label="Condition">
            <select
              name="conditionType"
              className={inp}
              aria-label="Condition type"
            >
              {CONDITION_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c === "multiple_lender_products"
                    ? "multiple lender products"
                    : c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Operator">
            <select
              name="conditionOperator"
              className={inp}
              aria-label="Operator"
            >
              {OPERATORS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Condition value">
            <input
              name="conditionValue"
              placeholder="Value (e.g. 70 or true)"
              required
              aria-label="Condition value"
              className={inp}
            />
          </Field>
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="requiresApproval" /> Requires approval
          </label>
          <Field label="Reason shown to staff" className="sm:col-span-3">
            <input
              name="reasonText"
              placeholder="Reason shown to staff"
              aria-label="Reason shown to staff"
              className={inp}
            />
          </Field>
          <button type="submit" className={btn}>
            Add rule
          </button>
        </ConfigurationForm>
      </CollapsibleSection>
    </div>
  );
}
