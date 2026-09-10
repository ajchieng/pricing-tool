import { ScrollableTabBar } from "@/components/ScrollableTabBar";

const TABS = [
  { href: "/admin/personal-loans/products", label: "Products" },
  { href: "/admin/personal-loans/rates", label: "Carded rates" },
  { href: "/admin/personal-loans/score-model", label: "Score model" },
  { href: "/admin/personal-loans/margins", label: "Margins" },
  { href: "/admin/personal-loans/approval", label: "Approval" },
  { href: "/admin/personal-loans/profitability", label: "Profitability" },
];

export function PersonalLoanAdminTabs() {
  return (
    <ScrollableTabBar
      ariaLabel="Personal loan configuration sections"
      tabs={TABS}
    />
  );
}
