"use client";

import { useEffect, useState } from "react";
import { readDemoConfigurationHistory } from "@/lib/demo/configuration";
import type { DemoArea } from "@/lib/demo/policy";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { td, th, adminTableScroll } from "@/components/adminUi";

export function ConfigurationModelHistory({
  vertical,
  targetType,
  configurationVersion,
}: {
  vertical: DemoArea;
  targetType: "score_model" | "expected_loss_policy";
  configurationVersion: number;
}) {
  const [changes, setChanges] = useState<
    Awaited<ReturnType<typeof readDemoConfigurationHistory>>
  >([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    readDemoConfigurationHistory()
      .then((history) => {
        if (cancelled) return;
        setChanges(
          history.filter((change) => {
            if (change.targetType !== targetType) return false;
            const row =
              change.after && typeof change.after === "object"
                ? (change.after as Record<string, unknown>)
                : null;
            return row?.productArea === vertical || row?.vertical === vertical;
          }),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Configuration history could not be read from this browser.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [vertical, targetType, configurationVersion]);
  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">
        {targetType === "score_model"
          ? "Approval history"
          : "Governance history"}
      </h2>
      {error ? (
        <p className="mt-2 text-sm text-alert" role="alert">
          {error}
        </p>
      ) : changes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No proposals yet.</p>
      ) : (
        <div
          className={`${adminTableScroll} mt-3`}
          role="region"
          aria-label={`${vertical} ${targetType === "score_model" ? "score model" : "expected loss"} versions table`}
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong">
              <tr>
                <th className={th}>Status</th>
                <th className={th}>Change</th>
                <th className={th}>Published</th>
                <th className={th}>Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {changes.map((change) => (
                <tr key={change.id}>
                  <td className={td}>
                    <Badge tone="ok" size="sm">
                      approved
                    </Badge>
                  </td>
                  <td className={td}>{change.reason}</td>
                  <td className={td}>
                    {change.actorName}
                    <div className="text-xs text-faint">
                      {new Date(change.createdAt).toLocaleString("en-AU")}
                    </div>
                  </td>
                  <td className={td}>{change.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
