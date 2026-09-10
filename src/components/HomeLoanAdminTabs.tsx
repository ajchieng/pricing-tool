import { ScrollableTabBar } from "@/components/ScrollableTabBar";

const TABS = [
  { href: "/admin/home-loans/products", label: "Products" },
  { href: "/admin/home-loans/rates", label: "Carded rates" },
  { href: "/admin/home-loans/rules", label: "Discount rules" },
  { href: "/admin/home-loans/score-model", label: "Score model" },
  { href: "/admin/home-loans/approval", label: "Approval" },
  { href: "/admin/home-loans/margins", label: "Margins" },
  { href: "/admin/home-loans/profitability", label: "Profit defaults" },
];

export function HomeLoanAdminTabs() {
  return (
    <ScrollableTabBar
      ariaLabel="Home loan configuration sections"
      tabs={TABS}
    />
  );
}
