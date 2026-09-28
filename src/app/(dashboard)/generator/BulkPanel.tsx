"use client";

import { useEffect, useState } from "react";

type Result = {
  queued: number;
  ids: string[];
  skipped: { url: string; reason: string }[];
  invalid: string[];
};

/**
 * Paste a catalogue, queue the lot.
 *
 * The single-URL form above this is for making one video deliberately. This is
 * for the store with two hundred SKUs and no content team — the case the
 * one-at-a-time flow can't serve at all.
 */
export function BulkPanel() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) =>
        setClients(
          (d.clients ?? [])
            .filter((c: { archived: boolean }) => !c.archived)
            .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        ),
      )
      .catch(() => setClients([]));
  }, [open]);

  const count = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  async function submit() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await fetch("/api/ads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: text,
          ...(clientId ? { clientId } : {}),
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.detail ?? body.error ?? `HTTP ${r.status}`);
      setResult(body as Result);
      setText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-[13px] text-ink-mid underline-offset-4 transition hover:text-ink-hi hover:underline"
      >
        Or paste your whole catalogue →
      </button>
    );
  }

  return (
    <div className="surface-elevated mt-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Bulk queue
          </div>
          <h3 className="mt-1.5 text-[18px] font-semibold tracking-tight text-ink-hi">
            One video per product, up to 50 at a time
          </h3>
          <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink-mid">
            Paste product URLs — one per line. They run one after another so
            your queue doesn&apos;t stall, and you can close this page.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-[13px] text-ink-lo hover:text-ink-hi"
        >
          Close
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        spellCheck={false}
        placeholder={"yourstore.com/products/kettle\nyourstore.com/products/mug\nyourstore.com/products/grinder"}
        className="input mt-4 resize-y font-mono text-[13px] leading-relaxed"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-ink-dim">
          {count} {count === 1 ? "line" : "lines"}
          {count > 50 ? " · first 50 will run" : ""}
        </span>

        {clients.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
              For
            </span>
            <select
              className="input max-w-[220px] py-1.5 text-[13px]"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">My own store</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          className="btn-primary ml-auto"
          onClick={submit}
          disabled={busy || count === 0}
        >
          {busy ? "Queueing…" : `Queue ${Math.min(count, 50) || ""} videos`}
        </button>
      </div>

      {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-line-1 bg-base-3/50 p-4">
          <p className="text-[14px] font-medium text-ink-hi">
            {result.queued} queued. They&apos;ll appear on your dashboard as
            they finish.
          </p>

          {result.skipped.length > 0 && (
            <div className="mt-3">
              <p className="text-[13px] text-warn">
                {result.skipped.length} skipped — {result.skipped[0]?.reason}
              </p>
            </div>
          )}

          {result.invalid.length > 0 && (
            <div className="mt-2">
              <p className="text-[13px] text-ink-mid">
                {result.invalid.length} line
                {result.invalid.length === 1 ? "" : "s"} didn&apos;t look like a
                URL:
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.invalid.slice(0, 4).map((u) => (
                  <li key={u} className="truncate font-mono text-[11px] text-ink-dim">
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
