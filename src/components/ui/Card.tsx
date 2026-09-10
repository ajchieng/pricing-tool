import type React from "react";

// Ruled content group: a hairline-topped section — never a tinted or
// bordered box. Grouping comes from the rule, the title row and space, so
// grids of these read as columns of one sheet rather than card decks. When a
// section is placed inside an already-framed surface pass `bare` to drop the
// chrome and let it read as a plain section.

export function Card({
  title,
  titleAs: TitleTag = "h3",
  action,
  padding = "md",
  bare = false,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4";
  action?: React.ReactNode;
  padding?: "sm" | "md";
  bare?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const chrome = bare
    ? ""
    : `border-t border-border ${padding === "sm" ? "pt-3.5" : "pt-4"}`;
  return (
    <section className={`${chrome} ${className}`.trim()}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <TitleTag className="text-sm font-semibold tracking-[-0.01em] text-ink">
              {title}
            </TitleTag>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
