import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AgentPipeline } from "@/components/AgentPipeline";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-base-0">
      <div className="grid-bg pointer-events-none fixed inset-0 opacity-50" />
      <div className="spot pointer-events-none fixed inset-0" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-ink-mid">
          <a href="#pipeline" className="hover:text-ink-hi">
            The pipeline
          </a>
          <a href="#manifesto" className="hover:text-ink-hi">
            Why it's different
          </a>
          <Link href="/pricing" className="hover:text-ink-hi">
            Pricing
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Enter control room →
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-20">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
          <span className="dot-live" /> Claude Opus 4.7 · five-agent lab · v0.1
        </div>
        <h1 className="mt-6 max-w-4xl font-display text-6xl font-semibold leading-[0.98] tracking-tightest text-ink-hi md:text-7xl">
          Direct an ad.
          <br />
          <span className="bg-gradient-to-r from-volt to-lime bg-clip-text text-transparent">
            Don't edit one.
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-mid">
          Paste a product URL. Five AI agents observe, write, direct, render,
          and ship — in that order, in real time — while you stay in the
          director's chair.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/generator" className="btn-primary">
            Generate an ad <span className="kbd !border-base-0/20 !bg-base-0/20 !text-base-0/70">↵</span>
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            See the lab
          </Link>
          <span className="ml-2 font-mono text-xs text-ink-dim">
            or press <span className="kbd">⌘</span>
            <span className="kbd">K</span> anywhere
          </span>
        </div>
      </section>

      {/* The pipeline — the hero visual */}
      <section id="pipeline" className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              The five-agent lab
            </div>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-ink-hi">
              Every ad walks the same assembly line
            </h2>
          </div>
          <div className="chip-live">
            <span className="dot-live" /> On air
          </div>
        </div>
        <div className="surface-elevated relative overflow-hidden p-8">
          <AgentPipeline current="DIRECTING" />
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-5">
            {[
              { k: "Scraper", v: "Pulls title, images, copy, reviews" },
              { k: "Copywriter", v: "Hook, problem, solution, CTA" },
              { k: "Creative Director", v: "Scene breakdown + durations" },
              { k: "Video Engine", v: "Voiceover, subtitles, 9:16 MP4" },
              { k: "Outreach", v: "Personalized email + attachment" },
            ].map((a) => (
              <div key={a.k} className="rounded-xl2 border border-line-1 bg-base-1 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                  {a.k}
                </div>
                <div className="mt-1 text-sm text-ink-hi">{a.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section id="manifesto" className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Vertical by default",
              b: "9:16 TikTok-ready output. The feed is the canvas, not an afterthought.",
            },
            {
              n: "02",
              t: "Keyboard-first",
              b: "⌘K everywhere. Paste a URL, hit enter, watch it render. No modal maze.",
            },
            {
              n: "03",
              t: "Show, don't hide",
              b: "You see the agents working. Artifacts unlock live. No black-box status bar.",
            },
          ].map((x) => (
            <div key={x.n} className="relative overflow-hidden rounded-xl2 border border-line-1 bg-base-1 p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                {x.n}
              </div>
              <h3 className="mt-3 font-display text-xl tracking-tight text-ink-hi">
                {x.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-mid">{x.b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-6xl items-center justify-between border-t border-line-1 px-6 py-6 text-xs text-ink-dim">
        <span>© {new Date().getFullYear()} AdGen / lab</span>
        <span className="font-mono uppercase tracking-[0.22em]">
          engineered in the director's chair
        </span>
      </footer>
    </main>
  );
}
