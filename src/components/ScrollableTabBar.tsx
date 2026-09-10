"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActiveTabScroll } from "@/components/useActiveTabScroll";

export type ScrollableTabItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export function ScrollableTabBar({
  ariaLabel,
  tabs,
}: {
  ariaLabel: string;
  tabs: ScrollableTabItem[];
}) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const {
    activeTabRef,
    scrollContainerRef,
    isOverflowing,
    canScrollLeft,
    canScrollRight,
    scrollByPage,
  } = useActiveTabScroll(pathname);

  return (
    <nav
      aria-label={ariaLabel}
      className="mb-6 flex w-full max-w-full items-stretch border-b border-border"
    >
      {isOverflowing ? (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel.toLowerCase()} left`}
          disabled={!canScrollLeft}
          onClick={() => scrollByPage(-1)}
          className="grid min-h-11 min-w-11 shrink-0 place-items-center text-muted transition-colors hover:bg-panel hover:text-ink disabled:cursor-default disabled:text-faint disabled:opacity-40"
        >
          <ChevronLeft size={16} strokeWidth={1.9} aria-hidden />
        </button>
      ) : null}
      <div
        ref={scrollContainerRef}
        className="relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max gap-1">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                ref={active ? activeTabRef : undefined}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-t-md border-b-2 px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:bg-panel hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {isOverflowing ? (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel.toLowerCase()} right`}
          disabled={!canScrollRight}
          onClick={() => scrollByPage(1)}
          className="grid min-h-11 min-w-11 shrink-0 place-items-center text-muted transition-colors hover:bg-panel hover:text-ink disabled:cursor-default disabled:text-faint disabled:opacity-40"
        >
          <ChevronRight size={16} strokeWidth={1.9} aria-hidden />
        </button>
      ) : null}
    </nav>
  );
}
