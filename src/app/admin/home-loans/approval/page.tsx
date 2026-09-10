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

const LEVELS = ["none", "manager", "senior", "review", "exception"];
const CONDITION_TYPES = [
  "total_discount",
  "requested_below_suggested",
  "competitor_match",
  "retention_applied",
  "margin_below_target",
  "margin_below_hard_min",
  "loan_amount",
  "lvr_exceeds_max",
  "requested_below_min",
  // Customer risk context
  "serviceability_borderline",
  "serviceability_review_required",
  "income_review_required",
  "risk_not_assessed",
  // Granular numeric thresholds
  "credit_score",
  "dti_ratio",
  "gross_annual_income",
];
const OPERATORS = ["lte", "lt", "gte", "gt", "eq"];

export default function ApprovalAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { createApprovalRule, deleteApprovalRule, updateApprovalRule } =
    createConfigurationActions(configuration.version);
  const rules = [...tables.approval_rule].sort(
    (a, b) => a.priority - b.priority,
  );

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Approval rules</h2>
            <p className={adminTableDescription}>
              The most severe matched level wins. The tool displays approval
              requirements only — it does not approve loans.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rules.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Home approval rules table"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Prio</th>
                <th className={th}>Name</th>
                <th className={th}>Level</th>
                <th className={th}>Condition</th>
                <th className={th}>Op</th>
                <th className={th}>Value</th>
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
                  id={adminConfigTargetId("home-approval", r.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={td}>
                    <ConfigurationForm
                      id={`appr-${r.id}`}
                      action={updateApprovalRule}
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
                  <td className={`${td} min-w-[180px]`}>
                    <input
                      name="name"
                      form={`appr-${r.id}`}
                      defaultValue={r.name}
                      className={inp}
                      aria-label="Name"
                    />
                    <input
                      name="reasonText"
                      form={`appr-${r.id}`}
                      defaultValue={r.reasonText}
                      placeholder="Reason"
                      className={`${inp} mt-1 text-xs`}
                      aria-label="Reason"
                    />
                  </td>
                  <td className={td}>
                    <select
                      name="approvalLevel"
                      form={`appr-${r.id}`}
                      defaultValue={r.approvalLevel}
                      className={inp}
                      aria-label="Approval level"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      name="conditionType"
                      form={`appr-${r.id}`}
                      defaultValue={r.conditionType}
                      className={inp}
                      aria-label="Condition type"
                    >
                      {CONDITION_TYPES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      name="conditionOperator"
                      form={`appr-${r.id}`}
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
                      form={`appr-${r.id}`}
                      defaultValue={r.conditionValue}
                      className={`${inp} w-20`}
                      aria-label="Condition value"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`appr-${r.id}`}
                      defaultChecked={r.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`appr-${r.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deleteApprovalRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmedDeleteSubmit itemLabel="home approval rule" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add approval rule"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rules.length === 0}
      >
        <ConfigurationForm
          action={createApprovalRule}
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
          <Field label="Approval level">
            <select
              name="approvalLevel"
              className={inp}
              aria-label="Approval level"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Condition">
            <select
              name="conditionType"
              className={inp}
              aria-label="Condition type"
            >
              {CONDITION_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              placeholder="Value"
              aria-label="Condition value"
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
          <Field label="Reason shown to staff" className="sm:col-span-2">
            <input
              name="reasonText"
              placeholder="Reason shown to staff"
              required
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
