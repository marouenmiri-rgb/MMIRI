import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { fixtureAds } from "@/lib/fixtures";

async function loadAds() {
  if (!hasDb) return fixtureAds;
  const userId = await getCurrentUserId();
  if (!userId) return fixtureAds;
  const ads = await db.ad.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return ads.length ? ads : fixtureAds;
}

export default async function DashboardPage() {
  const ads = await loadAds();
  const stats = [
    { label: "Ads generated", value: ads.length },
    { label: "Leads in database", value: 0 },
    { label: "Campaigns active", value: 0 },
    { label: "Replies this week", value: 0 },
  ];

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="What's happening across AdGen AI."
        action={
          <Link href="/generator" className="btn-primary">
            New ad
          </Link>
        }
      />
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="text-sm text-ink-500">{s.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold">Recent ads</h2>
            <Link href="/generator" className="text-sm text-accent hover:underline">
              Create new →
            </Link>
          </div>
          <table className="w-full border-t border-ink-100 text-sm">
            <thead className="bg-ink-50/60 text-left text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-t border-ink-100">
                  <td className="px-5 py-4">
                    <div className="font-medium text-ink-900">
                      {ad.productTitle ?? "Untitled"}
                    </div>
                    <div className="text-xs text-ink-400">{ad.productUrl}</div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={ad.status} />
                  </td>
                  <td className="px-5 py-4 text-ink-500">
                    {new Date(ad.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/generator?id=${ad.id}`}
                      className="text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
