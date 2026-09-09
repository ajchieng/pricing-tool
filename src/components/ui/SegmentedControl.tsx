"use client";

// Segmented control for small exclusive choices (loan purpose, rate type,
// $ / % units). Faster to read and operate than a two-option dropdown.

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "sm",
  fullWidth = false,
  className = "",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  ariaLabel: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}) {
  const sizeClasses =
    size === "sm" ? "min-h-[44px] px-3 text-xs" : "min-h-[44px] px-3.5 text-sm";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-lg bg-panel p-0.5 ${
        fullWidth ? "flex w-full" : ""
      } ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-form-mutation
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            title={option.title}
            aria-pressed={active}
            className={`min-w-[44px] rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${sizeClasses} ${
              fullWidth ? "flex-1" : ""
            } ${
              active
                ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
