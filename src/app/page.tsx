import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-6 w-6 rounded-lg bg-accent" />
          AdGen AI
        </div>
        <nav className="flex items-center gap-6 text-sm text-ink-500">
          <a href="#features" className="hover:text-ink-800">Features</a>
          <a href="#how" className="hover:text-ink-800">How it works</a>
          <Link href="/dashboard" className="btn-secondary">Open app</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <p className="pill bg-ink-100 text-ink-600">New · AI video ads in 60s</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-ink-900 leading-[1.05]">
          Turn any product link into a{" "}
          <span className="text-accent">high-converting</span> video ad.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-500">
          Paste a Shopify or Amazon URL. AdGen writes the script, directs the
          scenes, and ships a short-form ad ready to post — then runs outreach
          to stores that need it.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/generator" className="btn-primary">Generate an ad</Link>
          <Link href="/dashboard" className="btn-secondary">See the dashboard</Link>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Product → video",
              body: "Scraper pulls images and copy. Claude writes the hook, problem, solution, CTA. You get a script + scene plan in seconds.",
            },
            {
              title: "Find Shopify stores",
              body: "Discover stores by niche. We detect ‘Powered by Shopify’, pull contact info, and keep a lead database.",
            },
            {
              title: "Outreach on autopilot",
              body: "Personalized cold emails with your ad attached. Follow-ups. Reply detection. Campaigns you can actually trust.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-sm text-ink-400">
        © {new Date().getFullYear()} AdGen AI
      </footer>
    </main>
  );
}
