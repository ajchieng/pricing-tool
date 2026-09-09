"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

function getDisclosureElements(scopeId: string): HTMLDetailsElement[] {
  const scope = document.getElementById(scopeId);
  if (!scope) return [];
  return Array.from(scope.querySelectorAll("details"));
}

export function QuoteDetailDisclosureToggle({ scopeId }: { scopeId: string }) {
  const [allOpen, setAllOpen] = useState(false);
  const [count, setCount] = useState(0);

  const syncState = useCallback(() => {
    const details = getDisclosureElements(scopeId);
    setCount(details.length);
    setAllOpen(details.length > 0 && details.every((detail) => detail.open));
  }, [scopeId]);

  useEffect(() => {
    const scope = document.getElementById(scopeId);
    let active = true;
    queueMicrotask(() => {
      if (active) syncState();
    });
    if (!scope) {
      return () => {
        active = false;
      };
    }

    // Detail pages are server-rendered and can stream disclosure groups after
    // this client control hydrates. Observe the scope so the control appears
    // as soon as those groups arrive and stays in sync with later changes.
    const observer = new MutationObserver(syncState);
    observer.observe(scope, { childList: true, subtree: true });
    scope.addEventListener("toggle", syncState, true);
    return () => {
      active = false;
      observer.disconnect();
      scope.removeEventListener("toggle", syncState, true);
    };
  }, [scopeId, syncState]);

  function toggleAll() {
    const details = getDisclosureElements(scopeId);
    const nextOpen = !allOpen;
    details.forEach((detail) => {
      detail.open = nextOpen;
    });
    setAllOpen(nextOpen);
    setCount(details.length);
  }

  // The disclosure count is discovered after hydration. Avoid rendering a
  // disabled control during that brief interval (or on pages without groups).
  if (count === 0) return null;

  const Icon = allOpen ? ChevronUp : ChevronDown;

  return (
    <Button
      variant="secondary"
      size="sm"
      type="button"
      aria-pressed={allOpen}
      onClick={toggleAll}
      className="w-full sm:w-auto"
    >
      <Icon size={14} strokeWidth={1.9} aria-hidden />
      {allOpen ? "Collapse all" : "Expand all"}
    </Button>
  );
}
