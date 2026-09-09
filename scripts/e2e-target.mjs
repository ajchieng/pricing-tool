/** Resolve an explicitly requested public origin without accepting credentials or URL payloads. */
export function remoteTestOrigin(value = process.env.DEMO_TEST_BASE_URL) {
  if (value === undefined) return undefined;
  const invalid = () =>
    new Error(
      "DEMO_TEST_BASE_URL must be an HTTPS origin, such as https://your-demo.example, without credentials, a path, query or fragment.",
    );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw invalid();
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw invalid();
  return url.origin;
}
