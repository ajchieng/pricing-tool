"use client";

import Link from "next/link";
import { BookOpen, FilePlus, FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { PRODUCT_AREAS, type ProductAreaKey } from "@/lib/product-areas";

export function ProductAreaTabs({
  area,
  canCreateQuote,
  compact = false,
}: {
  area: ProductAreaKey;
  canCreateQuote: boolean;
  compact?: boolean;
}) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const product = PRODUCT_AREAS[area];
  const items = [
    {
      href: product.basePath,
      label: "Quotes",
      icon: FileText,
      active:
        pathname.startsWith(product.basePath) &&
        pathname !== product.newQuotePath &&
        !pathname.startsWith(product.guidePath),
    },
    ...(canCreateQuote
      ? [
          {
            href: product.newQuotePath,
            label: "New quote",
            icon: FilePlus,
            active: pathname === product.newQuotePath,
          },
        ]
      : []),
    {
      href: product.guidePath,
      label: "Guide",
      icon: BookOpen,
      active: pathname.startsWith(product.guidePath),
    },
  ];

  return (
    <nav
      aria-label={`${product.shortName} navigation`}
      className={`flex items-center gap-1 overflow-x-auto rounded-lg bg-panel p-1 ${
        compact ? "min-w-0 flex-1" : "w-full sm:w-auto"
      }`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={`${item.href}/`}
            aria-current={item.active ? "page" : undefined}
            className={`inline-flex min-h-[44px] shrink-0 items-center rounded-md font-medium transition-colors active:translate-y-px ${
              compact ? "gap-1.5 px-2 text-[13px]" : "gap-2 px-3 text-sm"
            } ${
              item.active
                ? "bg-surface text-brand-strong"
                : "text-muted hover:bg-surface/70 hover:text-ink"
            }`}
          >
            <Icon size={15} strokeWidth={1.8} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
