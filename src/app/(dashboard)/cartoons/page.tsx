"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";
import { ShipPanel } from "../generator/ShipPanel";
import type { CartoonSketch, CartoonStyle, InspiredBy, ReferenceMode } from "@/cartoon/types";

type CartoonAd = {
  id: string;
  productTitle?: string | null;
  productUrl?: string;
  topic?: string | null;
  status: string;
  scenesJson?: { style: CartoonStyle; cartoon: CartoonSketch; inspiredBy?: InspiredBy } | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  error?: string | null;
};

type RecentCartoon = {
  id: string;
  productTitle: string | null;
  topic: string | null;
  status: string;
  thumbnailUrl: string | null;
};

const STYLES: { value: CartoonStyle; label: string; hint: string }[] = [
  { value: "slapstick", label: "Slapstick", hint: "Bonks, falls, big reactions" },
  { value: "deadpan", label: "Deadpan", hint: "One unimpressed character" },
  { value: "wholesome", label: "Wholesome", hint: "Sweet with a twist" },
  { value: "chaotic", label: "Chaotic", hint: "Absurd escalation" },
  { value: "parody", label: "Parody", hint: "Nature doc, infomercial…" },
];

const IDEAS = [
  "A cat convinced the vacuum cleaner is a dragon",
  "Monday morning vs. the last cup of coffee",
  "A robot trying to learn how to dance at a wedding",
  "Two frogs arguing about who gets the good lily pad",
  "A dog's dramatic reaction to the mail carrier",
];

type Source = "idea" | "script" | "video";

const SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "idea", label: "An idea", hint: "Type a joke or premise" },
  { value: "script", label: "A script", hint: "Paste one you like or wrote" },
  { value: "video", label: "A video", hint: "Paste a link or upload a clip" },
];

const MODES: { value: ReferenceMode; label: string; hint: string }[] = [
  { value: "remix", label: "Make something similar", hint: "Same format & vibe, brand-new jokes" },
  { value: "adapt", label: "Turn it into a cartoon", hint: "Keep the story and lines — it's mine" },
];

const MAX_VIDEO_MB = 150;

const STEPS = [
  { label: "Study & write", agent: "Head writer", keys: ["QUEUED", "SCRAPING", "WRITING"] },
  { label: "Storyboard", agent: "Director", keys: ["DIRECTING"] },
  { label: "Animate", agent: "Animator", keys: ["RENDERING"] },
  { label: "Ready", agent: "Ship", keys: ["READY"] },
];

export default function CartoonStudioPage() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<CartoonStyle>("slapstick");
  const [productUrl, setProductUrl] = useState("");
  const [source, setSource] = useState<Source>("idea");
  const [mode, setMode] = useState<ReferenceMode>("remix");
  const [script, setScript] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ad, setAd] = useState<CartoonAd | null>(null);
  const [recent, setRecent] = useState<RecentCartoon[]>([]);

  useEffect(() => {
    loadRecent();
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) poll(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadRecent() {
    fetch("/api/cartoons")
      .then((r) => (r.ok ? r.json() : { cartoons: [] }))
      .then((b) => setRecent(b.cartoons ?? []))
      .catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setAd(null);
    try {
      const fields = {
        topic,
        style,
        productUrl: productUrl.trim(),
        ...(source !== "idea" ? { mode } : {}),
        ...(source === "script" ? { script } : {}),
        // An uploaded file wins over a pasted link.
        ...(source === "video" && !video && videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
      };
      let init: RequestInit;
      if (source === "video" && video) {
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) form.append(k, v);
        form.append("video", video);
        init = { method: "POST", body: form };
      } else {
        init = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        };
      }
      const r = await fetch("/api/cartoons/generate", init);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.message ?? body.detail ?? body.error ?? `HTTP ${r.status}`);
      window.history.replaceState(null, "", `/cartoons?id=${body.id}`);
      poll(body.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function poll(id: string) {
    setBusy(true);
    for (let i = 0; i < 150; i++) {
      const r = await fetch(`/api/ads/${id}`);
      if (r.ok) {
        const data = (await r.json()) as CartoonAd;
        setAd(data);
        if (data.status === "READY" || data.status === "FAILED") {
          setBusy(false);
          if (data.status === "FAILED") setErr(data.error ?? "Cartoon failed");
          loadRecent();
          return;
        }
      }
      await new Promise((res) => setTimeout(res, 2000));
    }
    setBusy(false);
    setErr("Timed out waiting for the cartoon to finish");
  }

  const canSubmit =
    source === "idea"
      ? topic.trim().length >= 3
      : source === "script"
        ? script.trim().length > 0
        : Boolean(video) || /^https?:\/\/\S+\.\S+/i.test(videoUrl.trim());

  function pickVideo(f: File) {
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setErr(`That video is ${(f.size / 1024 / 1024).toFixed(0)} MB — the limit is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setErr(null);
    setVideo(f);
  }

  function reset() {
    setAd(null);
    setErr(null);
    window.history.replaceState(null, "", "/cartoons");
  }

  const sketch = ad?.scenesJson?.cartoon ?? null;

  return (
    <>
      <TopBar
        eyebrow="Cartoon studio"
        title={sketch?.title ?? ad?.productTitle ?? "Make a funny cartoon"}
        subtitle={
          ad
            ? sketch?.logline ?? ad.topic ?? "The writers' room is working on it."
            : "Type a joke idea — or share a script or video you like and get something similar. Claude writes it, animates it with voices and sound effects, and you post it to your channels."
        }
        action={
          ad ? (
            <div className="flex items-center gap-3">
              <StatusPill status={ad.status} />
              {!busy && (
                <button onClick={reset} className="btn-ghost h-9 px-3 text-[12px]">
                  New cartoon
                </button>
              )}
            </div>
          ) : null
        }
      />

      <div className="space-y-8 p-8">
        {!ad && (
          <form onSubmit={submit} className="surface-elevated space-y-6 p-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Start from
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {SOURCES.map((s) => (
                  <ChoiceCard
                    key={s.value}
                    active={source === s.value}
                    onClick={() => setSource(s.value)}
                    label={s.label}
                    hint={s.hint}
                  />
                ))}
              </div>
            </div>

            {source === "script" && (
              <div>
                <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                  Paste the script
                </label>
                <textarea
                  className="input mt-3 min-h-[180px] w-full resize-y py-3 font-mono text-[13px]"
                  placeholder={"GUY: Did you eat my sandwich?\nDOG: *looks away slowly*\n…"}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  maxLength={8000}
                  required
                />
                <div className="mt-1 text-right font-mono text-[10px] text-ink-dim">
                  {script.length}/8000
                </div>
              </div>
            )}

            {source === "video" && (
              <div>
                <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                  Paste a video link
                </label>
                <input
                  className="input mt-3 w-full"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.tiktok.com/@creator/video/…  ·  YouTube  ·  Instagram Reels  ·  X"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={Boolean(video)}
                />
                <div className="my-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                  <span className="h-px flex-1 bg-line-2" /> or upload the file <span className="h-px flex-1 bg-line-2" />
                </div>
                <label
                  className={clsx(
                    "mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed p-8 text-center transition",
                    video ? "border-volt/50 bg-base-2" : "border-line-3 bg-base-1 hover:border-volt/40",
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) pickVideo(f);
                  }}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickVideo(f);
                    }}
                  />
                  {video ? (
                    <>
                      <div className="text-sm font-medium text-ink-hi">{video.name}</div>
                      <div className="font-mono text-[10px] text-ink-mid">
                        {(video.size / 1024 / 1024).toFixed(1)} MB · click to change ·{" "}
                        <button
                          type="button"
                          className="text-volt hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            setVideo(null);
                          }}
                        >
                          remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-ink-hi">Drop a video here or click to choose</div>
                      <div className="font-mono text-[10px] text-ink-dim">
                        MP4 · MOV · WebM · up to {MAX_VIDEO_MB} MB
                      </div>
                    </>
                  )}
                </label>
                <p className="mt-2 text-[11px] text-ink-dim">
                  Claude watches frames sampled across the video and reads its captions/subtitles;
                  with an ElevenLabs key it also hears the dialogue. Downloaded or uploaded videos
                  are deleted right after they&apos;re studied.
                </p>
              </div>
            )}

            {source !== "idea" && (
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                  What should we do with it?
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {MODES.map((m) => (
                    <ChoiceCard
                      key={m.value}
                      active={mode === m.value}
                      onClick={() => setMode(m.value)}
                      label={m.label}
                      hint={m.hint}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                {source === "idea" ? (
                  <>What&apos;s the joke?</>
                ) : (
                  <>
                    Twist or topic <span className="text-ink-dim">· optional</span>
                  </>
                )}
              </label>
              <textarea
                className="input-hero mt-3 min-h-[96px] w-full resize-y py-4"
                placeholder={
                  source === "idea"
                    ? "A cat convinced the vacuum cleaner is a dragon…"
                    : mode === "remix"
                      ? "Same format, but about… (leave empty and Claude picks)"
                      : "Anything to change? (leave empty to keep it as-is)"
                }
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={400}
                required={source === "idea"}
              />
              {source === "idea" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setTopic(idea)}
                    className="pill border border-line-2 bg-base-2 text-ink-mid transition hover:border-volt/40 hover:text-ink-hi"
                  >
                    {idea}
                  </button>
                ))}
              </div>
              )}
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Comedy style
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    className={clsx(
                      "rounded-xl2 border p-3 text-left transition",
                      style === s.value
                        ? "border-volt/50 bg-base-2 shadow-glow"
                        : "border-line-2 bg-base-2 hover:border-line-3",
                    )}
                  >
                    <div className="text-[13px] font-medium text-ink-hi">{s.label}</div>
                    <div className="mt-1 text-[11px] text-ink-mid">{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Feature a product <span className="text-ink-dim">· optional</span>
              </label>
              <input
                className="input mt-3 w-full"
                type="url"
                placeholder="https://yourstore.com/products/… (makes it the hero of the punchline)"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              {err ? (
                <p className="text-sm text-danger">{err}</p>
              ) : (
                <p className="text-xs text-ink-dim">
                  15–30s vertical cartoon · voices with ElevenLabs, cartoon babble without it.
                </p>
              )}
              <button className="btn-primary" disabled={busy || !canSubmit}>
                {busy ? "Starting…" : "Make cartoon"}
              </button>
            </div>
          </form>
        )}

        {ad && (
          <section className="surface-elevated p-6">
            <StudioProgress status={ad.status} />
          </section>
        )}

        {ad && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              {sketch ? (
                <>
                  {ad.scenesJson?.inspiredBy && (
                    <InspiredCard ref_={ad.scenesJson.inspiredBy} />
                  )}
                  <section className="card p-6">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                      Cast
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {sketch.cast.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl2 border border-line-1 bg-base-2 px-4 py-3"
                        >
                          <span
                            className="h-8 w-8 rounded-full border-2 border-base-0"
                            style={{ background: c.color }}
                          />
                          <div>
                            <div className="text-sm font-medium text-ink-hi">{c.name}</div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                              {c.kind} · {c.voice} voice
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="card p-6">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                      Storyboard
                    </div>
                    <ol className="mt-4 space-y-2">
                      {sketch.panels.map((p, i) => {
                        const speaker = sketch.cast.find((c) => c.id === p.speaker);
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-4 rounded-xl2 border border-line-1 bg-base-2 p-4"
                          >
                            <div className="shrink-0 rounded-lg border border-line-2 bg-base-3 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-volt">
                              {String(i + 1).padStart(2, "0")} · {p.setting}
                            </div>
                            <div className="min-w-0 flex-1 text-sm">
                              {p.caption && (
                                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-warn">
                                  {p.caption}
                                </div>
                              )}
                              {p.line ? (
                                <div className="text-ink-hi">
                                  <span style={{ color: speaker?.color }} className="font-medium">
                                    {speaker?.name ?? "?"}:
                                  </span>{" "}
                                  {p.line}
                                </div>
                              ) : (
                                <div className="italic text-ink-mid">(silent beat)</div>
                              )}
                              <div className="mt-1 font-mono text-[10px] text-ink-dim">
                                {p.characters
                                  .map((pc) => {
                                    const c = sketch.cast.find((x) => x.id === pc.id);
                                    return `${c?.name ?? pc.id} ${pc.expression}${pc.action !== "idle" ? ` · ${pc.action}` : ""}`;
                                  })
                                  .join("  /  ")}
                              </div>
                            </div>
                            {p.sfx && (
                              <span className="shrink-0 rounded-md bg-warn/15 px-2 py-1 font-mono text-[11px] font-bold text-warn">
                                {p.sfx}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                </>
              ) : (
                <section className="card p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                    Writers&apos; room
                  </div>
                  <p className="mt-2 text-sm text-ink-mid">
                    Pitching jokes for: <span className="text-ink-hi">{ad.topic}</span>
                  </p>
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="shimmer h-5 rounded-lg bg-base-2"
                        style={{ width: `${90 - i * 12}%` }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section className="card overflow-hidden p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                    Preview · 9:16
                  </div>
                  {ad.videoUrl && (
                    <a
                      href={`/api/ads/${ad.id}/download`}
                      className="btn-ink h-8 px-3 text-[12px]"
                    >
                      Download MP4
                    </a>
                  )}
                </div>
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-line-2 bg-base-0">
                  {ad.videoUrl ? (
                    <video
                      controls
                      playsInline
                      className="h-full w-full"
                      src={ad.videoUrl}
                      poster={ad.thumbnailUrl ?? undefined}
                    />
                  ) : ad.thumbnailUrl ? (
                    <img src={ad.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 spot" />
                      <div className="shimmer absolute inset-0" />
                      <div className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                        {ad.status === "RENDERING" ? "animating…" : "writing…"}
                      </div>
                    </>
                  )}
                </div>
                {ad.status === "READY" && !ad.videoUrl && (
                  <p className="mt-3 text-xs text-warn">
                    {ad.error ?? "No video was rendered."}
                  </p>
                )}
              </section>

              <ShipPanel adId={ad.id} isReady={ad.status === "READY" && !!ad.videoUrl} />
            </div>
          </div>
        )}

        {!ad && recent.length > 0 && (
          <section>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Your cartoons
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {recent.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    window.history.replaceState(null, "", `/cartoons?id=${c.id}`);
                    poll(c.id);
                  }}
                  className="group relative block aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.08] bg-base-2 text-left transition hover:-translate-y-1 hover:border-volt/40"
                >
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 spot" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
                    <div className="line-clamp-2 text-[13px] font-medium text-white">
                      {c.productTitle ?? c.topic ?? "Untitled"}
                    </div>
                    <div className="mt-1">
                      <StatusPill status={c.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function StudioProgress({ status }: { status: string }) {
  const current = STEPS.findIndex((s) => s.keys.includes(status));
  const failed = status === "FAILED";
  return (
    <div className="grid grid-cols-4 gap-3">
      {STEPS.map((s, i) => {
        const done = !failed && (current > i || status === "READY");
        const active = !failed && current === i && status !== "READY";
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span
              className={clsx(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                done ? "bg-lime" : active ? "animate-pulse bg-volt" : "bg-line-3",
              )}
            />
            <div>
              <div
                className={clsx(
                  "text-[15px]",
                  done || active ? "text-ink-hi" : "text-ink-dim",
                )}
              >
                {s.label}
              </div>
              <div
                className={clsx(
                  "font-mono text-[10px] uppercase tracking-wider",
                  done ? "text-lime" : active ? "text-volt" : "text-ink-dim",
                )}
              >
                {s.agent}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-xl2 border p-3 text-left transition",
        active ? "border-volt/50 bg-base-2 shadow-glow" : "border-line-2 bg-base-2 hover:border-line-3",
      )}
    >
      <div className="text-[13px] font-medium text-ink-hi">{label}</div>
      <div className="mt-1 text-[11px] text-ink-mid">{hint}</div>
    </button>
  );
}

function InspiredCard({ ref_ }: { ref_: InspiredBy }) {
  const verb = ref_.mode === "remix" ? "Inspired by" : "Adapted from";
  const what = ref_.kind === "link" ? "a video link" : `your ${ref_.kind}`;
  return (
    <section className="card p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
        {verb} {what}
        {ref_.name ? <span className="text-ink-dim"> · {ref_.name}</span> : null}
      </div>
      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm italic text-ink-mid">
        “{ref_.excerpt}”
      </p>
      {ref_.url && (
        <a
          href={ref_.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 block truncate font-mono text-[11px] text-volt hover:underline"
        >
          {ref_.url}
        </a>
      )}
      {ref_.depth === "preview" && (
        <p className="mt-3 text-[11px] text-warn">
          Only the post&apos;s title and thumbnail could be read, so this is a looser match. For a
          closer one, install yt-dlp on the server or upload the video file.
        </p>
      )}
    </section>
  );
}
