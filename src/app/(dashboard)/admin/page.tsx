import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — AdGen", robots: { index: false } };

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function when(d: Date | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Operator view across every account. Reachable only with role ADMIN — the
 * check runs here on the server, so knowing the URL is not enough.
 */
export default async function AdminPage() {
  if (!hasDb) redirect("/dashboard");
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      isGuest: true,
      createdAt: true,
      lastSeenAt: true,
      _count: { select: { ads: true, clients: true, sessions: true } },
      trackingLinks: { select: { revenueCents: true, clicks: true } },
    },
  });

  const rows = users.map((u) => ({
    ...u,
    revenueCents: u.trackingLinks.reduce((s, l) => s + l.revenueCents, 0),
    clicks: u.trackingLinks.reduce((s, l) => s + l.clicks, 0),
  }));

  const real = rows.filter((r) => !r.isGuest);
  const guests = rows.filter((r) => r.isGuest);
  const totals = {
    accounts: real.length,
    guests: guests.length,
    videos: rows.reduce((s, r) => s + r._count.ads, 0),
    revenueCents: rows.reduce((s, r) => s + r.revenueCents, 0),
    paying: real.filter((r) => r.plan !== "FREE").length,
  };

  return (
    <>
      <TopBar
        eyebrow="Super admin"
        title="Admin console"
        subtitle="Every account on this deployment, what they've made, and what it earned."
        action={
          <span className="pill border border-volt/30 bg-volt/10 text-volt">
            {admin.email}
          </span>
        }
      />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Tile label="Accounts" value={String(totals.accounts)} hint="signed up" />
          <Tile label="Paying" value={String(totals.paying)} hint="above Free" accent />
          <Tile label="Guests" value={String(totals.guests)} hint="not yet signed up" />
          <Tile label="Videos" value={String(totals.videos)} hint="generated in total" />
          <Tile
            label="Attributed"
            value={money(totals.revenueCents)}
            hint="across all accounts"
            mint
          />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line-1 px-5 py-4">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink-hi">
              Accounts
            </h2>
            <span className="font-mono text-[11px] text-ink-dim">
              newest first · {rows.length} shown
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
                  <th className="px-5 py-3 font-normal">Account</th>
                  <th className="px-3 py-3 font-normal">Plan</th>
                  <th className="px-3 py-3 text-right font-normal">Videos</th>
                  <th className="px-3 py-3 text-right font-normal">Clients</th>
                  <th className="px-3 py-3 text-right font-normal">Clicks</th>
                  <th className="px-3 py-3 text-right font-normal">Attributed</th>
                  <th className="px-3 py-3 font-normal">Joined</th>
                  <th className="px-5 py-3 font-normal">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-[14px] text-ink-lo">
                      No accounts yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-line-1 text-[13.5px] last:border-0"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink-hi">
                            {u.isGuest ? "Guest" : u.name?.trim() || u.email}
                          </span>
                          {u.role === "ADMIN" && (
                            <span className="pill bg-volt/12 text-volt">Admin</span>
                          )}
                          {u.isGuest && (
                            <span className="pill bg-base-4 text-ink-lo">Guest</span>
                          )}
                        </div>
                        {!u.isGuest && u.name?.trim() && (
                          <div className="truncate font-mono text-[11px] text-ink-dim">
                            {u.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`pill ${
                            u.plan === "FREE"
                              ? "bg-base-4 text-ink-lo"
                              : "bg-mint/12 text-mint-600"
                          }`}
                        >
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-hi">
                        {u._count.ads}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-mid">
                        {u._count.clients}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-mid">
                        {u.clicks.toLocaleString("en-US")}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-mint">
                        {u.revenueCents > 0 ? money(u.revenueCents) : "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-mid">{when(u.createdAt)}</td>
                      <td className="px-5 py-3 text-ink-mid">{when(u.lastSeenAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-ink-dim">
          Guest rows are visitors who generated before creating an account. They
          become real accounts on sign-up, keeping the videos they already made.
        </p>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
  mint,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  mint?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {label}
      </div>
      <div
        className={`mt-1.5 text-[26px] font-semibold tabular-nums tracking-tight ${
          mint ? "text-mint" : accent ? "text-volt" : "text-ink-hi"
        }`}
      >
        {value}
      </div>
      <div className="text-[12px] text-ink-lo">{hint}</div>
    </div>
  );
}
