import { TopBar } from "@/components/TopBar";
import { hasClaude, hasDb } from "@/lib/env";

export default function SettingsPage() {
  const checks = [
    { label: "Database connected", ok: hasDb, hint: "Set DATABASE_URL" },
    { label: "Claude API key", ok: hasClaude, hint: "Set ANTHROPIC_API_KEY" },
    {
      label: "Voiceover (ElevenLabs)",
      ok: Boolean(process.env.ELEVENLABS_API_KEY),
      hint: "Optional · enables voice generation",
    },
    {
      label: "Outreach (Resend)",
      ok: Boolean(process.env.RESEND_API_KEY),
      hint: "Optional · sends emails",
    },
  ];

  return (
    <>
      <TopBar title="Settings" subtitle="Workspace · billing · integrations." />
      <div className="space-y-6 p-8">
        <div className="card p-6">
          <h3 className="text-sm font-semibold">Workspace</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Workspace name" value="AdGen Demo" />
            <Field label="Plan" value="Free (MVP)" />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold">System health</h3>
          <ul className="mt-4 divide-y divide-ink-100">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-ink-800">
                    {c.label}
                  </div>
                  <div className="text-xs text-ink-400">{c.hint}</div>
                </div>
                <span
                  className={
                    c.ok
                      ? "pill bg-emerald-50 text-emerald-700"
                      : "pill bg-ink-100 text-ink-500"
                  }
                >
                  {c.ok ? "Connected" : "Not configured"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold">Billing</h3>
          <p className="mt-2 text-sm text-ink-500">
            Stripe billing ships in Phase 4 (see <code>BUILDPLAN.md</code>).
          </p>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink-800">{value}</div>
    </div>
  );
}
