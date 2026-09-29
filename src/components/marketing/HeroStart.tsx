"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The hero's real entry point. A visitor types their product URL here and
 * lands on /make already generating — removing the click-through that most
 * people never come back from.
 *
 * Validation is deliberately forgiving: "mystore.com/products/x" is what
 * people actually paste, so a missing scheme is added rather than rejected.
 */
export function HeroStart() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = url.trim();
    if (!raw) return;

    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed: URL;
    try {
      parsed = new URL(withScheme);
    } catch {
      setErr("That doesn't look like a link. Try pasting the full URL.");
      return;
    }
    if (!parsed.hostname.includes(".")) {
      setErr("That doesn't look like a link. Try pasting the full URL.");
      return;
    }
    router.push(`/make?url=${encodeURIComponent(parsed.toString())}`);
  }

  return (
    <div className="mx-auto mt-9 w-full max-w-xl">
      <form
        onSubmit={submit}
        className="flex flex-col gap-2.5 rounded-2xl border border-line-2 bg-base-1/80 p-2.5 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:rounded-full sm:p-2"
      >
        <label htmlFor="hero-url" className="sr-only">
          Product URL
        </label>
        <input
          id="hero-url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (err) setErr(null);
          }}
          placeholder="yourstore.com/products/…"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-[14px] text-ink-hi outline-none placeholder:text-ink-dim"
          autoComplete="url"
          spellCheck={false}
        />
        <button className="btn-primary shrink-0 px-6 py-3 text-[14px]" type="submit">
          Make my video
        </button>
      </form>

      {err ? (
        <p className="mt-3 text-[13px] text-danger">{err}</p>
      ) : (
        <p className="mt-3.5 text-[12.5px] text-ink-dim">
          2 free videos · no card · nothing to connect
        </p>
      )}
    </div>
  );
}
