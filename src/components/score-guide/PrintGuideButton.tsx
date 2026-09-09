"use client";

import { buttonClass } from "@/components/ui/Button";

export function PrintGuideButton({
  className = buttonClass("secondary", "sm"),
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${className} demo-no-print`}
      onClick={() => window.print()}
    >
      Export PDF
    </button>
  );
}
