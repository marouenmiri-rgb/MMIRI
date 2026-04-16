"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cmd = {
  id: string;
  label: string;
  hint: string;
  run: (router: ReturnType<typeof useRouter>) => void;
};

const STATIC: Cmd[] = [
  { id: "nav-dashboard", label: "Go to dashboard", hint: "Overview · recent ads", run: (r) => r.push("/dashboard") },
  { id: "nav-generator", label: "Open the ad generator", hint: "Paste a product URL", run: (r) => r.push("/generator") },
  { id: "nav-autopilot", label: "Open autopilot", hint: "Connect socials · schedule posts", run: (r) => r.push("/distribution") },
  { id: "nav-revenue", label: "Open revenue desk", hint: "Attributed revenue · leaderboard · live feed", run: (r) => r.push("/revenue") },
  { id: "nav-leads", label: "Open leads", hint: "Shopify stores you've found", run: (r) => r.push("/leads") },
  { id: "nav-campaigns", label: "Open campaigns", hint: "Outreach sequences", run: (r) => r.push("/campaigns") },
  { id: "nav-settings", label: "Open settings", hint: "Workspace, billing, integrations", run: (r) => r.push("/settings") },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const looksLikeUrl = /^https?:\/\//i.test(url);
  const filtered = STATIC.filter((c) =>
    c.label.toLowerCase().includes(q.toLowerCase()),
  );

  async function generate() {
    if (!looksLikeUrl) return;
    setBusy(true);
    try {
      const r = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });
      if (r.ok) {
        const { id } = await r.json();
        router.push(`/generator?id=${id}`);
        setOpen(false);
        return;
      }
      router.push(`/generator?url=${encodeURIComponent(url)}`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-base-0/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl2 border border-line-2 bg-base-1 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line-1 px-4 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            ⌘K
          </span>
          <input
            autoFocus
            value={url || q}
            onChange={(e) => {
              const v = e.target.value;
              if (/^https?:\/\//i.test(v)) {
                setUrl(v);
                setQ("");
              } else {
                setQ(v);
                setUrl("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && looksLikeUrl) generate();
            }}
            placeholder="Paste a product URL, or search commands…"
            className="flex-1 bg-transparent font-mono text-sm text-ink-hi placeholder:text-ink-dim outline-none"
          />
          <span className="kbd">esc</span>
        </div>

        {looksLikeUrl ? (
          <button
            onClick={generate}
            disabled={busy}
            className="flex w-full items-center justify-between border-b border-line-1 px-4 py-4 text-left hover:bg-base-2 disabled:opacity-60"
          >
            <div>
              <div className="font-display text-base text-ink-hi">
                {busy ? "Starting pipeline…" : "Generate ad from URL"}
              </div>
              <div className="mt-0.5 truncate font-mono text-xs text-ink-mid">{url}</div>
            </div>
            <span className="kbd">↵</span>
          </button>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto p-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    c.run(router);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl2 px-3 py-2.5 text-left hover:bg-base-2"
                >
                  <div>
                    <div className="text-sm text-ink-hi">{c.label}</div>
                    <div className="text-xs text-ink-mid">{c.hint}</div>
                  </div>
                  <span className="kbd">↵</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-dim">
                No matches
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-line-1 px-4 py-2 text-[11px] text-ink-dim">
          <span>
            Tip: paste a product URL to generate without leaving the palette
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </span>
        </div>
      </div>
    </div>
  );
}
