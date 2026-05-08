/**
 * Lightweight DuckDuckGo HTML search. Mirrors the unwrap logic used by
 * `shopify-finder.ts` so we don't take a dependency on a paid SerpAPI here.
 */

const UA = "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)";

export async function ddgSearch(
  query: string,
  take: number,
): Promise<string[]> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": UA, Accept: "text/html" } },
  );
  if (!res.ok) return [];
  const html = await res.text();

  const raw = [
    ...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi),
  ].map((m) => m[1]);

  const urls: string[] = [];
  for (const href of raw) {
    const decoded = unwrapDdg(href);
    if (decoded) urls.push(decoded);
    if (urls.length >= take) break;
  }
  return urls;
}

function unwrapDdg(href: string): string | null {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const wrapped = u.searchParams.get("uddg");
    if (wrapped) return decodeURIComponent(wrapped);
    return u.protocol.startsWith("http") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function safeOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
