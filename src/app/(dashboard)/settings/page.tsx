import { TopBar } from "@/components/TopBar";
import { hasClaude, hasDb } from "@/lib/env";

type Check = { label: string; ok: boolean; hint: string; critical?: boolean };

export default function SettingsPage() {
  const checks: Check[] = [
    {
      label: "Database",
      ok: hasDb,
      hint: "Postgres via Prisma · DATABASE_URL",
      critical: true,
    },
    {
      label: "Claude Opus 4.7",
      ok: hasClaude,
      hint: "Reasoning for all 5 agents · ANTHROPIC_API_KEY",
      critical: true,
    },
    {
      label: "Voiceover engine",
      ok: Boolean(process.env.ELEVENLABS_API_KEY),
      hint: "ElevenLabs TTS · optional (silent video without)",
    },
    {
      label: "Outreach courier",
      ok: Boolean(process.env.RESEND_API_KEY),
      hint: "Resend delivery · optional (drafts only without)",
    },
    {
      label: "Video renderer",
      ok: true,
      hint: "FFmpeg slideshow · detected at runtime",
    },
  ];

  const ready = checks.filter((c) => c.ok).length;
  const required = checks.filter((c) => c.critical).length;
  const criticalReady = checks.filter((c) => c.critical && c.ok).length;

  return (
    <>
      <TopBar
        eyebrow="Workspace"
        title="Settings"
        subtitle="Keys, integrations, and what the lab has to work with."
        action={
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mid">
            {ready}/{checks.length} wired · {criticalReady}/{required} required
          </div>
        }
      />

      <div className="space-y-6 p-8">
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Workspace" value="AdGen Demo" />
          <Field label="Plan" value="Free · MVP" />
        </section>

        {/* System status */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-line-1 px-5 py-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                System status
              </div>
              <h3 className="mt-1 font-display text-xl tracking-tight">Integrations</h3>
            </div>
            <span className={criticalReady === required ? "chip-live" : "pill border border-warn/30 bg-warn/10 text-warn"}>
              <span className={criticalReady === required ? "dot-live" : "inline-block h-1.5 w-1.5 rounded-full bg-warn"} />
              {criticalReady === required ? "All systems go" : "Action required"}
            </span>
          </header>

          <ul>
            {checks.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-4 border-t border-line-1 px-5 py-4 first:border-t-0"
              >
                <div className="flex items-center gap-3">
                  <HealthDot ok={c.ok} />
                  <div>
                    <div className="text-sm font-medium text-ink-hi">{c.label}</div>
                    <div className="font-mono text-[11px] text-ink-mid">{c.hint}</div>
                  </div>
                </div>
                <span
                  className={
                    c.ok
                      ? "chip-live"
                      : "pill border border-line-2 bg-base-3 text-ink-mid"
                  }
                >
                  {c.ok ? <span className="dot-live" /> : <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-lo" />}
                  {c.ok ? "connected" : "missing"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Billing
          </div>
          <p className="mt-2 text-sm text-ink-mid">
            Stripe billing is scheduled for Phase 4 — see{" "}
            <code className="font-mono text-volt">BUILDPLAN.md</code>.
          </p>
        </section>
      </div>
    </>
  );
}

function HealthDot({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-lime animate-pulseRing" />
        <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-lime" />
      </span>
    );
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-line-3 bg-base-3" />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <div className="mt-2 font-display text-xl tracking-tight text-ink-hi">
        {value}
      </div>
    </div>
  );
}
