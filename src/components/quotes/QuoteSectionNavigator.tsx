"use client";

import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type QuoteSectionNavItem<Key extends string = string> = {
  key: Key;
  id: string;
  label: string;
  statusLabel?: string;
  state: "complete" | "attention" | "optional" | "informational";
};

export function quoteReadinessMessage({
  items,
  calculating,
  resultReady,
  scenarioActive,
  hasPricingError = false,
}: {
  items: QuoteSectionNavItem[];
  calculating: boolean;
  resultReady: boolean;
  scenarioActive: boolean;
  hasPricingError?: boolean;
}): string {
  if (scenarioActive) return "Apply or reset the customer-rate scenario";
  if (calculating) return "Pricing is recalculating";
  const nextRequired = items.find((item) => item.state === "attention");
  if (nextRequired) return `Complete ${nextRequired.label} next`;
  if (hasPricingError) return "Resolve the pricing error before saving";
  if (resultReady) return "Ready to save";
  return "Complete required inputs to calculate pricing";
}

export function QuoteSectionNavigator<Key extends string>({
  items,
  onActivate,
  readinessLabel,
}: {
  items: QuoteSectionNavItem<Key>[];
  onActivate: (key: Key, id: string) => void;
  readinessLabel: string;
}) {
  const [selected, setSelected] = useState("");
  const attentionCount = items.filter(
    (item) => item.state === "attention",
  ).length;
  const nextRequired = items.find((item) => item.state === "attention");

  return (
    <div
      data-quote-navigation
      aria-label="Quote progress"
      className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-y border-border bg-bg px-4 py-2 lg:top-6 lg:mx-0 lg:mb-5 lg:bg-panel/95"
    >
      <div className="hidden min-w-[11rem] lg:block">
        <p className="text-xs font-semibold text-ink">
          {attentionCount > 0
            ? `${attentionCount} section${attentionCount === 1 ? "" : "s"} need attention`
            : readinessLabel}
        </p>
        <p className="mt-0.5 text-[11px] text-faint">Quote progress</p>
      </div>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Jump to quote section</span>
        <select
          value={selected}
          onChange={(event) => {
            const item = items.find(
              (candidate) => candidate.key === event.target.value,
            );
            if (!item) return;
            setSelected("");
            onActivate(item.key, item.id);
          }}
          className="min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-ink"
        >
          <option value="">Jump to section…</option>
          {items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
              {item.statusLabel ? ` — ${item.statusLabel}` : ""}
            </option>
          ))}
        </select>
      </label>
      {nextRequired ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onActivate(nextRequired.key, nextRequired.id)}
          aria-label={`Go to next required section: ${nextRequired.label}`}
        >
          <ArrowDown size={15} strokeWidth={1.9} aria-hidden />
          <span className="hidden sm:inline">Next required</span>
          <span className="hidden lg:inline">: {nextRequired.label}</span>
        </Button>
      ) : null}
    </div>
  );
}
