"use client";

import { useEffect } from "react";

export function SearchShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches(
        "input, textarea, select, [contenteditable='true']",
      );
      if (event.key === "/" && !editing) {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>("#market-loan-search")
          ?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.documentElement.dataset.marketSearchShortcutReady = "true";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      delete document.documentElement.dataset.marketSearchShortcutReady;
    };
  }, []);

  return null;
}
