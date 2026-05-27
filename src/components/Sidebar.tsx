"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "./Logo";

const NAV: { href: string; label: string; icon: React.ReactNode; hint?: string }[] = [
  {
    href: "/dashboard",
    label: "Control room",
    hint: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/generator",
    label: "Generator",
    hint: "New ad",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M5 4h14l-3 16H8L5 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9.5 10l3 2-3 2v-4z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/radar",
    label: "Hook Radar",
    hint: "Trends",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/autopilot",
    label: "Auto-pilot",
    hint: "Hands-off",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M5 19l7-14 7 14-7-4-7 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/distribution",
    label: "Channels",
    hint: "Connect",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/brand",
    label: "Brand voice",
    hint: "Tone",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M5 19l4-4 6-6 4 4-4 4-6 6H5v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/revenue",
    label: "Revenue",
    hint: "ROI",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M4 18l5-5 4 4 7-9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M14 8h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/leads",
    label: "Leads",
    hint: "Storefronts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M4 8h16M4 8l2-4h12l2 4M4 8v12h16V8M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    hint: "Outreach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M4 6l16-2v16L4 18V6zM4 10h4v4H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    hint: "Workspace",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="relative flex h-screen w-[252px] flex-col border-r border-white/[0.06] bg-base-1/60 backdrop-blur-xl px-4 py-6">
      <div className="noise absolute inset-0 pointer-events-none" />
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <Logo size={22} />
      </Link>

      {/* big CTA: open ⌘K */}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
          );
        }}
        className="group mb-6 flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left text-[13px] text-ink-mid backdrop-blur transition-all duration-300 ease-ios hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-ink-hi"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-ink-lo group-hover:text-volt">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Jump to…</span>
        <span className="flex items-center gap-0.5">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex flex-col gap-0.5 text-[13px]">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-ios",
                active
                  ? "bg-white/[0.06] text-ink-hi"
                  : "text-ink-mid hover:bg-white/[0.03] hover:text-ink-hi",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-volt"
                  aria-hidden
                />
              )}
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-lg border transition",
                  active
                    ? "border-volt/40 bg-volt/15 text-volt"
                    : "border-white/[0.06] bg-white/[0.03] text-ink-mid group-hover:text-ink-hi",
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.hint && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-dim">
                  {item.hint}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          href="/pricing"
          className="group relative block overflow-hidden rounded-xl border border-white/[0.08] p-3.5 text-[13px] text-ink-hi transition-all duration-300 ease-ios hover:border-lime/40 hover:translate-y-[-1px]"
        >
          <div
            className="absolute inset-0 opacity-50 transition-opacity group-hover:opacity-75"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,77,255,0.18) 0%, rgba(195,255,62,0.15) 100%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-display text-[13px] font-semibold tracking-tight">
                Upgrade to Scale
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lime">
                pay 5% · only when you earn
              </div>
            </div>
            <span className="text-volt transition-transform duration-300 group-hover:translate-x-1 group-hover:text-lime">
              →
            </span>
          </div>
        </Link>
        <div className="glass overflow-hidden p-3">
          <div className="flex items-center justify-between">
            <span className="chip-live">
              <span className="dot-live" /> Lab live
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
              v0.1
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-ink-mid">
            5-agent pipeline. Claude Opus 4.7. Cached prompts.
          </p>
        </div>
      </div>
    </aside>
  );
}
