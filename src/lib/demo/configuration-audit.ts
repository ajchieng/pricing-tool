import { readDemoConfigurationHistory } from "./configuration";
import { listQuotes, getCore } from "./store";
import { readDemoFeedbackHistory } from "./local-operations";
import { DEMO_AREAS } from "./types";
export interface DemoAuditEvent {
  id: string;
  action: string;
  actorName: string;
  targetType: string;
  targetId: string | number | null;
  summary: string;
  createdAt: Date;
}
export async function readDemoAuditEvents(): Promise<DemoAuditEvent[]> {
  const [configuration, domains, feedback] = await Promise.all([
    readDemoConfigurationHistory(),
    Promise.all(DEMO_AREAS.map((area) => listQuotes(area))),
    readDemoFeedbackHistory(),
  ]);
  const cores = await Promise.all(
    [...new Set(domains.flat().map((quote) => quote.coreId))].map((id) =>
      getCore(id),
    ),
  );
  const events: DemoAuditEvent[] = configuration.map((row) => ({
    id: `config-${row.id}`,
    action: row.action.startsWith("config.")
      ? row.action
      : `config.${row.action}`,
    actorName: row.actorName,
    targetType: row.targetType,
    targetId: row.targetId,
    summary: row.reason,
    createdAt: new Date(row.createdAt),
  }));
  for (const core of cores)
    if (core)
      for (const row of core.history)
        events.push({
          id: `${core.id}-${row.id}`,
          action: `quote.${row.action}`,
          actorName: row.actor,
          targetType: `${core.area}_quote`,
          targetId: row.quoteId,
          summary: row.detail,
          createdAt: new Date(row.createdAt),
        });
  for (const row of feedback)
    events.push({
      id: `feedback-${row.targetId}-${row.id}`,
      action: row.action.replace("feedback_", "feedback."),
      actorName: row.actorName,
      targetType: "feedback",
      targetId: row.targetId,
      summary: row.reason,
      createdAt: new Date(row.createdAt),
    });
  return events.sort(
    (a, b) =>
      b.createdAt.valueOf() - a.createdAt.valueOf() || a.id.localeCompare(b.id),
  );
}
