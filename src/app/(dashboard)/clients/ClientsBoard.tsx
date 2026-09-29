"use client";

import { useEffect, useState } from "react";

type ClientRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  reportToken: string;
  accentColor: string;
  retainerCents: number;
  currency: string;
  archived: boolean;
  adsTotal: number;
  adsReady: number;
  postsPublished: number;
  clicks: number;
  revenueCents: number;
  returnMultiple: number | null;
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function ClientsBoard() {
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/clients");
      const d = await r.json();
      setRows(d.clients ?? []);
    } catch {
      setRows([]);
      setErr("Couldn't load clients.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  const active = (rows ?? []).filter((c) => !c.archived);
  const mrrCents = active.reduce((s, c) => s + c.retainerCents, 0);
  const revenueCents = active.reduce((s, c) => s + c.revenueCents, 0);

  async function copyReport(c: ClientRow) {
    const url = `${window.location.origin}/r/${c.reportToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(c.id);
      setTimeout(() => setCopied((v) => (v === c.id ? null : v)), 1800);
    } catch {
      window.prompt("Copy this report link:", url);
    }
  }

  return (
    <div className="space-y-6 p-8">
      {/* Book of business */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Clients" value={String(active.length)} hint="active" />
        <Tile
          label="Monthly retainers"
          value={money(mrrCents)}
          hint="recurring, before revenue share"
          accent
        />
        <Tile
          label="Revenue you drove"
          value={money(revenueCents)}
          hint="attributed across all clients"
          mint
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Client roster
          </div>
          <h2 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink-hi">
            Who you run ads for
          </h2>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Add client
        </button>
      </div>

      {err && (
        <div className="card border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {err}
        </div>
      )}

      {rows === null ? (
        <div className="card p-10 text-center text-sm text-ink-lo">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-[20px] font-semibold text-ink-hi">
            No clients yet.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-mid">
            Add a store you run ads for, set what they pay you, and every ad you
            generate for them rolls up into a report you can send — with the
            return on their retainer on it.
          </p>
          <button className="btn-primary mt-5" onClick={() => setAdding(true)}>
            Add your first client
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className={`card p-5 ${c.archived ? "opacity-55" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: c.accentColor }}
                    />
                    <h3 className="truncate text-[17px] font-semibold text-ink-hi">
                      {c.name}
                    </h3>
                    {c.archived && (
                      <span className="pill bg-base-4 text-ink-lo">Archived</span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-ink-lo">
                    {c.retainerCents > 0
                      ? `${money(c.retainerCents, c.currency)}/mo retainer`
                      : "No retainer set"}
                    {c.websiteUrl
                      ? ` · ${c.websiteUrl.replace(/^https?:\/\//, "")}`
                      : ""}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button className="btn-ghost" onClick={() => copyReport(c)}>
                    {copied === c.id ? "Link copied" : "Copy report link"}
                  </button>
                  <a
                    className="btn-ink"
                    href={`/r/${c.reportToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preview →
                  </a>
                  <button
                    className="btn-ink"
                    onClick={() => setEditing(editing === c.id ? null : c.id)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Attributed" value={money(c.revenueCents, c.currency)} mint />
                <Stat
                  label="Return"
                  value={
                    c.returnMultiple !== null
                      ? `${c.returnMultiple.toFixed(1)}×`
                      : "—"
                  }
                />
                <Stat label="Posts live" value={String(c.postsPublished)} />
                <Stat label="Ads made" value={`${c.adsReady}/${c.adsTotal}`} />
              </div>

              {editing === c.id && (
                <EditRow
                  client={c}
                  onDone={() => {
                    setEditing(null);
                    load();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddClient
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function Tile({
  label,
  value,
  hint,
  accent,
  mint,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  mint?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {label}
      </div>
      <div
        className={`mt-1.5 text-[28px] font-semibold tabular-nums tracking-tight ${
          mint ? "text-mint" : accent ? "text-volt" : "text-ink-hi"
        }`}
      >
        {value}
      </div>
      <div className="text-[12px] text-ink-lo">{hint}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  mint,
}: {
  label: string;
  value: string;
  mint?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div
        className={`mt-0.5 text-[17px] font-semibold tabular-nums ${
          mint ? "text-mint" : "text-ink-hi"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EditRow({
  client,
  onDone,
}: {
  client: ClientRow;
  onDone: () => void;
}) {
  const [retainer, setRetainer] = useState(String(client.retainerCents / 100));
  const [color, setColor] = useState(client.accentColor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line-1 bg-base-3/40 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[160px] flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
            Monthly retainer (USD)
          </span>
          <input
            className="input mt-1.5"
            type="number"
            min={0}
            step={50}
            value={retainer}
            onChange={(e) => setRetainer(e.target.value)}
          />
        </label>
        <label>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
            Report colour
          </span>
          <input
            className="mt-1.5 block h-[42px] w-[64px] cursor-pointer rounded-xl border border-line-2 bg-base-1 p-1"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() =>
            patch({ retainerUsd: Number(retainer) || 0, accentColor: color })
          }
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line-1 pt-3">
        <button
          className="btn-ink"
          disabled={busy}
          onClick={() => patch({ archived: !client.archived })}
        >
          {client.archived ? "Restore" : "Archive"}
        </button>
        <button
          className="btn-ink"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Issue a new report link? The current link stops working immediately.",
              )
            ) {
              patch({ rotateToken: true });
            }
          }}
        >
          New report link
        </button>
      </div>

      {err && <div className="text-[13px] text-danger">{err}</div>}
    </div>
  );
}

function AddClient({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [retainer, setRetainer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          websiteUrl: websiteUrl || undefined,
          contactEmail: contactEmail || undefined,
          retainerUsd: Number(retainer) || 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="popover w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[20px] font-semibold tracking-tight text-ink-hi">
          Add a client
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
          Ads you generate for this client roll up into a report you can send.
        </p>

        <div className="mt-5 space-y-3">
          <Field label="Client name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ember Coffee Co."
              autoFocus
            />
          </Field>
          <Field label="Store URL (optional)">
            <input
              className="input"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://embercoffee.com"
            />
          </Field>
          <Field label="Contact email (optional)">
            <input
              className="input"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ops@embercoffee.com"
            />
          </Field>
          <Field label="Monthly retainer, USD (optional)">
            <input
              className="input"
              type="number"
              min={0}
              step={50}
              value={retainer}
              onChange={(e) => setRetainer(e.target.value)}
              placeholder="1500"
            />
          </Field>
        </div>

        {err && <div className="mt-3 text-[13px] text-danger">{err}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ink" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={busy || name.trim().length < 2}
            onClick={save}
          >
            {busy ? "Adding…" : "Add client"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
