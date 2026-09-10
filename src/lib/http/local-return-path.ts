const LOCAL_RETURN_ORIGIN = "https://local.invalid";
const UNSAFE_RETURN_PATH_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

function hasUnsafeDecodedPath(value: string): boolean {
  let decoded = value.split(/[?#]/, 1)[0];
  for (let depth = 0; depth < 5; depth += 1) {
    if (
      decoded.startsWith("//") ||
      UNSAFE_RETURN_PATH_CHARACTERS.test(decoded)
    ) {
      return true;
    }
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return false;
      decoded = next;
    } catch {
      return true;
    }
  }
  return true;
}

export function localReturnPathOrNull(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    UNSAFE_RETURN_PATH_CHARACTERS.test(value) ||
    hasUnsafeDecodedPath(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, LOCAL_RETURN_ORIGIN);
    if (parsed.origin !== LOCAL_RETURN_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function safeLocalReturnPath(value: unknown, fallback = "/"): string {
  return localReturnPathOrNull(value) ?? localReturnPathOrNull(fallback) ?? "/";
}
