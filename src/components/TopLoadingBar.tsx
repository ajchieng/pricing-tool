"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// The original navigation indicator, with browser-only route completion.
const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 180;
const MAX_PENDING_MS = 15000;

export function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(
      () =>
        setProgress((current) =>
          current >= 88 ? current : current + (88 - current) * 0.18,
        ),
      180,
    );
    return () => window.clearInterval(id);
  }, [visible]);

  useEffect(() => {
    let startedAt = 0;
    let showTimer: number | undefined;
    let finishTimer: number | undefined;
    let resetTimer: number | undefined;
    let maxTimer: number | undefined;
    const clear = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(resetTimer);
      window.clearTimeout(maxTimer);
    };
    const finish = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(maxTimer);
      if (!startedAt) return;
      finishTimer = window.setTimeout(
        () => {
          setProgress(100);
          resetTimer = window.setTimeout(() => {
            setVisible(false);
            setProgress(0);
            startedAt = 0;
          }, 190);
        },
        Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt)),
      );
    };
    finishRef.current = finish;
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const anchor = event.target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        `${url.pathname}${url.search}` ===
          `${window.location.pathname}${window.location.search}`
      )
        return;
      clear();
      showTimer = window.setTimeout(() => {
        startedAt = Date.now();
        setProgress(8);
        setVisible(true);
      }, SHOW_DELAY_MS);
      maxTimer = window.setTimeout(finish, MAX_PENDING_MS);
    };
    document.addEventListener("click", onClick);
    return () => {
      clear();
      document.removeEventListener("click", onClick);
      finishRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    finishRef.current();
  }, [routeKey]);
  return (
    <div
      aria-hidden="true"
      className={`top-loading-bar ${visible ? "top-loading-bar--visible" : ""}`}
    >
      <div
        className="top-loading-bar__fill"
        style={{ transform: `scaleX(${Math.max(0, progress) / 100})` }}
      />
    </div>
  );
}
