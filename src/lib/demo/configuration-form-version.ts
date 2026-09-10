/** Private form metadata preserves the policy version seen when a draft was edited. */
export const CONFIGURATION_FORM_VERSION_FIELD = "__configurationVersion";

export function expectedConfigurationVersion(
  data: FormData,
  fallback: number,
): number {
  const captured = data.get(CONFIGURATION_FORM_VERSION_FIELD);
  if (captured == null) return fallback;
  const value = Number(captured);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(
      "This configuration draft has an invalid version. Reload the page before saving.",
    );
  }
  return value;
}
