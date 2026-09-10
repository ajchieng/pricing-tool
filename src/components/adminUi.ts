import { buttonClass } from "@/components/ui/Button";

// Shared class strings for the dense admin tables. Buttons derive from the
// app-wide button hierarchy so admin doesn't drift from the rest of the UI.
// Tables are flush "ledgers": hairlines above and below, a flat header row
// closed by a strong hairline, no side borders and no fills — structure
// comes from lines and space, not boxes.

export const inp =
  "min-h-[44px] w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors hover:border-muted/50 disabled:bg-panel disabled:text-muted";
export const btn = buttonClass("primary", "sm");
export const btnGhost = buttonClass("secondary", "sm");
export const btnDanger = buttonClass("destructive", "sm");
// Row-level actions: repeated per table row, so they stay quiet. `btn` (solid
// primary) is reserved for the one page-level action; a grid of solid-green
// Save buttons reads as 20 competing primaries.
export const btnRowSave = buttonClass("secondary", "sm");
export const btnRowDanger =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors min-h-[44px] px-3 py-2 text-sm text-alert border border-transparent hover:bg-alert-soft";
export const adminTableShell = "overflow-hidden border-y border-border";
export const adminTableHeader =
  "flex flex-wrap items-start justify-between gap-3 px-3 pb-3 pt-4";
// Keep absolute screen-reader labels inside the scrolling table, so they do
// not enlarge the document viewport when a wide table overflows on mobile.
export const adminTableScroll =
  "relative overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand";
export const responsiveAdminTableScroll =
  "relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand lg:overflow-x-auto";
export const responsiveAdminTable = "block w-full text-sm lg:table";
export const responsiveAdminTableHead =
  "hidden border-b border-border-strong lg:table-header-group";
export const responsiveAdminTableBody =
  "block divide-y divide-border lg:table-row-group";
export const responsiveAdminTableRow =
  "grid gap-4 px-3 py-4 sm:grid-cols-2 lg:table-row lg:p-0";
export const responsiveAdminTableCell =
  "grid min-w-0 gap-1 p-0 align-top text-ink lg:table-cell lg:px-3 lg:py-2.5";
export const responsiveAdminMobileLabel =
  "text-xs font-medium text-muted lg:hidden";
export const adminTableTitle = "text-sm font-semibold text-ink";
export const adminTableDescription = "mt-1 max-w-prose text-sm text-muted";
export const th =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted";
export const td = "px-3 py-2.5 align-top text-ink";
export const rowActions = "flex flex-wrap gap-2";
