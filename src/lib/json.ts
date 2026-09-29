/**
 * SQLite has no native JSON column type, so structured fields are stored as
 * TEXT holding a JSON document. These two helpers are the only place that
 * knows that — everything else works with real objects.
 */

/** Serialize a value for a JSON-backed TEXT column. */
export function packJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/**
 * Parse a JSON-backed TEXT column. Returns `fallback` when the column is
 * empty or holds malformed JSON, so a bad row degrades to a default instead
 * of throwing mid-render.
 */
export function unpackJson<T>(value: string | null | undefined, fallback: T): T {
  if (value == null || value === "") return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}
