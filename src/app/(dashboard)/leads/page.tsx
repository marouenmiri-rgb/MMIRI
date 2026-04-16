import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { fixtureLeads } from "@/lib/fixtures";
import { DiscoverButton } from "./DiscoverButton";

async function loadLeads() {
  if (!hasDb) return fixtureLeads;
  const userId = await getCurrentUserId();
  if (!userId) return fixtureLeads;
  const leads = await db.lead.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return leads.length ? leads : fixtureLeads;
}

export default async function LeadsPage() {
  const leads = await loadLeads();
  return (
    <>
      <TopBar
        title="Leads"
        subtitle="Shopify stores you can pitch."
        action={<DiscoverButton />}
      />
      <div className="p-8">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 text-left text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Store</th>
                <th className="px-5 py-3 font-medium">Website</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-ink-100">
                  <td className="px-5 py-4 font-medium text-ink-900">
                    {l.storeName}
                  </td>
                  <td className="px-5 py-4 text-ink-500">
                    <a
                      href={l.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent"
                    >
                      {l.websiteUrl}
                    </a>
                  </td>
                  <td className="px-5 py-4 text-ink-500">
                    {l.email ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-ink-500">
                    {new Date(l.createdAt).toLocaleString()}
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
