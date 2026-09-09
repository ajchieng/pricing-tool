import Link from "next/link";
import { X } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import {
  searchParamsFor,
  searchResetParamsFor,
  type SearchFilters,
} from "@/lib/market/search/params";
import { labelFromCode } from "@/lib/market/search/format";
import { marketSearchHref } from "@/lib/market/verticals";

type FilterChanges = Partial<SearchFilters>;

function activeItems(filters: SearchFilters): Array<{
  key: string;
  label: string;
  changes: FilterChanges;
}> {
  const items: Array<{
    key: string;
    label: string;
    changes: FilterChanges;
  }> = [];
  if (filters.q)
    items.push({ key: "q", label: `“${filters.q}”`, changes: { q: "" } });
  if (filters.purpose)
    items.push({
      key: "purpose",
      label: labelFromCode(filters.purpose),
      changes: { purpose: null },
    });
  if (filters.rateType)
    items.push({
      key: "rateType",
      label: labelFromCode(filters.rateType),
      changes: { rateType: null },
    });
  if (filters.repayment)
    items.push({
      key: "repayment",
      label: labelFromCode(filters.repayment),
      changes: { repayment: null },
    });
  if (filters.lvr !== null)
    items.push({
      key: "lvr",
      label: `${filters.lvr}% LVR`,
      changes: { lvr: null },
    });
  if (filters.fixedMonths !== null)
    items.push({
      key: "fixedMonths",
      label: `${filters.fixedMonths} month fixed period`,
      changes: { fixedMonths: null },
    });
  if (filters.offset)
    items.push({ key: "offset", label: "Offset", changes: { offset: false } });
  if (filters.redraw)
    items.push({ key: "redraw", label: "Redraw", changes: { redraw: false } });
  if (filters.extraRepayments)
    items.push({
      key: "extraRepayments",
      label: "Extra repayments",
      changes: { extraRepayments: false },
    });
  if (filters.relationshipManagement)
    items.push({
      key: "relationshipManagement",
      label: "Relationship management",
      changes: { relationshipManagement: false },
    });
  if (filters.facilityCategory)
    items.push({
      key: "facilityCategory",
      label: labelFromCode(filters.facilityCategory),
      changes: { facilityCategory: null },
    });
  if (filters.noOngoingFee)
    items.push({
      key: "noOngoingFee",
      label: "No periodic fee listed",
      changes: { noOngoingFee: false },
    });
  return items;
}

export function ActiveSearchFilters({ filters }: { filters: SearchFilters }) {
  const items = activeItems(filters);
  if (!items.length) return null;

  return (
    <nav
      aria-label="Active search filters"
      className="market-print-hide mt-3 flex flex-wrap items-center gap-2"
    >
      <span className="mr-1 text-xs font-semibold text-muted">
        Active filters
      </span>
      {items.map((item) => (
        <Link
          key={item.key}
          href={marketSearchHref(
            filters.vertical,
            searchParamsFor(filters, {
              ...item.changes,
              page: 1,
              productId: null,
            }),
            "#results-heading",
          )}
          aria-label={`Remove ${item.label} filter`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-xs font-semibold text-brand-strong transition-colors hover:bg-brand-tint hover:text-ink"
        >
          {item.label}
          <X className="size-3.5" aria-hidden />
        </Link>
      ))}
      <Link
        href={marketSearchHref(
          filters.vertical,
          searchResetParamsFor(filters),
          "#results-heading",
        )}
        className={buttonClass("ghost", "sm")}
      >
        Clear search filters
      </Link>
    </nav>
  );
}
