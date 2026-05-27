"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { PlatformIcon, PLATFORM_META, type PlatformKey } from "@/components/PlatformIcon";
import { CATEGORIES, type HookCategory } from "@/data/hook-templates";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  productUrls: string[];
  platforms: PlatformKey[];
  hookCategories: HookCategory[];
  cadenceHours: number;
  budgetAdsTotal: number | null;
  adsRun: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
};

const CADENCES = [
  { label: "Every 4h", hours: 4 },
  { label: "Daily", hours: 24 },
  { label: "Every 2 days", hours: 48 },
  { label: "Weekly", hours: 168 },
];

export default function AutoPilotPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/autopilot/rules");
    if (!r.ok) return;
    const b = await r.json();
    setRules(b.rules ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(rule: Rule) {
    await fetch(`/api/autopilot/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    load();
  }
  async function runNow(rule: Rule) {
    await fetch(`/api/autopilot/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run: true }),
    });
    setTimeout(load, 1500);
  }
  async function remove(rule: Rule) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    await fetch(`/api/autopilot/rules/${rule.id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <TopBar
        eyebrow="Auto-pilot"
        title="Set it once. Wake up to revenue."
        subtitle="Each rule cycles through your products, picks a winning hook, generates an ad, and ships it across your connected channels — on the cadence you set."
        action={
          <button onClick={() => setCreating(true)} className="btn-lime">
            New rule
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {creating && (
          <NewRuleForm
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              load();
            }}
          />
        )}

        {rules.length === 0 && !creating && (
          <div className="card grid place-items-center gap-3 p-16 text-center">
            <div className="font-display text-2xl tracking-tight text-ink-hi">
              No auto-pilot rules yet.
            </div>
            <p className="max-w-md text-sm text-ink-mid">
              Add a rule — list 5 product URLs, pick TikTok + Instagram, set cadence to
              Daily. The lab ships one ad every 24 hours, attributing every cent it earns.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary">
              Create your first rule
            </button>
          </div>
        )}

        {rules.map((r) => (
          <RuleCard
            key={r.id}
            rule={r}
            onToggle={() => toggle(r)}
            onRunNow={() => runNow(r)}
            onDelete={() => remove(r)}
          />
        ))}
      </div>
    </>
  );
}

function RuleCard({
  rule,
  onToggle,
  onRunNow,
  onDelete,
}: {
  rule: Rule;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const countdown = rule.nextRunAt
    ? formatCountdown(new Date(rule.nextRunAt).getTime() - Date.now())
    : "—";

  return (
    <article className="card relative overflow-hidden p-6">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-volt/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={
                  rule.enabled
                    ? "chip-live"
                    : "pill border border-line-2 bg-base-3 text-ink-mid"
                }
              >
                {rule.enabled ? <span className="dot-live" /> : null}
                {rule.enabled ? "running" : "paused"}
              </span>
              {rule.lastError && (
                <span className="pill border border-danger/30 bg-danger/10 text-danger">
                  last error
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-2xl tracking-tight text-ink-hi">
              {rule.name}
            </h3>
            <div className="mt-1 font-mono text-[11px] text-ink-mid">
              {rule.productUrls.length} products · cycles every{" "}
              {rule.cadenceHours}h ·{" "}
              {rule.adsRun} ad{rule.adsRun === 1 ? "" : "s"} shipped
              {rule.budgetAdsTotal ? ` / ${rule.budgetAdsTotal} budget` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRunNow} className="btn-ghost h-9 px-3 text-[12px]">
              Run now
            </button>
            <button onClick={onToggle} className="btn-ink h-9 px-3 text-[12px]">
              {rule.enabled ? "Pause" : "Resume"}
            </button>
            <button onClick={onDelete} className="btn-ink h-9 px-3 text-[12px]">
              Delete
            </button>
          </div>
        </div>

        {/* Channel pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            Shipping to
          </span>
          {rule.platforms.map((p) => {
            const m = PLATFORM_META[p];
            return (
              <span
                key={p}
                className="pill border"
                style={{
                  borderColor: `${m.color}55`,
                  background: `${m.color}15`,
                  color: m.color,
                }}
              >
                <PlatformIcon platform={p} className="h-3 w-3" />
                {m.label}
              </span>
            );
          })}
        </div>

        {/* Countdown / last run */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Next ad ships in"
            value={rule.enabled ? countdown : "paused"}
            color="lime"
          />
          <Stat
            label="Last shipped"
            value={
              rule.lastRunAt
                ? new Date(rule.lastRunAt).toLocaleString()
                : "—"
            }
          />
          <Stat
            label="Total shipped"
            value={String(rule.adsRun)}
            color="volt"
          />
        </div>

        {rule.lastError && (
          <div className="mt-4 rounded-xl2 border border-danger/30 bg-danger/5 p-3 text-[12px] text-danger">
            {rule.lastError}
          </div>
        )}
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "lime" | "volt";
}) {
  return (
    <div className="rounded-xl2 border border-line-1 bg-base-2 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <div
        className={
          "mt-1 font-display text-xl tracking-tight " +
          (color === "lime" ? "text-lime" : color === "volt" ? "text-volt" : "text-ink-hi")
        }
      >
        {value}
      </div>
    </div>
  );
}

function NewRuleForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(["TIKTOK", "INSTAGRAM"]);
  const [cadenceHours, setCadenceHours] = useState(24);
  const [budget, setBudget] = useState<string>("");
  const [cats, setCats] = useState<HookCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function togglePlat(p: PlatformKey) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }
  function toggleCat(c: HookCategory) {
    setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const urls = urlsText
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      const body = {
        name,
        productUrls: urls,
        platforms,
        hookCategories: cats.length ? cats : undefined,
        cadenceHours,
        budgetAdsTotal: budget ? Number(budget) : undefined,
      };
      const r = await fetch("/api/autopilot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card relative overflow-hidden p-6">
      <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-lime/20 blur-3xl" />
      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
          New rule
        </div>
        <h3 className="mt-1 font-display text-xl tracking-tight">
          Configure the auto-pilot
        </h3>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              Name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Top SKUs · Spring 2026"
              className="input mt-1.5"
            />
          </label>

          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              Product URLs · one per line
            </div>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              required
              rows={4}
              placeholder={"https://yourstore.com/products/mug\nhttps://yourstore.com/products/tote"}
              className="input mt-1.5 font-mono text-[12px]"
            />
          </label>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              Ship to
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"] as PlatformKey[]).map((p) => {
                const m = PLATFORM_META[p];
                const on = platforms.includes(p);
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePlat(p)}
                    className="pill border transition"
                    style={
                      on
                        ? { background: m.color, borderColor: m.color, color: m.textOn }
                        : { borderColor: "#2a2a38", color: "#a7a7b8" }
                    }
                  >
                    <PlatformIcon platform={p} className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              Hook categories · empty = all
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className="pill border transition"
                    style={
                      on
                        ? { background: c.color, borderColor: c.color, color: "#08080c" }
                        : { borderColor: "#2a2a38", color: "#a7a7b8" }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                Cadence
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CADENCES.map((c) => (
                  <button
                    type="button"
                    key={c.hours}
                    onClick={() => setCadenceHours(c.hours)}
                    className="pill border transition"
                    style={
                      cadenceHours === c.hours
                        ? { background: "#a78bfa", borderColor: "#a78bfa", color: "#08080c" }
                        : { borderColor: "#2a2a38", color: "#a7a7b8" }
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                Total ad budget (optional)
              </div>
              <input
                type="number"
                min={1}
                max={1000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 30"
                className="input mt-1.5"
              />
              <div className="mt-1 font-mono text-[10px] text-ink-dim">
                pauses automatically once reached
              </div>
            </label>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name || !urlsText || platforms.length === 0}
              className="btn-lime"
            >
              {busy ? "Creating…" : "Launch rule"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "any moment";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
