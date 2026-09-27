import Link from "next/link";
import { AgentPipeline } from "@/components/AgentPipeline";
import { SiteNav, SiteFooter } from "@/components/marketing/SiteChrome";
import { ProductShot, PhoneAd } from "@/components/marketing/ProductShot";
import { HeroStart } from "@/components/marketing/HeroStart";
import { PLANS } from "@/lib/billing";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-base-0 text-ink-hi">
      <div className="aurora-hero pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-bg pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <SiteNav />

      {/* ---------------- Hero ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rise inline-flex items-center gap-2 rounded-full border border-line-2 bg-base-1/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-volt backdrop-blur">
            <span className="dot-live" />
            Five AI agents · one pipeline
          </div>

          <h1 className="rise mt-7 font-display text-[clamp(38px,7vw,72px)] font-semibold leading-[1.02] tracking-ultratight">
            Ten ad videos
            <br />
            <span className="text-aurora">before lunch.</span>
          </h1>

          <p className="rise mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-mid">
            Paste a product link. AdGen reads the page, writes the script, and
            renders a vertical 9:16 video with captions burned in. You download
            the MP4 and post it wherever you like.
          </p>

          <HeroStart />
        </div>

        {/* Product visual */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <ProductShot />
        </div>
      </section>

      {/* ---------------- Numbers ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line-1 bg-line-1 sm:grid-cols-4">
          {[
            ["9:16", "Vertical, native to feeds"],
            ["1080×1920", "Full-resolution MP4"],
            ["5", "Agents in the pipeline"],
            ["~1 min", "Link to finished file"],
          ].map(([v, k]) => (
            <div key={k} className="bg-base-1 px-6 py-7">
              <div className="font-display text-[26px] font-semibold tracking-tight text-volt">
                {v}
              </div>
              <div className="mt-1 text-[13px] leading-snug text-ink-mid">{k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- The problem ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
              Why this exists
            </div>
            <h2 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-tightest">
              You don&apos;t have a
              <br />
              creative problem.
              <br />
              <span className="text-aurora">You have a volume problem.</span>
            </h2>
          </div>
          <div className="flex flex-col justify-center gap-5">
            <p className="text-[16px] leading-relaxed text-ink-mid">
              The hook decides whether a short-form ad works. Not the edit, not
              the music — the first two seconds. And you can&apos;t reason your
              way to the right hook. You have to run several and read the
              numbers.
            </p>
            <p className="text-[16px] leading-relaxed text-ink-mid">
              That&apos;s the part nobody can afford. A freelance editor is a
              few hundred a video and a week of back-and-forth, so most stores
              test two ideas a month and call it a strategy.
            </p>
            <p className="text-[16px] font-medium leading-relaxed text-ink-hi">
              AdGen makes the tenth version as cheap as the first. Test ten
              hooks this week, find the one that converts, then spend real money
              behind the winner.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Who it's for ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "Shopify sellers",
              "You have the photos and no time to edit. Turn every product into a week of posts without opening an editor.",
            ],
            [
              "Dropshippers",
              "You need to know within days whether a product moves. Test hooks cheaply, kill the losers, scale the one that works.",
            ],
            [
              "Freelancers & agencies",
              "You bill for creative volume. Produce for several stores at once and send each one a report showing what it earned them.",
            ],
          ].map(([who, why]) => (
            <div key={who} className="card p-6">
              <h3 className="text-[16px] font-semibold tracking-tight text-ink-hi">
                {who}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-mid">
                {why}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- What you get ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="order-2 lg:order-1">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
              What lands in your downloads
            </div>
            <h2 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-tightest">
              A file you can post,
              <br />
              not a project to finish.
            </h2>
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-mid">
              No editor to learn, no timeline to scrub, no watermark to pay to
              remove. One MP4, sized for the feed, with the captions already
              burned in.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                [
                  "The MP4",
                  "1080×1920 H.264. Captions burned in, lower third, styled the way short-form captions actually look.",
                ],
                [
                  "The script",
                  "Hook, problem, solution, CTA — plus the full voiceover text, in case you want to record it yourself.",
                ],
                [
                  "The shot list",
                  "Which product image appears when, and for how long. Useful if you re-cut it in your own editor.",
                ],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint/15 text-[11px] font-bold text-mint">
                    ✓
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-ink-hi">
                      {title}
                    </div>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-ink-mid">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 flex items-center justify-center gap-5 lg:order-2">
            <PhoneAd caption="Your coffee deserves better than a kitchen tap." />
            <PhoneAd
              caption="Gooseneck control. Copper heat retention."
              className="hidden -translate-y-8 sm:block"
            />
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
            How it works
          </div>
          <h2 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-tightest">
            Every video walks the
            <br />
            <span className="text-aurora">same assembly line.</span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-mid">
            Five specialists, in order. You watch each one finish in real time
            instead of waiting on a spinner.
          </p>
        </div>

        <div className="card mt-10 p-7">
          <AgentPipeline current="RENDERING" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Scraper", "Pulls the title, photos, copy and reviews off the product page."],
              ["Copywriter", "Writes the hook, the problem, the turn and the call to action."],
              ["Creative Director", "Chooses which photo carries each line, and for how long."],
              ["Video Engine", "Renders 1080×1920, burns the captions, adds voiceover."],
              ["Outreach", "Optional: ships it to your channels with a tracked link."],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-line-1 bg-base-2 p-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt">
                  {k}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                  {v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
            Beyond the first video
          </div>
          <h2 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-tightest">
            Built for the tenth video,
            <br />
            not the demo.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "Brand voice",
              "Paste a page you've written, and every future script inherits your tone, your do's and your don'ts.",
              "/brand",
            ],
            [
              "Variant Lab",
              "One product, several hooks. Ship them side by side and let the click-through decide which survives.",
              "/generator",
            ],
            [
              "Hook Radar",
              "A bank of hook formulas by category — pattern interrupt, curiosity gap, social proof — ready to generate from.",
              "/radar",
            ],
            [
              "Auto-pilot",
              "Set a cadence and a list of products. It cycles through them and ships on schedule without you.",
              "/autopilot",
            ],
            [
              "Revenue attribution",
              "Every post carries a tracked link. When a Shopify order arrives, it's matched back to the exact ad.",
              "/revenue",
            ],
            [
              "Client reports",
              "Running ads for other stores? Each client gets a shareable report showing what you earned them.",
              "/clients",
            ],
          ].map(([title, body, href]) => (
            <Link
              key={title}
              href={href}
              className="card card-hover group p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold tracking-tight text-ink-hi">
                  {title}
                </h3>
                <span className="text-ink-dim transition-transform duration-300 ease-ios group-hover:translate-x-0.5 group-hover:text-volt">
                  →
                </span>
              </div>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-mid">
                {body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Pricing preview ---------------- */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
            Pricing
          </div>
          <h2 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-tightest">
            Start free. Scale when it works.
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {([PLANS.FREE, PLANS.STARTER, PLANS.STUDIO] as const).map((p, i) => (
            <div
              key={p.tier}
              className={`card p-6 ${i === 2 ? "border-volt/50 shadow-glow" : ""}`}
            >
              {i === 2 && (
                <span className="pill bg-volt/12 text-volt">{p.tagline}</span>
              )}
              <div className="mt-2 text-[15px] font-semibold text-ink-hi">
                {p.label}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-[38px] font-semibold tracking-tightest text-ink-hi">
                  ${p.priceUsd as number}
                </span>
                <span className="text-[13px] text-ink-lo">/mo</span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mid">
                {p.blurb}
              </p>
              <Link
                href="/pricing"
                className={`mt-5 w-full ${i === 2 ? "btn-primary" : "btn-ink"}`}
              >
                {p.priceUsd === 0 ? "Start free" : "Choose " + p.label}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-mid">
          Running ads for other stores?{" "}
          <Link href="/pricing" className="text-volt underline-offset-4 hover:underline">
            See the Agency plan →
          </Link>
        </p>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="relative mx-auto max-w-3xl px-6 pb-28">
        <h2 className="font-display text-[clamp(26px,4vw,38px)] font-semibold tracking-tightest">
          Questions worth answering
        </h2>
        <div className="mt-8 space-y-3">
          {[
            [
              "What does the video actually look like?",
              "It's a paced sequence of your product's own photographs, cropped to 9:16, with each line of the script burned in as a caption in the lower third. If you have an ElevenLabs key configured, a voiceover is mixed in. It is not AI-generated footage and it won't pass as a creator filming your product — it's closest to the caption-led product videos that do well on TikTok and Reels.",
            ],
            [
              "Do I have to connect TikTok or Instagram?",
              "No. The default flow gives you the MP4 to download and post yourself. Connecting channels is optional, and only worth it if you want scheduled posting and revenue attribution.",
            ],
            [
              "Which product pages work?",
              "Shopify and Amazon product pages work best, because the title, photos and description sit in predictable places. Any public product page with proper meta tags will usually work. Pages that render entirely in JavaScript may come back thin.",
            ],
            [
              "How is revenue attributed?",
              "Every post carries a short link that tags the visit. When a Shopify order comes through the webhook, we read the tag off the landing URL and match it to the exact ad and platform. It only counts orders that started at a tracked link, so it understates rather than overstates.",
            ],
            [
              "Can I edit the video afterwards?",
              "You get the finished MP4, plus the script and the shot list. If you want to re-cut it, the shot list tells you which photo ran when and for how long.",
            ],
            [
              "What happens when I hit my monthly limit?",
              "Generation stops and you're shown the upgrade path. Nothing you've already made is taken away, and downloads of past videos keep working.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-medium text-ink-hi">
                {q}
                <span className="shrink-0 text-ink-dim transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-mid">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="relative mx-auto max-w-5xl px-6 pb-28">
        <div className="card relative overflow-hidden p-10 text-center sm:p-14">
          <div className="aurora pointer-events-none absolute inset-0 opacity-70" />
          <div className="noise pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="font-display text-[clamp(28px,5vw,48px)] font-semibold leading-[1.06] tracking-tightest">
              Your next ad is one
              <br />
              <span className="text-aurora">paste away.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-mid">
              Two free videos, no card. If the first one isn&apos;t good enough
              to post, you&apos;ve lost a minute.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/make" className="btn-primary px-6 py-3 text-[14px]">
                Make a video — free
              </Link>
              <Link href="/pricing" className="btn-ghost px-6 py-3 text-[14px]">
                See pricing
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2.5 text-[13px] text-ink-mid">
              {[
                "No card to start",
                "Nothing to connect",
                "You own the files",
                "Cancel anytime",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="text-mint">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
