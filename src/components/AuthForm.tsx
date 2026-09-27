"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

/**
 * Shared sign-in / sign-up form. One component because the two differ only in
 * endpoint, copy, and whether a name field is shown.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { email, password, name: name || undefined } : { email, password },
        ),
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

  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-16">
      <div className="aurora-hero pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-bg pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <div className="w-full max-w-[420px]">
        <Link href="/" className="flex justify-center">
          <Logo />
        </Link>

        <div className="card mt-8 p-7">
          <h1 className="text-[24px] font-semibold tracking-tight text-ink-hi">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-mid">
            {isSignup
              ? "Any videos you already made stay on this account."
              : "Sign in to reach your videos and reports."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            {isSignup && (
              <Field label="Name (optional)">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus={!isSignup}
              />
            </Field>
            <Field label="Password">
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
              />
              {isSignup && (
                <p className="mt-1.5 text-[12px] text-ink-dim">
                  At least 8 characters.
                </p>
              )}
            </Field>

            {!isSignup && (
              <div className="text-right">
                <Link
                  href="/forgot"
                  className="text-[12.5px] text-ink-lo underline-offset-4 transition hover:text-ink-hi hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

            {err && <p className="text-[13px] text-danger">{err}</p>}

            <button
              className="btn-primary w-full py-3"
              disabled={busy || !email || !password}
            >
              {busy
                ? isSignup
                  ? "Creating…"
                  : "Signing in…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[13.5px] text-ink-mid">
          {isSignup ? "Already have an account? " : "No account yet? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-volt underline-offset-4 hover:underline"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
