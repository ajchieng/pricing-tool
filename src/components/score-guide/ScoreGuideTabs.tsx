import Link from "next/link";

export function ScoreGuideTabs({
  active,
  guidePath,
}: {
  active: "score" | "profitability";
  guidePath: string;
}) {
  const links = [
    {
      href: guidePath,
      label: "Customer score",
      description: "Weights, bands and score-based discount",
    },
    {
      href: `${guidePath}/profitability`,
      label: "Profitability",
      description: "Margin, annual revenue and P&L waterfall mathematics",
    },
  ];
  return (
    <nav
      aria-label="Guide sections"
      className="grid gap-2 rounded-xl bg-panel p-1 sm:grid-cols-2 print:hidden"
    >
      {links.map((link) => {
        const isActive =
          (active === "score" && link.href === guidePath) ||
          (active === "profitability" &&
            link.href === `${guidePath}/profitability`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-4 py-3 transition-colors ${
              isActive
                ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
                : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <span className="block text-sm font-semibold">{link.label}</span>
            <span className="mt-0.5 block text-xs leading-5">
              {link.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
