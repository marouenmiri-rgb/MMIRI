"use client";

import { useState } from "react";

/**
 * Prompt to confirm the address, shown across the dashboard until it's done.
 *
 * Deliberately a nudge rather than a wall: blocking an unverified account from
 * the product would cost more signups than the unverified addresses are worth.
 * Verification gets enforced where it actually matters — reaching someone
 * about billing or a failed run.
 */
export function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function resend() {
    setState("sending");
    setMsg(null);
    try {
      const r = await fetch("/api/auth/resend-verification", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setState("sent");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="border-b border-warn/25 bg-warn/[0.07] px-8 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[13.5px] text-ink-hi">
          {state === "sent" ? (
            <>Confirmation sent to <span className="font-medium">{email}</span>.</>
          ) : (
            <>
              Confirm <span className="font-medium">{email}</span> so we can
              reach you about your account.
            </>
          )}
        </span>

        {state !== "sent" && (
          <button
            onClick={resend}
            disabled={state === "sending"}
            className="text-[13px] font-medium text-volt underline-offset-4 hover:underline disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Resend the email"}
          </button>
        )}

        {msg && <span className="text-[12.5px] text-danger">{msg}</span>}

        <button
          onClick={() => setDismissed(true)}
          className="ml-auto text-[12.5px] text-ink-lo transition hover:text-ink-hi"
          aria-label="Dismiss"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
