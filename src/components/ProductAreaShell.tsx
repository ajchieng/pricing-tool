import type React from "react";
import Link from "next/link";
import { PRODUCT_AREAS, type ProductAreaKey } from "@/lib/product-areas";
import { ProductAreaTabs } from "@/components/ProductAreaTabs";

// Wraps every page of a lending vertical. The data-product attribute re-points
// the brand tokens (globals.css) so the whole section carries the product's
// accent, and the identity strip — a solid brand chip and wordmark — keeps it
// obvious which product area the user is working in.

export function ProductAreaShell({
  area,
  canCreateQuote,
  children,
}: {
  area: ProductAreaKey;
  canCreateQuote: boolean;
  children: React.ReactNode;
}) {
  const product = PRODUCT_AREAS[area];
  const Icon = product.icon;
  return (
    <div data-product={area}>
      <div className="mb-5 flex items-center gap-2 border-b border-border pb-3 sm:hidden print:hidden">
        <Link
          href={`${product.basePath}/`}
          aria-label={`${product.name} overview`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand text-brand-ink"
        >
          <Icon size={16} strokeWidth={2} aria-hidden />
        </Link>
        <ProductAreaTabs area={area} canCreateQuote={canCreateQuote} compact />
      </div>
      <div className="mb-7 hidden border-b border-border pb-3 sm:block print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`${product.basePath}/`}
            className="group -ml-2 inline-flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg px-2"
          >
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-ink"
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-brand-strong group-hover:underline group-hover:underline-offset-4">
                {product.name}
              </span>
              <span className="block truncate text-xs text-faint">
                {product.tagline}
              </span>
            </span>
          </Link>
          <ProductAreaTabs area={area} canCreateQuote={canCreateQuote} />
        </div>
      </div>
      {children}
    </div>
  );
}
