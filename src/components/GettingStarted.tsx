import Link from "next/link";
import { db } from "@/lib/db";
import { hasClaude, hasDb } from "@/lib/env";

type Step = {
  label: string;
  detail: string;
  done: boolean;
  href?: string;
  cta?: string;
  /** Something the operator must fix on the server, not in the UI. */
  serverSide?: boolean;
};

/**
 * First-run guidance.
 *
 * A new account lands on a dashboard of zeros with nothing to act on. This
 * names the next useful thing and disappears once the account is genuinely
 * running, so it never becomes furniture for an established user.
 */
export async function GettingStarted({ userId }: { userId: string }) {
  if (!hasDb) return null;

  const [ads, readyAds, connections, brandVoice, clients] = await Promise.all([
    db.ad.count({ where: { userId } }),
    db.ad.count({ where: { userId, status: "READY" } }),
    db.socialConnection.count({ where: { userId } }),
    db.brandVoice.findUnique({ where: { userId }, select: { id: true } }),
    db.client.count({ where: { userId } }),
  ]);

  const steps: Step[] = [
    {
      label: "Connect Claude",
      detail: hasClaude
        ? "ANTHROPIC_API_KEY is set — the agents can run."
        : "Add ANTHROPIC_API_KEY to .env. Nothing generates without it.",
      done: hasClaude,
      serverSide: true,
    },
    {
      label: "Make your first video",
      detail: "Paste any product URL. It takes about a minute.",
      done: ads > 0,
      href: "/generator",
      cta: "Open the generator",
    },
    {
      label: "Download it and judge it",
      detail:
        "The honest test: would you post this? Everything else depends on that answer.",
      done: readyAds > 0,
      href: "/generator",
      cta: "See your videos",
    },
    {
      label: "Teach it your voice",
      detail:
        "Paste a page you've written. Every future script inherits your tone.",
      done: Boolean(brandVoice),
      href: "/brand",
      cta: "Set brand voice",
    },
    {
      label: "Connect a channel",
      detail:
        "Optional. Only needed for scheduled posting and revenue attribution.",
      done: connections > 0,
      href: "/distribution",
      cta: "Connect",
    },
    {
      label: "Add a client",
      detail:
        "Running ads for other stores? Each one gets a report you can send.",
      done: clients > 0,
      href: "/clients",
      cta: "Add a client",
    },
  ];

  const complete = steps.filter((s) => s.done).length;
  // Once the account is actually producing, the checklist has done its job.
  if (readyAds > 0 && complete >= steps.length - 1) return null;

  const next = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-1 px-6 py-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Getting started
          </div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-ink-hi">
            {next ? next.label : "You're set up"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-base-4">
            <div
              className="h-full rounded-full bg-mint transition-all duration-500 ease-ios"
              style={{ width: `${(complete / steps.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-ink-dim">
            {complete}/{steps.length}
          </span>
        </div>
      </div>

      <ol className="divide-y divide-line-1">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-4 px-6 py-3.5">
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                s.done
                  ? "bg-mint text-white"
                  : "border border-line-2 text-ink-dim"
              }`}
              aria-hidden
            >
              {s.done ? "✓" : ""}
            </span>

            <div className="min-w-0 flex-1">
              <div
                className={`text-[14px] font-medium ${
                  s.done ? "text-ink-lo line-through" : "text-ink-hi"
                }`}
              >
                {s.label}
              </div>
              <div className="text-[12.5px] leading-snug text-ink-mid">
                {s.detail}
              </div>
            </div>

            {!s.done &&
              (s.serverSide ? (
                <span className="pill shrink-0 border border-warn/30 bg-warn/10 text-warn">
                  Needs you
                </span>
              ) : s.href ? (
                <Link href={s.href} className="btn-ink shrink-0">
                  {s.cta ?? "Open"}
                </Link>
              ) : null)}
          </li>
        ))}
      </ol>
    </section>
  );
}
