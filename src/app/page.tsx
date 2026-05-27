import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AgentPipeline } from "@/components/AgentPipeline";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-base-0 text-ink-hi">
      {/* Aurora layer — fixed, slowly drifting. */}
      <div className="aurora-hero pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-bg pointer-events-none fixed inset-0 -z-10 opacity-40" />

      {/* Floating conic glow behind hero text */}
      <div
        aria-hidden
        className="conic-glow pointer-events-none absolute -z-10 h-[520px] w-[520px] opacity-50"
        style={{ left: "50%", top: "30%", transform: "translate(-60%, -50%)" }}
      />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-[13px] text-ink-mid md:flex">
          <a href="#pipeline" className="transition hover:text-ink-hi">The lab</a>
          <a href="#manifesto" className="transition hover:text-ink-hi">Manifesto</a>
          <Link href="/pricing" className="transition hover:text-ink-hi">Pricing</Link>
        </nav>
        <Link href="/dashboard" className="btn-ghost">
          Enter the lab →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 text-center sm:pt-32">
        <div className="rise mx-auto inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-volt backdrop-blur">
          <span className="dot-live" /> Claude Opus 4.7 · five-agent lab
        </div>

        <h1 className="rise mx-auto mt-8 max-w-5xl font-display text-6xl font-semibold leading-[0.95] tracking-ultratight text-ink-hi sm:text-7xl md:text-[96px] md:leading-[0.92]">
          Direct an ad.{" "}
          <br className="hidden sm:block" />
          <span className="text-aurora">Don't edit one.</span>
        </h1>

        <p className="rise mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-ink-mid sm:text-xl">
          Paste a product URL. Five AI agents observe, write, direct, render, and
          ship — in that order, in real time. You stay in the director's chair.
        </p>

        <div className="rise mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link href="/generator" className="btn-primary">
            Generate an ad
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Explore the lab
          </Link>
        </div>

        <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
          press <span className="kbd">⌘</span>
          <span className="kbd">K</span> from anywhere
        </div>
      </section>

      {/* Stat strip */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="glass grid grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
          {[
            { k: "5", v: "AI agents in the pipeline" },
            { k: "9:16", v: "Vertical, native to feeds" },
            { k: "<60s", v: "Idea → published ad" },
            { k: "5%", v: "Of revenue, when you earn" },
          ].map((s) => (
            <div
              key={s.v}
              className="bg-base-1/40 px-6 py-8 text-left backdrop-blur"
            >
              <div className="font-display text-4xl font-semibold tracking-tightest text-aurora">
                {s.k}
              </div>
              <div className="mt-2 text-sm text-ink-mid">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline section — the signature visual */}
      <section id="pipeline" className="relative mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-12 flex flex-col items-start gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
            The five-agent lab
          </div>
          <h2 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl md:text-6xl">
            Every ad walks the{" "}
            <span className="text-aurora">same assembly line.</span>
          </h2>
          <p className="max-w-2xl text-lg text-ink-mid">
            One pipeline, five specialists, perfectly choreographed.
            You watch them work in real time — and intervene whenever you want.
          </p>
        </div>

        <div className="glass relative overflow-hidden p-10">
          <AgentPipeline current="DIRECTING" />
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              { k: "Scraper", v: "Pulls title, images, copy, reviews" },
              { k: "Copywriter", v: "Hook, problem, solution, CTA" },
              { k: "Creative Director", v: "Scene breakdown + durations" },
              { k: "Video Engine", v: "Voiceover, subtitles, 9:16 MP4" },
              { k: "Outreach", v: "Personalized email + attachment" },
            ].map((a) => (
              <div
                key={a.k}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur transition hover:bg-white/[0.04]"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
                  {a.k}
                </div>
                <div className="mt-2 text-sm leading-snug text-ink-hi">{a.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto — three principles */}
      <section id="manifesto" className="relative mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
            Why this is different
          </div>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl">
            Three commitments we won't break.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Vertical by default",
              b: "9:16 TikTok-ready output. The feed is the canvas, not an afterthought.",
              accent: "volt",
            },
            {
              n: "02",
              t: "Keyboard-first",
              b: "⌘K everywhere. Paste a URL, press enter, watch it render. No modal maze.",
              accent: "cyan",
            },
            {
              n: "03",
              t: "Show, don't hide",
              b: "You see the agents working. Artifacts unlock live. No black-box status bar.",
              accent: "lime",
            },
          ].map((x) => (
            <div
              key={x.n}
              className="glass group relative overflow-hidden p-8 transition duration-500 ease-ios hover:-translate-y-1"
            >
              <div
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    x.accent === "volt"
                      ? "rgba(124,77,255,0.4)"
                      : x.accent === "cyan"
                        ? "rgba(34,211,238,0.3)"
                        : "rgba(195,255,62,0.3)",
                  opacity: 0.6,
                }}
              />
              <div className="relative">
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
                  {x.n}
                </div>
                <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-hi">
                  {x.t}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-mid">
                  {x.b}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-5xl px-6 pb-32">
        <div className="glass relative overflow-hidden p-12 text-center md:p-20">
          <div
            aria-hidden
            className="conic-glow absolute inset-0 opacity-40"
            style={{ filter: "blur(80px)" }}
          />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl md:text-6xl">
              Your next ad{" "}
              <span className="text-aurora">writes itself.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-mid">
              Open the lab. Paste a URL. Walk away. We'll have a 9:16 ad,
              voiceover and subtitles included, by the time you're back.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/generator" className="btn-primary">
                Start generating →
              </Link>
              <Link href="/pricing" className="btn-ghost">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-7xl items-center justify-between border-t border-white/[0.06] px-6 py-8 text-xs text-ink-dim">
        <Logo size={18} />
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="hover:text-ink-mid">Pricing</Link>
          <Link href="/dashboard" className="hover:text-ink-mid">App</Link>
          <span className="font-mono uppercase tracking-[0.22em]">
            engineered in the director's chair
          </span>
        </div>
      </footer>
    </main>
  );
}
