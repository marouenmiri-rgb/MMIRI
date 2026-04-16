import { TopBar } from "@/components/TopBar";
import { Sparkline } from "@/components/Sparkline";
import { fixtureCampaigns } from "@/lib/fixtures";

function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

export default function CampaignsPage() {
  const campaigns = fixtureCampaigns;
  return (
    <>
      <TopBar
        eyebrow="Outreach floor"
        title="Campaigns"
        subtitle="Sequenced sends. Funnel health. Replies that deserve your attention."
        action={<button className="btn-lime">New campaign</button>}
      />
      <div className="space-y-6 p-8">
        {campaigns.map((c) => {
          const openRate = (c.opened / Math.max(c.sent, 1)) * 100;
          const replyRate = (c.replied / Math.max(c.sent, 1)) * 100;
          return (
            <article key={c.id} className="card p-6">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                    Sequence
                  </div>
                  <h3 className="mt-1 font-display text-2xl tracking-tight text-ink-hi">
                    {c.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="chip-live">
                      <span className="dot-live" /> {c.status}
                    </span>
                    <span className="font-mono text-[11px] text-ink-dim">
                      id {c.id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost">Pause</button>
                  <button className="btn-primary">Open sequence →</button>
                </div>
              </header>

              {/* Funnel */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <FunnelStep
                  label="Sent"
                  value={c.sent}
                  total={c.sent}
                  tint="volt"
                  sub="100%"
                />
                <FunnelStep
                  label="Opened"
                  value={c.opened}
                  total={c.sent}
                  tint="volt"
                  sub={pct(c.opened, c.sent)}
                />
                <FunnelStep
                  label="Replied"
                  value={c.replied}
                  total={c.sent}
                  tint="lime"
                  sub={pct(c.replied, c.sent)}
                />
              </div>

              {/* Trend */}
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                    Open rate
                  </div>
                  <div className="mt-2 font-display text-3xl tracking-tightest text-ink-hi">
                    {openRate.toFixed(0)}%
                  </div>
                  <div className="mt-3">
                    <Sparkline values={[5, 12, 18, 22, 21, 26, 28, 31, 30, 32]} />
                  </div>
                </div>
                <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                    Reply rate
                  </div>
                  <div className="mt-2 font-display text-3xl tracking-tightest text-ink-hi">
                    {replyRate.toFixed(0)}%
                  </div>
                  <div className="mt-3">
                    <Sparkline
                      values={[0, 1, 2, 3, 4, 5, 6, 7, 7, 8]}
                      stroke="#c3ff3e"
                      fill="rgba(195,255,62,0.15)"
                    />
                  </div>
                </div>
                <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                    Inbox tier
                  </div>
                  <div className="mt-2 font-display text-3xl tracking-tightest text-ink-hi">
                    Primary
                  </div>
                  <div className="mt-3 flex gap-1">
                    {[1, 1, 1, 1, 1, 0.4, 1, 1, 1, 1].map((v, i) => (
                      <span
                        key={i}
                        className="h-6 flex-1 rounded-sm"
                        style={{ background: `rgba(167,139,250,${0.2 + v * 0.5})` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function FunnelStep({
  label,
  value,
  total,
  tint,
  sub,
}: {
  label: string;
  value: number;
  total: number;
  tint: "volt" | "lime";
  sub: string;
}) {
  const ratio = total ? value / total : 0;
  const bar = tint === "lime" ? "bg-lime" : "bg-volt";
  return (
    <div className="relative overflow-hidden rounded-xl2 border border-line-1 bg-base-2 p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
          {label}
        </div>
        <div className={`font-mono text-[11px] ${tint === "lime" ? "text-lime" : "text-volt"}`}>
          {sub}
        </div>
      </div>
      <div className="mt-3 font-display text-3xl tracking-tightest text-ink-hi">{value}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-3">
        <div
          className={`h-full ${bar}`}
          style={{ width: `${Math.max(ratio * 100, 4)}%` }}
        />
      </div>
    </div>
  );
}
