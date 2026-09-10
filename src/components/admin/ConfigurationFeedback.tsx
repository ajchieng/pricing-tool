"use client";
import { useConfigurationResult } from "@/lib/demo/configuration-react";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
export function ConfigurationFeedback() {
  const result = useConfigurationResult();
  return result ? (
    <AsyncStatus
      key={result.sequence}
      kind={result.kind === "error" ? "error" : "success"}
      className={`mb-4 rounded-lg px-3 py-2 text-sm ${result.kind === "error" ? "bg-alert-soft text-alert" : "bg-ok-soft text-ok"}`}
    >
      {result.message}
    </AsyncStatus>
  ) : null;
}
