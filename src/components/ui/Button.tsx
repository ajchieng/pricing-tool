import type React from "react";

// Button hierarchy for the whole app. One primary action per view region;
// links that should look like buttons use buttonClass() with <Link>.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md";

// Flat, crisp buttons: the solid primary is the only filled control; the rest
// are hairline or quiet so the workspace stays unboxed.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-ink border border-transparent hover:bg-brand-strong active:translate-y-px",
  secondary:
    "bg-surface/80 text-ink border border-border-strong hover:bg-panel active:translate-y-px",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-panel hover:text-ink",
  destructive:
    "bg-transparent text-alert border border-alert/30 hover:bg-alert-soft active:translate-y-px",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-3 py-2 text-sm",
  md: "min-h-[44px] px-4 py-2 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[color,background-color,border-color,transform] duration-150 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${extra}`.trim();
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
