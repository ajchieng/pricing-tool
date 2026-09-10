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

const LEVELS = ["none", "manager", "senior", "review", "exception"];
const CONDITION_TYPES = [
  "loan_amount",
  "unsecured_amount",
  "requested_below_suggested",
  "credit_not_scored",
  "score_band_watch",
  "score_band_weak",
  "affordability_tight",
  "affordability_not_assessed",
  "margin_below_target",
  "margin_below_hard_min",
  "employment_review_required",
  "retention_applied",
];
const OPERATORS = ["lte", "lt", "gte", "gt", "eq"];

export default function PersonalApprovalAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const {
    createPersonalApprovalRule,
    deletePersonalApprovalRule,
    updatePersonalApprovalRule,
  } = createConfigurationActions(configuration.version);
  const rules = [...tables.personal_approval_rule].sort(
    (a, b) => a.priority - b.priority,
  );

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Personal loan approval rules</h2>
            <p className={adminTableDescription}>
              Govern editable personal-loan escalation rules. Product limits,
              unsecured policy maximums and insufficient affordability remain
              code guardrails.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {rules.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Personal approval rules table"
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
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  id={adminConfigTargetId("personal-approval", rule.id)}
                  data-admin-search-target
                  tabIndex={-1}
                >
                  <td className={td}>
                    <ConfigurationForm
                      id={`pappr-${rule.id}`}
                      action={updatePersonalApprovalRule}
                      className="contents"
                    >
                      <input type="hidden" name="id" value={rule.id} />
                      <input
                        name="priority"
                        defaultValue={rule.priority}
                        className={`${inp} w-14`}
                        aria-label="Priority"
                      />
                    </ConfigurationForm>
                  </td>
                  <td className={`${td} min-w-[180px]`}>
                    <input
                      name="name"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.name}
                      className={inp}
                      aria-label="Name"
                    />
                    <input
                      name="reasonText"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.reasonText}
                      placeholder="Reason"
                      className={`${inp} mt-1 text-xs`}
                      aria-label="Reason"
                    />
                  </td>
                  <td className={td}>
                    <select
                      name="approvalLevel"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.approvalLevel}
                      className={inp}
                      aria-label="Approval level"
                    >
                      {LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      name="conditionType"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.conditionType}
                      className={inp}
                      aria-label="Condition type"
                    >
                      {CONDITION_TYPES.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      name="conditionOperator"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.conditionOperator}
                      className={inp}
                      aria-label="Operator"
                    >
                      {OPERATORS.map((operator) => (
                        <option key={operator} value={operator}>
                          {operator}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <input
                      name="conditionValue"
                      form={`pappr-${rule.id}`}
                      defaultValue={rule.conditionValue}
                      className={`${inp} w-24`}
                      aria-label="Condition value"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="active"
                      form={`pappr-${rule.id}`}
                      defaultChecked={rule.active}
                      aria-label="Active"
                    />
                  </td>
                  <td className={`${td} ${rowActions}`}>
                    <button
                      type="submit"
                      form={`pappr-${rule.id}`}
                      className={btnRowSave}
                    >
                      Save
                    </button>
                    <ConfigurationForm action={deletePersonalApprovalRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <ConfirmedDeleteSubmit itemLabel="personal approval rule" />
                    </ConfigurationForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CollapsibleSection
        title="Add personal approval rule"
        chip={<StatusText tone="muted">Optional</StatusText>}
        defaultOpen={rules.length === 0}
      >
        <ConfigurationForm
          action={createPersonalApprovalRule}
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
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
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
              {CONDITION_TYPES.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
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
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
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
