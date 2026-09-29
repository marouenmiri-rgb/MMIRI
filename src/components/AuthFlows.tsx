"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-16">
      <div className="aurora-hero pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-bg pointer-events-none fixed inset-0 -z-10 opacity-40" />
      <div className="w-full max-w-[420px]">
        <Link href="/" className="flex justify-center">
          <Logo />
        </Link>
        {children}
      </div>
    </main>
  );
}

/** Step one: ask for the address. */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="card mt-8 p-7">
        {sent ? (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-hi">
              Check your inbox
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-mid">
              If <span className="text-ink-hi">{email}</span> has an account,
              a reset link is on its way. It works once and expires in an hour.
            </p>
            <Link href="/login" className="btn-ink mt-6 w-full">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-hi">
              Reset your password
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-mid">
              Enter the address on the account and we&apos;ll send a link.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3.5">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                  Email
                </span>
                <input
                  className="input mt-1.5"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </label>
              {err && <p className="text-[13px] text-danger">{err}</p>}
              <button className="btn-primary w-full py-3" disabled={busy || !email}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </div>
      <p className="mt-5 text-center text-[13.5px] text-ink-mid">
        Remembered it?{" "}
        <Link href="/login" className="text-volt underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

/** Step two: choose the new password. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <Shell>
        <div className="card mt-8 p-7">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-hi">
            That link is incomplete
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-mid">
            Open the link from the email exactly as it was sent, or ask for a
            new one.
          </p>
          <Link href="/forgot" className="btn-primary mt-6 w-full">
            Send a new link
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="card mt-8 p-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-hi">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-mid">
          Setting it signs you out on every other device.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3.5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
              New password
            </span>
            <input
              className="input mt-1.5"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
            />
            <span className="mt-1.5 block text-[12px] text-ink-dim">
              At least 8 characters.
            </span>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
              Confirm
            </span>
            <input
              className="input mt-1.5"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {mismatch && (
              <span className="mt-1.5 block text-[12px] text-danger">
                Those don&apos;t match.
              </span>
            )}
          </label>
          {err && <p className="text-[13px] text-danger">{err}</p>}
          <button
            className="btn-primary w-full py-3"
            disabled={busy || password.length < 8 || mismatch}
          >
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </Shell>
  );
}

/** Confirmation landing — burns the token on arrival. */
export function VerifyView({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "ok" | "bad">("working");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("bad");
      setErr("That confirmation link is incomplete.");
      return;
    }
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        setState("ok");
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setState("bad");
      });
  }, [token]);

  return (
    <Shell>
      <div className="card mt-8 p-7 text-center">
        {state === "working" && (
          <p className="text-[15px] text-ink-mid">Confirming your email…</p>
        )}
        {state === "ok" && (
          <>
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-mint/15 text-[18px] text-mint">
              ✓
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-ink-hi">
              Email confirmed
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-mid">
              Thanks — that&apos;s everything we needed.
            </p>
            <Link href="/dashboard" className="btn-primary mt-6 w-full">
              Go to your dashboard
            </Link>
          </>
        )}
        {state === "bad" && (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-hi">
              We couldn&apos;t confirm that
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-mid">
              {err ?? "The link has expired or already been used."}
            </p>
            <Link href="/dashboard" className="btn-ink mt-6 w-full">
              Go to your dashboard
            </Link>
          </>
        )}
      </div>
    </Shell>
  );
}
