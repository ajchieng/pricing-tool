"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  initializeDemo,
  resetDemo,
  subscribeDemoChanges,
} from "@/lib/demo/store";
import { draftFromCalculation } from "@/lib/demo/presentation";
import type { DemoArea, DemoSeedDraft } from "@/lib/demo/types";

type DemoContext = {
  ready: boolean;
  busy: boolean;
  error: string | null;
  version: number;
  reset: () => Promise<void>;
};
const Context = createContext<DemoContext>({
  ready: false,
  busy: false,
  error: null,
  version: 0,
  reset: async () => {},
});
let initialization: Promise<void> | undefined;

async function initializeWorkspace() {
  const { calculateDemo, sampleInput } = await import("@/lib/demo/pricing");
  const seeds: DemoSeedDraft[] = [];
  const names: Record<DemoArea, string[]> = {
    home: ["Alex Morgan", "Jordan Ellis"],
    personal: ["Taylor Reed", "Casey Quinn"],
    commercial: ["Cedar Workshop", "Harbour Studio"],
  };
  for (const area of ["home", "personal", "commercial"] as const) {
    for (let index = 0; index < 2; index++) {
      const input = {
        ...sampleInput(area),
        customerReference: `${names[area][index]} · demo`,
        customerName: names[area][index],
        businessName: names[area][index],
      } as Record<string, unknown>;
      if (index === 1) {
        input.requestedRate =
          area === "home" ? 4.9 : area === "personal" ? 7.4 : 5.7;
        input.requestedReason =
          "Illustrative customer rate request for the review workflow.";
      }
      const { input: normalizedInput, result } = await calculateDemo(
        area,
        input,
      );
      seeds.push({
        ...draftFromCalculation(area, normalizedInput, result),
        seedStatus: index === 1 ? "ready_for_review" : "draft",
        seedComment:
          index === 1
            ? "Sample requested-rate scenario. Review the financial results and record a reasoned demo decision."
            : "Fictional sample scenario. Try revising the amount or requested rate.",
      });
      if (area === "home" && index === 0) {
        const revisedInput = { ...input, loanAmount: 450000 };
        const revisedResult = await calculateDemo(area, revisedInput);
        seeds.push({
          ...draftFromCalculation(
            area,
            revisedResult.input,
            revisedResult.result,
          ),
          seedRevisionOfIndex: 0,
          seedComment:
            "Sample revision: increased the loan amount while preserving the earlier pricing snapshot.",
        });
      }
    }
  }
  await initializeDemo(seeds);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let mounted = true;
    initialization ??= initializeWorkspace();
    void initialization
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((cause: unknown) => {
        initialization = undefined;
        if (mounted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Browser storage could not be opened.",
          );
      });
    const unsubscribe = subscribeDemoChanges(() =>
      setVersion((value) => value + 1),
    );
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await resetDemo();
      setError(null);
      setReady(true);
      setVersion((value) => value + 1);
      window.location.assign("/");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The reset failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  return (
    <Context value={{ ready, busy, error, version, reset }}>{children}</Context>
  );
}

export const useDemo = () => useContext(Context);
export function WorkspaceLoading() {
  return (
    <div role="status" className="py-12">
      <p className="font-serif text-xl">Opening your demo workspace…</p>
      <p className="mt-2 text-sm text-muted">
        Preparing fictional scenarios in this browser.
      </p>
    </div>
  );
}
