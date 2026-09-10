"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  activeTabScrollTarget,
  horizontalScrollState,
  pagedScrollDistance,
} from "@/components/active-tab-scroll";

/**
 * Keeps the active item visible inside its own horizontal tab scroller.
 * Element.scrollIntoView also scrolls the viewport in Chromium when a wide
 * table exists later on the page, so constrain the movement to the tab strip.
 */
export function useActiveTabScroll(dependency: string) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const next = horizontalScrollState(container);
    setIsOverflowing(next.isOverflowing);
    setCanScrollLeft(next.canScrollLeft);
    setCanScrollRight(next.canScrollRight);
  }, []);

  const revealActiveTab = useCallback(() => {
    const container = scrollContainerRef.current;
    const activeTab = activeTabRef.current;
    if (!container || !activeTab) return;

    const target = activeTabScrollTarget({
      tabLeft: activeTab.offsetLeft,
      tabWidth: activeTab.offsetWidth,
      scrollLeft: container.scrollLeft,
      clientWidth: container.clientWidth,
    });
    if (target != null) {
      container.scrollTo({ left: target, behavior: "auto" });
    }
    updateScrollState();
  }, [updateScrollState]);

  useEffect(() => {
    revealActiveTab();
  }, [dependency, revealActiveTab]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(revealActiveTab);
    observer?.observe(container);
    container.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => {
      observer?.disconnect();
      container.removeEventListener("scroll", updateScrollState);
    };
  }, [revealActiveTab, updateScrollState]);

  function scrollByPage(direction: -1 | 1) {
    const container = scrollContainerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollBy({
      left: pagedScrollDistance(container.clientWidth, direction),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return {
    activeTabRef,
    scrollContainerRef,
    isOverflowing,
    canScrollLeft,
    canScrollRight,
    scrollByPage,
  };
}
