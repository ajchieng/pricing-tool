"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type FocusStatus =
  { tone: "quiet"; message: string } | { tone: "warn"; message: string } | null;

const TARGET_PREFIX = "config-";

export function AdminSearchTargetFocus() {
  const pathname = usePathname();
  const [status, setStatus] = useState<FocusStatus>(null);

  useEffect(() => {
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function focusTarget(attempt = 0) {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash.startsWith(TARGET_PREFIX)) {
        setStatus(null);
        return;
      }

      const target = document.getElementById(hash);
      if (!target && attempt < 8) {
        retryTimer = setTimeout(() => focusTarget(attempt + 1), 30);
        return;
      }
      if (cancelled) return;

      if (!target) {
        setStatus({
          tone: "warn",
          message: "The selected configuration setting is no longer available.",
        });
        return;
      }

      setStatus({
        tone: "quiet",
        message: "Selected configuration setting focused.",
      });
      target.setAttribute("data-search-highlight", "true");
      target.focus({ preventScroll: true });
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
      highlightTimer = setTimeout(() => {
        target.removeAttribute("data-search-highlight");
      }, 1800);
    }

    const handleHashChange = () => focusTarget();
    focusTarget();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", handleHashChange);
      if (highlightTimer) clearTimeout(highlightTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [pathname]);

  if (!status) return null;
  if (status.tone === "warn") {
    return (
      <p
        role="status"
        className="mb-5 border-y border-border bg-warn-soft px-4 py-2.5 text-sm text-ink"
      >
        {status.message}
      </p>
    );
  }
  return (
    <p role="status" className="sr-only">
      {status.message}
    </p>
  );
}
