"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MESSAGE =
  "You have unsaved quote changes. Leave this page and discard them?";

export function useUnsavedChangesGuard(message = DEFAULT_MESSAGE) {
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);
  const markClean = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (
        anchor.target ||
        anchor.hasAttribute("download") ||
        anchor.dataset.discardUnsaved === "true"
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const currentWithoutHash = `${window.location.pathname}${window.location.search}`;
      const destinationWithoutHash = `${destination.pathname}${destination.search}`;
      if (destinationWithoutHash === currentWithoutHash) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [message]);

  return { markDirty, markClean };
}
