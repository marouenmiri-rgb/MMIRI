import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PricingComparator } from "@/components/PricingComparator";
import { PLANS, hasStripe } from "@/lib/billing";

export const metadata = {
  title: "Pricing — AdGen / lab",
  description:
    "Pay nothing until you make money. Revenue-share pricing + flat tiers for creative teams and agencies.",
};

export default function PricingPage() {
  const plans = [PLANS.STARTER, PLANS.STUDIO, PLANS.SCALE, PLANS.AGENCY];

  return (
    <main className="relative min-h-screen bg-base-0">
      <div className="grid-bg pointer-events-none fixed inset-0 opacity-40" />
      <div className="spot pointer-events-none fixed inset-0" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-mid">
          <Link href="/#pipeline" className="hover:text-ink-hi">
            How it works
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Enter control room →
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-4">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
          <span className="dot-live" /> New · revenue-share tier
        </div>
        <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tightest text-ink-hi md:text-6xl">
          Priced like we're on the{" "}
          <span className="bg-gradient-to-r from-volt to-lime bg-clip-text text-transparent">
            same side.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-mid">
          Every post ships with a UTM-tagged short link. Every Shopify order
          that reads that link is attributed to the exact ad that earned it.
          Pick flat pricing — or the Scale plan, where we only earn when you do.
        </p>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-8">
        <PricingComparator
          plans={plans as Parameters<typeof PricingComparator>[0]["plans"]}
          hasStripe={hasStripe}
        />
      </section>

      {/* Feature matrix */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 font-display text-2xl tracking-tight text-ink-hi">
          What's included
        </h2>
        <div className="overflow-hidden rounded-xl2 border border-line-2 bg-base-1">
          <FeatureRow feature="Ads per month" row={["3", "20", "100", "Unlimited"]} />
          <FeatureRow feature="Published posts / mo" row={["10", "100", "500", "Unlimited"]} />
          <FeatureRow feature="Workspaces" row={["1", "1", "3", "10"]} />
          <FeatureRow feature="Claude Opus 4.7 agents" row={["•", "•", "•", "•"]} />
          <FeatureRow feature="Variant Lab" row={["—", "•", "•", "•"]} />
          <FeatureRow feature="Weekly Insights" row={["—", "•", "•", "•"]} />
          <FeatureRow feature="Real social OAuth" row={["—", "•", "•", "•"]} />
          <FeatureRow feature="Shopify attribution" row={["—", "•", "•", "•"]} />
          <FeatureRow feature="White-label PDFs" row={["—", "—", "—", "•"]} />
          <FeatureRow feature="Dedicated Slack" row={["—", "—", "—", "•"]} last />
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-6 font-display text-2xl tracking-tight text-ink-hi">
          Questions we get a lot
        </h2>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl2 border border-line-2 bg-base-1 p-5 open:shadow-card"
            >
              <summary className="cursor-pointer list-none font-medium text-ink-hi">
                <span className="mr-2 text-volt">›</span> {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-mid">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-6xl items-center justify-between border-t border-line-1 px-6 py-6 text-xs text-ink-dim">
        <Logo size={18} />
        <span className="font-mono uppercase tracking-[0.22em]">
          same side · same incentives
        </span>
      </footer>
    </main>
  );
}

function FeatureRow({
  feature,
  row,
  last,
}: {
  feature: string;
  row: string[];
  last?: boolean;
}) {
  return (
    <div
      className={
        "grid grid-cols-[1.5fr_repeat(4,_1fr)] items-center px-5 py-3 text-sm" +
        (last ? "" : " border-b border-line-1")
      }
    >
      <div className="text-ink-mid">{feature}</div>
      {row.map((v, i) => (
        <div
          key={i}
          className="text-center font-mono text-[13px] text-ink-hi"
        >
          {v}
        </div>
      ))}
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does the Scale plan's revenue share work?",
    a: "We charge 5% of AdGen-attributed revenue — i.e. Shopify orders whose landing page URL contains one of our /s/<code> tracking links. If no posts you've shipped drive orders, you pay nothing. We invoice monthly in arrears.",
  },
  {
    q: "Do I need Stripe configured to try paid plans?",
    a: "No. Without a Stripe key the upgrade flow flips your Subscription to the requested tier directly so you can play with the full feature set. A demo badge is shown while in this mode.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Prorate-on-upgrade via Stripe's billing portal. Downgrade takes effect at the end of the current period.",
  },
  {
    q: "What counts as an 'ad' and a 'post'?",
    a: "An ad = one full pipeline run (scraper → copywriter → director → video). A post = one published item on one social channel. Three ads posted to three platforms each = 3 ads + 9 posts against your quota.",
  },
  {
    q: "Is the Shopify attribution accurate?",
    a: "It's last-touch via utm_content, which matches ~90% of direct-social orders. Cross-device orders where the buyer clicks on mobile and purchases on desktop need additional identity stitching we're building out.",
  },
];
