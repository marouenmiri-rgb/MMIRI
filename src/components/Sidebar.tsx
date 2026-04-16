"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generator", label: "Ad Generator" },
  { href: "/leads", label: "Leads" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-ink-100 bg-white px-4 py-6">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2 text-base font-semibold tracking-tight">
        <span className="inline-block h-6 w-6 rounded-lg bg-accent" />
        AdGen AI
      </Link>
      <nav className="flex flex-col gap-1 text-sm">
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
                "rounded-xl2 px-3 py-2 transition-colors",
                active
                  ? "bg-ink-100 text-ink-900 font-medium"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-800",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl2 bg-ink-50 p-3 text-xs text-ink-500">
        <div className="font-medium text-ink-800">MVP mode</div>
        Fixtures are shown until you add <code className="text-accent">ANTHROPIC_API_KEY</code>.
      </div>
    </aside>
  );
}
