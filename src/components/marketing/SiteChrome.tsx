import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AppearanceMenu } from "@/components/AppearanceMenu";

/** Sticky, blurred top bar shared by every public page. */
export function SiteNav({ cta = "Make a video" }: { cta?: string }) {
  return (
    <header
      className="sticky z-40 border-b border-line-1/70 bg-base-0/70 backdrop-blur-xl"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-[13.5px] text-ink-mid md:flex">
          <Link href="/#how" className="transition hover:text-ink-hi">
            How it works
          </Link>
          <Link href="/#features" className="transition hover:text-ink-hi">
            Features
          </Link>
          <Link href="/pricing" className="transition hover:text-ink-hi">
            Pricing
          </Link>
          <Link href="/#faq" className="transition hover:text-ink-hi">
            FAQ
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <AppearanceMenu compact />
          <Link href="/dashboard" className="hidden text-[13.5px] text-ink-mid transition hover:text-ink-hi sm:block">
            Sign in
          </Link>
          <Link href="/make" className="btn-primary">
            {cta}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const groups: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Make a video", href: "/make" },
        { label: "How it works", href: "/#how" },
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "The lab",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Hook Radar", href: "/radar" },
        { label: "Auto-pilot", href: "/autopilot" },
        { label: "Clients", href: "/clients" },
      ],
    },
    {
      title: "Measure",
      links: [
        { label: "Revenue", href: "/revenue" },
        { label: "Channels", href: "/distribution" },
        { label: "Brand voice", href: "/brand" },
        { label: "Settings", href: "/settings" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-line-1">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-mid">
              Paste a product link. Get a vertical video ad you can download and
              post anywhere.
            </p>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
                {g.title}
              </div>
              <ul className="mt-3.5 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-ink-mid transition hover:text-ink-hi"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line-1 pt-6">
          <span className="text-[12px] text-ink-dim">
            © {new Date().getFullYear()} AdGen
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
            Engineered in the director&apos;s chair
          </span>
        </div>
      </div>
    </footer>
  );
}
