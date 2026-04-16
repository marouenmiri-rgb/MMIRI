import { TopBar } from "@/components/TopBar";
import { fixtureCampaigns } from "@/lib/fixtures";

export default function CampaignsPage() {
  const campaigns = fixtureCampaigns;
  return (
    <>
      <TopBar
        title="Campaigns"
        subtitle="Outreach sequences with your generated ads."
        action={<button className="btn-primary">New campaign</button>}
      />
      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{c.name}</h3>
                  <span className="pill mt-2 bg-emerald-50 text-emerald-700">
                    {c.status}
                  </span>
                </div>
                <button className="text-sm text-accent hover:underline">
                  Open
                </button>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
                {(
                  [
                    ["Sent", c.sent],
                    ["Opened", c.opened],
                    ["Replied", c.replied],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wider text-ink-400">
                      {k}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold tracking-tight">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
