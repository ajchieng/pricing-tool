import { ScrollableTabBar } from "@/components/ScrollableTabBar";

const TABS = [
  { href: "/admin/commercial-loans/products", label: "Products" },
  { href: "/admin/commercial-loans/rates", label: "Base rates" },
  { href: "/admin/commercial-loans/score-model", label: "Score model" },
  { href: "/admin/commercial-loans/margins", label: "Margins" },
  { href: "/admin/commercial-loans/approval", label: "Approval" },
  { href: "/admin/commercial-loans/profitability", label: "Profitability" },
];

export function CommercialLoanAdminTabs() {
  return (
    <ScrollableTabBar
      ariaLabel="Commercial loan configuration sections"
      tabs={TABS}
    />
  );
}
