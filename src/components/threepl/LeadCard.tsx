"use client";

import { useState } from "react";
import { FitScoreRing } from "./FitScoreRing";
import { SignalsGrid } from "./SignalsGrid";

export type LeadCardData = {
  id: string;
  brandName: string;
  websiteUrl: string;
  host: string;
  email: string | null;
  vertical: string | null;
  estMonthlyOrders: number | null;
  fitScore: number;
  fitReasons: string[];
  signals: {
    skuCount?: number | null;
    reviewCount?: number | null;
    estMonthlyOrders?: number | null;
    hasShippingPage?: boolean;
    shipsInternationally?: boolean;
    currentCarrier?: string | null;
    freeShippingThreshold?: string | null;
  };
  matchedPartnerName: string | null;
  matchedPartnerVertical?: string | null;
  commissionBps?: number | null;
  affiliateLink: string | null;
  outreachSubject: string | null;
  outreachBody: string | null;
  status: string;
  isDemo?: boolean;
};

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "email" | null>(null);

  function copy(text: string, which: "link" | "email") {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1400);
    });
  }

  const initials = lead.brandName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "·";

  const gradient = gradientFor(lead.brandName);
  const commission = lead.commissionBps != null
    ? `${(lead.commissionBps / 100).toFixed(lead.commissionBps % 100 ? 1 : 0)}%`
    : null;

  return (
    <article className="card group relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-70"
        style={{ background: gradient }}
      />
      <div className="relative flex flex-wrap items-start gap-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl2 border border-line-2 bg-base-2 font-display text-[18px] tracking-tight text-ink-hi"
          style={{ background: gradient }}
        >
          <span className="rounded-md bg-base-1/80 px-2 py-1 text-[14px]">
            {initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
              {lead.vertical ?? "unclassified"}
            </span>
            {lead.estMonthlyOrders ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                · ~{lead.estMonthlyOrders.toLocaleString()}/mo
              </span>
            ) : null}
            {lead.isDemo ? (
              <span className="pill border border-line-2 bg-base-2 text-ink-mid">
                demo
              </span>
            ) : null}
            <span className="pill border border-line-2 bg-base-2 text-ink-mid">
              {lead.status.toLowerCase()}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[22px] tracking-tight text-ink-hi">
            {lead.brandName}
          </h3>
          <a
            href={lead.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] text-ink-mid hover:text-volt"
          >
            {lead.host} ↗
          </a>
        </div>
        <FitScoreRing score={lead.fitScore} size={84} />
      </div>

      <div className="relative mt-5">
        <SignalsGrid signals={lead.signals} />
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            Why this fits
          </div>
          <ul className="mt-2 space-y-1.5 text-[13px] text-ink-mid">
            {lead.fitReasons.slice(0, 3).map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-volt" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              Matched 3PL
            </div>
            {commission ? (
              <span className="rounded-md border border-lime/30 bg-lime/10 px-1.5 py-0.5 font-mono text-[10px] text-lime">
                {commission}
              </span>
            ) : null}
          </div>
          <div className="mt-2 font-display text-[18px] tracking-tight text-ink-hi">
            {lead.matchedPartnerName ?? "—"}
          </div>
          {lead.matchedPartnerVertical ? (
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
              {lead.matchedPartnerVertical} specialist
            </div>
          ) : null}
          {lead.affiliateLink ? (
            <button
              onClick={() => copy(lead.affiliateLink!, "link")}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-line-2 bg-base-1 px-3 py-2 text-left transition hover:border-volt/40"
              title={lead.affiliateLink}
            >
              <span className="truncate font-mono text-[11px] text-volt">
                {lead.affiliateLink}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-mid">
                {copied === "link" ? "copied" : "copy"}
              </span>
            </button>
          ) : null}
        </div>
        <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            Contact
          </div>
          <div className="mt-2 text-[13px] text-ink-hi">
            {lead.email ?? (
              <span className="text-ink-dim">no email on file</span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            {lead.email ? (
              <button
                onClick={() => copy(lead.email!, "email")}
                className="btn-ink h-8 flex-1 px-3 text-[12px]"
              >
                {copied === "email" ? "Copied" : "Copy email"}
              </button>
            ) : (
              <button
                className="btn-ink h-8 flex-1 px-3 text-[12px] opacity-50"
                disabled
              >
                No email
              </button>
            )}
            <a
              href={lead.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost h-8 px-3 text-[12px]"
            >
              Visit
            </a>
          </div>
        </div>
      </div>

      {lead.outreachSubject && lead.outreachBody ? (
        <div className="relative mt-5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl2 border border-line-2 bg-base-2 px-4 py-3 text-left transition hover:border-volt/40"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-volt/40 bg-volt/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt">
                Draft pitch
              </span>
              <span className="truncate text-[13px] text-ink-hi">
                {lead.outreachSubject}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mid">
              {open ? "Hide" : "Show"}
            </span>
          </button>
          {open ? (
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl2 border border-line-1 bg-base-2 p-4 lg:grid-cols-[1fr,auto]">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-mid">
                {lead.outreachBody}
              </pre>
              <div className="flex flex-row gap-2 lg:flex-col">
                <button
                  onClick={() =>
                    copy(
                      `Subject: ${lead.outreachSubject}\n\n${lead.outreachBody}`,
                      "email",
                    )
                  }
                  className="btn-primary h-9 px-3 text-[12px]"
                >
                  {copied === "email" ? "Copied" : "Copy email"}
                </button>
                {lead.email ? (
                  <a
                    href={mailtoLink(
                      lead.email,
                      lead.outreachSubject,
                      lead.outreachBody,
                    )}
                    className="btn-ghost h-9 px-3 text-[12px]"
                  >
                    Open in mail
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 70) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 55% / 0.35), hsl(${b} 70% 40% / 0.30))`;
}

function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
