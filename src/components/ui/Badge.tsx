import type React from "react";
import { TONE, type Tone } from "@/lib/tones";

// Status badge: soft tinted pill with a dot and a text label. The label is the
// meaning; colour only reinforces it.

export function Badge({
  tone = "muted",
  size = "md",
  className = "",
  children,
  ...props
}: {
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "className">) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${TONE[tone].soft} ${sizeClasses} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
      />
      {children}
    </span>
  );
}
