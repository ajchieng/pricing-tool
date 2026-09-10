import { ScrollableTabBar } from "@/components/ScrollableTabBar";

const TABS = [
  { href: "/admin", label: "Admin overview", exact: true },
  { href: "/admin/home-loans", label: "Home loan policy" },
  { href: "/admin/personal-loans", label: "Personal loan policy" },
  { href: "/admin/commercial-loans", label: "Commercial loan policy" },
  { href: "/admin/market-search", label: "Market Search" },
  { href: "/admin/global-assumptions", label: "Capital allocation" },
  { href: "/admin/display", label: "Workspace display" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/governance", label: "Approval queue" },
  { href: "/admin/audit", label: "Audit trail" },
];

// Underline tab bar for the config sections. Scrolls horizontally instead of
// wrapping so the row stays one line tall on any width.

export function AdminTabs() {
  return <ScrollableTabBar ariaLabel="Admin sections" tabs={TABS} />;
}
