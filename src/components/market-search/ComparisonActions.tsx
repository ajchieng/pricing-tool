"use client";

import { Check, Copy, Printer, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export function ComparisonActions({ clearHref }: { clearHref: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2400);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="market-print-hide flex flex-wrap items-center gap-2">
      <a
        href={clearHref}
        className={buttonClass(
          "ghost",
          "sm",
          "border-rail-border text-rail-muted hover:bg-rail-raised hover:text-rail-ink",
        )}
      >
        <X size={15} aria-hidden />
        Clear
      </a>
      <button
        type="button"
        onClick={() => {
          void copyLink();
        }}
        className={buttonClass(
          "ghost",
          "sm",
          "border-rail-border text-rail-ink hover:bg-rail-raised hover:text-rail-ink",
        )}
      >
        {copyState === "copied" ? (
          <Check size={15} className="text-brand-glow" aria-hidden />
        ) : (
          <Copy size={15} aria-hidden />
        )}
        {copyState === "copied"
          ? "Link copied"
          : copyState === "failed"
            ? "Copy failed"
            : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className={buttonClass(
          "primary",
          "sm",
          "bg-brand-glow text-brand-deep hover:bg-rail-accent",
        )}
      >
        <Printer size={15} aria-hidden />
        Print
      </button>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? "Comparison link copied."
          : copyState === "failed"
            ? "The comparison link could not be copied."
            : ""}
      </span>
    </div>
  );
}
