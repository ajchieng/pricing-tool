export function formatRate(value: number | null): string {
  return value === null ? "Not supplied" : `${value.toFixed(2)}%`;
}

export function displayLenderName(
  brandName: string | null,
  sourceBrandName: string | null,
): string {
  return brandName ?? sourceBrandName ?? "Unknown lender";
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "Not supplied";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function labelFromCode(value: string | null): string {
  if (!value) return "All applicable";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatFrequency(value: string | null): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    P1D: "Daily",
    P1W: "Weekly",
    P1M: "Monthly",
    P3M: "Quarterly",
    P6M: "Half-yearly",
    P1Y: "Annual",
  };
  return labels[value.toUpperCase()] ?? labelFromCode(value);
}

export function formatDate(value: Date | null): string {
  if (!value) return "Not yet refreshed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function relativeFreshness(value: Date | null): string {
  if (!value) return "No successful refresh";
  const differenceHours = Math.max(
    0,
    (Date.now() - value.getTime()) / 3_600_000,
  );
  if (differenceHours < 1) return "Fetched within the hour";
  if (differenceHours < 24)
    return `Fetched ${Math.floor(differenceHours)} hours ago`;
  const days = Math.floor(differenceHours / 24);
  return `Fetched ${days} day${days === 1 ? "" : "s"} ago`;
}

export function safeExternalHref(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
