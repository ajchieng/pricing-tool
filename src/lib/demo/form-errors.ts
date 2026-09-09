import { ZodError } from "zod";

function label(field: PropertyKey | undefined) {
  if (field == null) return "Quote";
  const value = String(field).replace(/([a-z])([A-Z])/g, "$1 $2");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function demoFormError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .slice(0, 3)
      .map((issue) => `${label(issue.path[0])}: ${issue.message}`)
      .join(" ");
  }
  return error instanceof Error
    ? error.message
    : "Could not calculate this scenario. Check the inputs and retry.";
}

export function focusDemoIssue<Section extends string>(
  error: unknown,
  options: {
    sectionFields: Record<Section, readonly string[]>;
    inputIds: Record<string, string>;
    openSection: (section: Section) => void;
  },
) {
  if (!(error instanceof ZodError)) return;
  const field = error.issues[0]?.path.find((part) => typeof part === "string");
  if (typeof field !== "string") return;
  const entry = (
    Object.entries(options.sectionFields) as [Section, readonly string[]][]
  ).find(([, fields]) => fields.includes(field));
  if (entry) options.openSection(entry[0]);
  requestAnimationFrame(() => {
    const input = document.getElementById(options.inputIds[field]);
    input?.focus();
    input?.scrollIntoView({ block: "center", behavior: "auto" });
  });
}
