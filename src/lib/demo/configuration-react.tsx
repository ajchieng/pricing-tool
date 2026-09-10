"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getDemoConfiguration,
  subscribeDemoConfiguration,
} from "./configuration";

export function useDemoConfiguration() {
  return useSyncExternalStore(
    subscribeDemoConfiguration,
    getDemoConfiguration,
    getDemoConfiguration,
  );
}

type ConfigurationResult = {
  message: string;
  kind: "success" | "error";
  sequence: number;
} | null;
let result: ConfigurationResult = null;
let sequence = 0;
const listeners = new Set<() => void>();
export function reportConfigurationResult(
  message: string,
  kind: "success" | "error" = "success",
) {
  result = message ? { message, kind, sequence: ++sequence } : null;
  for (const listener of listeners) listener();
}
const subscribeResult = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const readResult = () => result;
const serverResult = () => null;
export function useConfigurationResult() {
  return useSyncExternalStore(subscribeResult, readResult, serverResult);
}

export function DemoDisplayPreferences() {
  const configuration = useDemoConfiguration();
  const setting = configuration.tables.workspace_display_setting[0];
  useEffect(() => {
    const values: Record<string, string | undefined> = {
      "data-high-contrast": setting?.highContrast ? "true" : undefined,
      "data-density": setting?.comfortableDensity ? "comfortable" : undefined,
      "data-numeric-display": setting?.largeNumericDisplay
        ? "large"
        : undefined,
      "data-simple-mode": setting?.simpleMode ? "true" : undefined,
      "data-show-handoff":
        setting?.showQuoteHandoffStatus === false ? "false" : undefined,
    };
    for (const [name, value] of Object.entries(values)) {
      if (value) document.body.setAttribute(name, value);
      else document.body.removeAttribute(name);
    }
  }, [setting]);
  return null;
}
