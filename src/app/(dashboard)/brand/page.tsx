"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";

type Voice = {
  id?: string;
  name?: string;
  tone: string;
  audience: string;
  dos: string[];
  donts: string[];
  examples: { context: string; copy: string }[];
  sourceUrl?: string;
};

const EMPTY: Voice = {
  tone: "",
  audience: "",
  dos: [""],
  donts: [""],
  examples: [{ context: "", copy: "" }],
};

export default function BrandPage() {
  const [voice, setVoice] = useState<Voice>(EMPTY);
  const [extractUrl, setExtractUrl] = useState("");
  const [extractRaw, setExtractRaw] = useState("");
  const [busy, setBusy] = useState<"idle" | "extracting" | "saving">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brand-voice")
      .then((r) => (r.ok ? r.json() : { voice: null }))
      .then((b) => {
        if (!b.voice) return;
        setVoice({
          name: b.voice.name ?? "",
          tone: b.voice.tone ?? "",
          audience: b.voice.audience ?? "",
          dos: (b.voice.dosJson as string[] | null) ?? [""],
          donts: (b.voice.dontsJson as string[] | null) ?? [""],
          examples:
            (b.voice.examplesJson as { context: string; copy: string }[] | null) ?? [
              { context: "", copy: "" },
            ],
          sourceUrl: b.voice.sourceUrl ?? "",
        });
      });
  }, []);

  async function extract(method: "url" | "raw") {
    setBusy("extracting");
    setErr(null);
    try {
      const body = method === "url" ? { action: "extract", url: extractUrl, name: voice.name } : { action: "extract", rawCopy: extractRaw, name: voice.name };
      const r = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setVoice((v) => ({
        ...v,
        tone: data.voice.tone,
        audience: data.voice.audience,
        dos: data.voice.dos,
        donts: data.voice.donts,
        examples: data.voice.examples,
        sourceUrl: method === "url" ? extractUrl : v.sourceUrl,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("idle");
    }
  }

  async function save() {
    setBusy("saving");
    setErr(null);
    try {
      const r = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          name: voice.name || undefined,
          tone: voice.tone,
          audience: voice.audience,
          dos: voice.dos.filter((x) => x.trim()),
          donts: voice.donts.filter((x) => x.trim()),
          examples: voice.examples.filter((e) => e.copy.trim()),
          sourceUrl: voice.sourceUrl || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("idle");
    }
  }

  return (
    <>
      <TopBar
        eyebrow="Brand voice"
        title="Sound like you. At scale."
        subtitle="One playbook. Threaded into every agent on every ad — copywriter, captioner, variant lab — so the lab's output reads like your brand wrote it."
        action={
          <button onClick={save} className="btn-primary" disabled={busy === "saving"}>
            {busy === "saving" ? "Saving…" : "Save voice"}
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {/* Extractor */}
        <section className="surface-elevated relative overflow-hidden p-6">
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-volt/20 blur-3xl" />
          <div className="relative">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              One-click extractor
            </div>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              Don't have a voice document? Don't write one.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-mid">
              Paste a URL of an existing page that already sounds like you (your site, an
              IG profile, a top-performing tweet). Claude reads it and writes the playbook.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                placeholder="https://yourstore.com or https://instagram.com/yourbrand"
                className="input font-mono"
              />
              <button
                onClick={() => extract("url")}
                disabled={!extractUrl || busy === "extracting"}
                className="btn-lime"
              >
                {busy === "extracting" ? "Reading…" : "Extract from URL"}
              </button>
            </div>

            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-ink-mid hover:text-ink-hi">
                Or paste a sample of your existing copy
              </summary>
              <textarea
                value={extractRaw}
                onChange={(e) => setExtractRaw(e.target.value)}
                placeholder="Paste 100–500 words of copy you've written that sounds right…"
                rows={5}
                className="input mt-3 font-mono text-[12px]"
              />
              <button
                onClick={() => extract("raw")}
                disabled={extractRaw.length < 50 || busy === "extracting"}
                className="btn-ghost mt-2"
              >
                {busy === "extracting" ? "Reading…" : "Extract from text"}
              </button>
            </details>
          </div>
        </section>

        {err && <div className="card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">{err}</div>}
        {savedAt && (
          <div className="card border-lime/40 bg-lime/5 p-3 text-sm text-lime">
            Saved at {savedAt} · brand voice now active across all agents.
          </div>
        )}

        {/* Voice editor */}
        <section className="grid gap-4 md:grid-cols-2">
          <Field
            label="Brand name (optional)"
            value={voice.name ?? ""}
            onChange={(v) => setVoice({ ...voice, name: v })}
            placeholder="e.g. Highland & Pine"
          />
          <Field
            label="Tone (3-5 adjectives)"
            value={voice.tone}
            onChange={(v) => setVoice({ ...voice, tone: v })}
            placeholder="plain-spoken, dry, confident, warm"
          />
          <Field
            label="Audience"
            className="md:col-span-2"
            value={voice.audience}
            onChange={(v) => setVoice({ ...voice, audience: v })}
            placeholder="first-time skincare buyers in their late 20s"
          />
        </section>

        <ListEditor
          title="Do"
          accent="lime"
          items={voice.dos}
          placeholder="e.g. use second person · drop the word 'just'"
          onChange={(items) => setVoice({ ...voice, dos: items })}
        />
        <ListEditor
          title="Don't"
          accent="danger"
          items={voice.donts}
          placeholder="e.g. no exclamation marks · never say 'game-changer'"
          onChange={(items) => setVoice({ ...voice, donts: items })}
        />

        <section className="card p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Examples
          </div>
          <h3 className="mt-1 font-display text-lg tracking-tight">
            Lines that already sound like the brand
          </h3>
          <div className="mt-4 space-y-3">
            {voice.examples.map((e, i) => (
              <div key={i} className="rounded-xl2 border border-line-1 bg-base-2 p-3">
                <input
                  value={e.context}
                  onChange={(ev) => {
                    const ex = voice.examples.slice();
                    ex[i] = { ...ex[i], context: ev.target.value };
                    setVoice({ ...voice, examples: ex });
                  }}
                  placeholder="Context (e.g. 'IG bio')"
                  className="w-full bg-transparent font-mono text-[11px] uppercase tracking-wider text-ink-mid outline-none"
                />
                <textarea
                  value={e.copy}
                  onChange={(ev) => {
                    const ex = voice.examples.slice();
                    ex[i] = { ...ex[i], copy: ev.target.value };
                    setVoice({ ...voice, examples: ex });
                  }}
                  placeholder='"the line itself"'
                  rows={2}
                  className="mt-1 w-full resize-none bg-transparent text-sm text-ink-hi outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setVoice({
                  ...voice,
                  examples: [...voice.examples, { context: "", copy: "" }],
                })
              }
              className="btn-ghost"
            >
              + Add example
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input mt-1.5"
      />
    </label>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  placeholder,
  accent,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  accent: "lime" | "danger";
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3
          className={
            "font-display text-lg tracking-tight " +
            (accent === "lime" ? "text-lime" : "text-danger")
          }
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="btn-ghost h-7 px-3 text-[12px]"
        >
          + Add
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <input
              value={it}
              onChange={(e) => {
                const next = items.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="btn-ink h-9 w-9 px-0"
              aria-label="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
