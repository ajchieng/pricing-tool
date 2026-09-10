"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDemo, WorkspaceLoading } from "@/components/demo/DemoProvider";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import {
  readDemoAuditEvents,
  type DemoAuditEvent,
} from "@/lib/demo/configuration-audit";
import { subscribeDemoLocalOperations } from "@/lib/demo/local-operations";
import type { Tone } from "@/lib/tones";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableScroll,
  adminTableShell,
  adminTableTitle,
  btnGhost,
  inp,
  td,
  th,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 50;

const CATEGORIES = [
  { value: "all", label: "All events", prefix: null },
  { value: "quote", label: "Quotes", prefix: "quote." },
  { value: "config", label: "Configuration", prefix: "config." },
  { value: "feedback", label: "Feedback", prefix: "feedback." },
] as const;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function actionTone(action: string): Tone {
  if (action === "quote.deleted") return "alert";
  if (action === "config.rejected") return "alert";
  if (action === "config.approved" || action === "config.published")
    return "ok";
  if (action === "feedback.triaged") return "info";
  if (
    action === "config.proposed" ||
    action === "config.scheduled" ||
    action === "config.auto_approved"
  )
    return "warn";
  return "muted";
}

function auditHref(overrides: {
  category?: string;
  actor?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (overrides.category && overrides.category !== "all") {
    params.set("category", overrides.category);
  }
  if (overrides.actor) params.set("actor", overrides.actor);
  if (overrides.page && overrides.page > 1)
    params.set("page", String(overrides.page));
  const query = params.toString();
  return query ? `/admin/audit/?${query}` : "/admin/audit/";
}

export default function AuditLogAdminPage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <AuditLog />
    </Suspense>
  );
}
function AuditLog() {
  const params = useSearchParams();
  const sp = Object.fromEntries(params.entries());
  const category =
    CATEGORIES.find((item) => item.value === firstParam(sp.category)) ??
    CATEGORIES[0];
  const actorName = firstParam(sp.actor) || null;
  const requestedPage = Math.max(1, Number(firstParam(sp.page)) || 1);
  const { version } = useDemo();
  const configuration = useDemoConfiguration();
  const [allEvents, setAllEvents] = useState<DemoAuditEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      readDemoAuditEvents()
        .then((events) => {
          if (active) {
            setAllEvents(events);
            setLoadError(null);
            setLoaded(true);
          }
        })
        .catch((error) => {
          if (active) {
            setLoadError(
              error instanceof Error
                ? error.message
                : "Reload this page to retry reading browser history.",
            );
            setLoaded(true);
          }
        });
    void refresh();
    const unsubscribe = subscribeDemoLocalOperations(() => void refresh());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [version, configuration.version]);
  const filtered = allEvents.filter(
    (event) =>
      (!category.prefix || event.action.startsWith(category.prefix)) &&
      (!actorName || event.actorName === actorName),
  );
  const filteredCount = filtered.length,
    totalCount = allEvents.length;
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const events = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const users = [...new Set(allEvents.map((event) => event.actorName))]
    .sort()
    .map((name) => ({ id: name, name }));
  if (!loaded) return <WorkspaceLoading />;
  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Audit log</h2>
            <p className={adminTableDescription}>
              Local history of quote activity and configuration decisions.
              Events remain visible until Reset demo clears this browser’s
              workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="muted" size="sm">
              {totalCount} events
            </Badge>
            {(category.prefix || actorName != null) && (
              <Badge tone="info" size="sm">
                {filteredCount} matching
              </Badge>
            )}
          </div>
        </div>

        {loadError ? (
          <div className="p-4">
            <EmptyState
              title="Audit history could not be loaded"
              body={loadError}
            />
          </div>
        ) : (
          <>
            <form
              method="get"
              className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3"
            >
              <label className="block text-sm font-medium text-ink">
                Event type
                <select
                  name="category"
                  defaultValue={category.value}
                  className={`${inp} mt-1 w-44`}
                  aria-label="Filter by event type"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink">
                User
                <select
                  name="actor"
                  defaultValue={actorName != null ? actorName : ""}
                  className={`${inp} mt-1 w-44`}
                  aria-label="Filter by user"
                >
                  <option value="">All users</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={btnGhost}>
                Apply filters
              </button>
              {(category.prefix || actorName != null) && (
                <Link href="/admin/audit/" className={btnGhost}>
                  Clear
                </Link>
              )}
            </form>

            {events.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No audit events"
                  body={
                    category.prefix || actorName != null
                      ? "No events match the current filters."
                      : "Events appear here as you save quotes and manage configuration."
                  }
                />
              </div>
            ) : (
              <div
                className={adminTableScroll}
                role="region"
                aria-label="Audit events"
                tabIndex={0}
              >
                <table className="w-full text-sm">
                  <thead className="border-b border-border-strong">
                    <tr>
                      <th className={th}>Time</th>
                      <th className={th}>User</th>
                      <th className={th}>Event</th>
                      <th className={th}>Summary</th>
                      <th className={th}>Target</th>
                      <th className={th}>Storage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className={`${td} whitespace-nowrap`}>
                          <div className="tnum">
                            {event.createdAt.toLocaleString("en-AU")}
                          </div>
                        </td>
                        <td className={td}>
                          <div className="font-medium">
                            {event.actorName ?? "System / unknown"}
                          </div>
                          <div className="text-xs text-faint">Local demo</div>
                        </td>
                        <td className={td}>
                          <Badge tone={actionTone(event.action)} size="sm">
                            {event.action}
                          </Badge>
                        </td>
                        <td className={`${td} max-w-md`}>{event.summary}</td>
                        <td className={`${td} whitespace-nowrap`}>
                          {event.targetType
                            ? `${event.targetType.replaceAll("_", " ")}${
                                event.targetId != null
                                  ? ` #${event.targetId}`
                                  : ""
                              }`
                            : "—"}
                        </td>
                        <td
                          className={`${td} whitespace-nowrap text-xs text-faint`}
                        >
                          This browser
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-muted">
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={auditHref({
                        category: category.value,
                        actor: actorName != null ? actorName : undefined,
                        page: page - 1,
                      })}
                      className={btnGhost}
                    >
                      Newer
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link
                      href={auditHref({
                        category: category.value,
                        actor: actorName != null ? actorName : undefined,
                        page: page + 1,
                      })}
                      className={btnGhost}
                    >
                      Older
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
