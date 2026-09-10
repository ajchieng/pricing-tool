"use client";
import {
  useDemoConfiguration,
  reportConfigurationResult,
} from "@/lib/demo/configuration-react";
import {
  decideDemoConfigurationChange,
  publishDueDemoConfigurationChanges,
} from "@/lib/demo/configuration-governance";
import { expectedConfigurationVersion } from "@/lib/demo/configuration-form-version";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableScroll,
  adminTableShell,
  adminTableTitle,
  btn,
  btnDanger,
  btnGhost,
  inp,
  td,
  th,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
function payloadPreview(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}
function statusTone(status: string): "ok" | "alert" | "warn" {
  return status === "approved"
    ? "ok"
    : status === "rejected"
      ? "alert"
      : "warn";
}
export default function GovernanceAdmin() {
  const configuration = useDemoConfiguration();
  const now = new Date();
  const changes = configuration.proposals.map((proposal) => ({
    ...proposal,
    ...proposal.mutation,
    area: proposal.mutation.targetType.startsWith("personal")
      ? "personal"
      : proposal.mutation.targetType.startsWith("commercial")
        ? "commercial"
        : proposal.mutation.targetType.startsWith("capital")
          ? "global"
          : "home",
    payload: proposal.mutation.data,
    proposedBy: { name: proposal.proposedByName },
    decidedBy: proposal.decidedByName ? { name: proposal.decidedByName } : null,
    appliedAt: proposal.status === "approved" ? proposal.decidedAt : null,
  }));
  const pending = changes.filter((change) => change.status === "pending");
  const scheduled = changes
    .filter((change) => change.status === "scheduled")
    .sort((a, b) => (a.effectiveAt ?? "").localeCompare(b.effectiveAt ?? ""));
  const recent = changes
    .filter(
      (change) => change.status === "approved" || change.status === "rejected",
    )
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
    .slice(0, 30);
  const canDecide = true;
  const decide = async (
    data: FormData,
    decision: "approve" | "reject",
    successMessage?: string,
  ) => {
    await decideDemoConfigurationChange({
      expectedVersion: expectedConfigurationVersion(
        data,
        configuration.version,
      ),
      id: String(data.get("id")),
      decision,
      notes: String(data.get("decisionNotes") ?? ""),
      effectiveAt:
        decision === "approve" ? String(data.get("effectiveAt") ?? "") : null,
    });
    reportConfigurationResult(
      successMessage ??
        (decision === "approve"
          ? "Configuration change approved."
          : "Configuration change rejected."),
    );
  };
  const approveConfigChangeAction = (data: FormData) => decide(data, "approve");
  const rejectConfigChangeAction = (data: FormData) => decide(data, "reject");
  const cancelScheduledChangeAction = (data: FormData) =>
    decide(data, "reject", "Scheduled configuration change cancelled.");
  const publishDueConfigChangesAction = async () => {
    await publishDueDemoConfigurationChanges(configuration.version);
    reportConfigurationResult("Due configuration changes published.");
  };
  return (
    <div className="space-y-5">
      <Card padding="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Pending configuration changes
            </h2>
            <p className="mt-1 text-sm text-muted">
              Approve now to apply immediately, or set a future effective date
              so it can be published here when due. These decisions and policy
              changes stay in this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={pending.length > 0 ? "warn" : "ok"} size="sm">
              {pending.length} pending
            </Badge>
            <Badge tone={scheduled.length > 0 ? "warn" : "muted"} size="sm">
              {scheduled.length} scheduled
            </Badge>
          </div>
        </div>
      </Card>

      {pending.length === 0 ? (
        <EmptyState
          title="No pending configuration changes"
          body="Approved and rejected changes remain visible in recent decisions."
        />
      ) : (
        <section className="divide-y divide-border border-y border-border">
          {pending.map((change) => {
            const canApprove = true;
            const canReject = true;
            return (
              <article key={change.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{change.summary}</h3>
                      <Badge tone={statusTone(change.status)} size="sm">
                        {change.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {change.area} / {change.targetType} / {change.action}
                      {change.targetId ? ` #${change.targetId}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      Proposed by {change.proposedBy?.name ?? "Unknown user"} on{" "}
                      {formatDate(change.proposedAt)}
                    </p>
                    {change.reason ? (
                      <p className="mt-2 text-sm text-ink">{change.reason}</p>
                    ) : null}
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-muted">
                    Payload
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-panel/50 p-3 text-xs text-muted">
                    {payloadPreview(change.payload)}
                  </pre>
                </details>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.5fr)_auto_auto] md:items-end">
                  <textarea
                    name="decisionNotes"
                    form={`approve-${change.id}`}
                    placeholder="Decision notes"
                    className={`${inp} min-h-20`}
                    aria-label="Decision notes"
                  />
                  <label className="text-sm font-medium text-ink">
                    Effective from (browser time)
                    <input
                      type="datetime-local"
                      name="effectiveAt"
                      form={`approve-${change.id}`}
                      className={`${inp} mt-1`}
                      aria-label="Effective from (browser time)"
                    />
                  </label>
                  <ConfigurationForm
                    id={`approve-${change.id}`}
                    action={approveConfigChangeAction}
                  >
                    <input type="hidden" name="id" value={change.id} />
                    <button
                      type="submit"
                      className={btn}
                      disabled={!canApprove}
                      title={
                        canApprove
                          ? "Approve this change now, or schedule it when an effective date is set"
                          : "A different config admin must approve"
                      }
                    >
                      Approve
                    </button>
                  </ConfigurationForm>
                  <ConfigurationForm action={rejectConfigChangeAction}>
                    <input type="hidden" name="id" value={change.id} />
                    <input
                      type="hidden"
                      name="decisionNotes"
                      value="Rejected from governance queue."
                    />
                    <button
                      type="submit"
                      className={btnDanger}
                      disabled={!canReject}
                      title={
                        canReject
                          ? "Reject this change"
                          : "A different config admin must reject"
                      }
                    >
                      Reject
                    </button>
                  </ConfigurationForm>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Scheduled configuration changes</h2>
            <p className={adminTableDescription}>
              Approved changes waiting for their effective date. Due changes can
              be published from here in this browser using Publish due changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="muted" size="sm">
              {scheduled.length} rows
            </Badge>
            {canDecide ? (
              <ConfigurationForm action={publishDueConfigChangesAction}>
                <button type="submit" className={btn}>
                  Publish due changes
                </button>
              </ConfigurationForm>
            ) : null}
          </div>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Scheduled configuration changes"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Status</th>
                <th className={th}>Change</th>
                <th className={th}>Effective</th>
                <th className={th}>Approved by</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scheduled.length === 0 ? (
                <tr>
                  <td className={td} colSpan={5}>
                    No scheduled configuration changes.
                  </td>
                </tr>
              ) : (
                scheduled.map((change) => {
                  const isDue =
                    change.effectiveAt != null &&
                    Date.parse(change.effectiveAt) <= now.getTime();
                  return (
                    <tr key={change.id}>
                      <td className={td}>
                        <Badge tone={isDue ? "warn" : "muted"} size="sm">
                          {isDue ? "due" : "scheduled"}
                        </Badge>
                      </td>
                      <td className={td}>
                        <div className="font-medium">{change.summary}</div>
                        <div className="text-xs text-faint">
                          {change.area} / {change.targetType} / {change.action}
                        </div>
                      </td>
                      <td className={td}>
                        {change.effectiveAt
                          ? formatDate(change.effectiveAt)
                          : ""}
                      </td>
                      <td className={td}>
                        {change.decidedBy?.name ?? "Unknown user"}
                        <div className="text-xs text-faint">
                          {change.decidedAt ? formatDate(change.decidedAt) : ""}
                        </div>
                      </td>
                      <td className={td}>
                        <ConfigurationForm
                          action={cancelScheduledChangeAction}
                          className="min-w-60 space-y-2"
                        >
                          <input type="hidden" name="id" value={change.id} />
                          <label className="block text-xs font-medium text-ink">
                            Cancellation reason
                            <input
                              name="decisionNotes"
                              required
                              maxLength={2000}
                              className={`${inp} mt-1 w-full`}
                            />
                          </label>
                          <button type="submit" className={btnDanger}>
                            Cancel scheduled change
                          </button>
                        </ConfigurationForm>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Recent decisions</h2>
            <p className={adminTableDescription}>
              Latest approved and rejected configuration changes for audit
              review.
            </p>
          </div>
          <Badge tone="muted" size="sm">
            {recent.length} rows
          </Badge>
        </div>
        <div
          className={adminTableScroll}
          role="region"
          aria-label="Recent configuration decisions"
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Status</th>
                <th className={th}>Change</th>
                <th className={th}>Proposed</th>
                <th className={th}>Decided</th>
                <th className={th}>Applied</th>
                <th className={th}>Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.length === 0 ? (
                <tr>
                  <td className={td} colSpan={6}>
                    No approved or rejected changes yet.
                  </td>
                </tr>
              ) : (
                recent.map((change) => (
                  <tr key={change.id}>
                    <td className={td}>
                      <Badge tone={statusTone(change.status)} size="sm">
                        {change.status}
                      </Badge>
                    </td>
                    <td className={td}>
                      <div className="font-medium">{change.summary}</div>
                      <div className="text-xs text-faint">
                        {change.area} / {change.targetType} / {change.action}
                      </div>
                    </td>
                    <td className={td}>
                      {change.proposedBy?.name ?? "Unknown user"}
                      <div className="text-xs text-faint">
                        {formatDate(change.proposedAt)}
                      </div>
                    </td>
                    <td className={td}>
                      {change.decidedBy?.name ?? "Unknown user"}
                      <div className="text-xs text-faint">
                        {change.decidedAt ? formatDate(change.decidedAt) : ""}
                      </div>
                    </td>
                    <td className={td}>
                      {change.appliedAt ? formatDate(change.appliedAt) : ""}
                      {change.effectiveAt ? (
                        <div className="text-xs text-faint">
                          Effective {formatDate(change.effectiveAt)}
                        </div>
                      ) : null}
                    </td>
                    <td className={td}>{change.decisionNotes ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <a href="/admin/" className={btnGhost}>
        Back to admin
      </a>
    </div>
  );
}
