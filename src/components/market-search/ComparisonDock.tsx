"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  searchParamsFor,
  toggleComparisonParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import { marketSearchHref } from "@/lib/market/verticals";

interface ComparisonDockItem {
  id: string;
  name: string;
}

export function ComparisonDock({
  comparison,
  filters,
}: {
  comparison: ComparisonDockItem[];
  filters: SearchFilters;
}) {
  const [comparisonVisible, setComparisonVisible] = useState(false);

  useEffect(() => {
    const comparisonElement = document.querySelector("#market-comparison");
    if (!comparisonElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => setComparisonVisible(entry.isIntersecting),
      { threshold: 0.04 },
    );
    observer.observe(comparisonElement);
    return () => observer.disconnect();
  }, []);

  if (!comparison.length || comparisonVisible) return null;
  const clearHref = marketSearchHref(
    filters.vertical,
    searchParamsFor(filters, { compareIds: [] }),
    "#results-heading",
  );

  return (
    <aside
      aria-label="Selected comparison products"
      className="market-comparison-dock market-print-hide fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[940px] rounded-xl bg-rail text-rail-ink shadow-[var(--shadow-md)] lg:left-[248px]"
    >
      <div className="rail-chrome flex min-h-16 items-center gap-3 px-3 py-2 sm:px-4">
        <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-rail-active text-brand-glow sm:grid">
          <Check className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Comparison: <span className="tnum">{comparison.length}</span> of 3
            selected
          </p>
          <div className="mt-0.5 hidden flex-wrap gap-x-3 text-xs text-rail-muted sm:flex">
            {comparison.map((product) => (
              <a
                key={product.id}
                href={marketSearchHref(
                  filters.vertical,
                  toggleComparisonParamsFor(filters, product.id),
                  "#results-heading",
                )}
                className="inline-flex min-h-6 items-center gap-1 hover:text-rail-ink"
                aria-label={`Remove ${product.name} from comparison`}
              >
                <span className="max-w-44 truncate">{product.name}</span>
                <X className="size-3" aria-hidden />
              </a>
            ))}
          </div>
        </div>
        <a
          href={clearHref}
          aria-label="Clear comparison"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rail-border px-2.5 text-xs font-semibold text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-ink sm:min-h-11 sm:px-3"
        >
          <X className="size-4" aria-hidden />
          Clear
        </a>
        {comparison.length >= 2 ? (
          <a
            href="#market-comparison"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-brand-glow px-3 text-sm font-semibold text-brand-deep hover:bg-rail-accent sm:min-h-11"
          >
            View comparison
            <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : (
          <span className="inline-flex min-h-12 shrink-0 items-center rounded-lg border border-rail-border px-3 text-xs font-semibold text-rail-muted sm:min-h-11">
            Choose another
          </span>
        )}
      </div>
    </aside>
  );
}
