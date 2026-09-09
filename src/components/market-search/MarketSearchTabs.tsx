"use client";

import Link from "next/link";
import type { DemoArea } from "@/lib/demo/types";
import { MARKET_VERTICALS, marketSearchHref } from "@/lib/market/verticals";

export function MarketSearchTabs({ area }: { area: DemoArea }) {
  return (
    <nav
      aria-label="Market Search lending areas"
      className="market-print-hide -mx-4 mb-7 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max border-b border-border">
        {Object.entries(MARKET_VERTICALS).map(([vertical, config]) => {
          const current = vertical === area;
          return (
            <Link
              key={vertical}
              href={marketSearchHref(vertical as DemoArea)}
              aria-current={current ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold transition-colors ${
                current
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:border-border-strong hover:text-ink"
              }`}
            >
              {config.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
