/**
 * Marketing visuals. These are rendered illustrations of the interface, built
 * from the same theme tokens as the real app, so they follow whatever palette
 * the visitor has selected and never drift from the product's actual look.
 *
 * They are drawings of the UI, not screenshots of anyone's account — no claim
 * is made that the figures belong to a real store.
 */

/** A browser-chromed shot of the control room. */
export function ProductShot() {
  return (
    <div className="relative">
      {/* Glow pooled under the frame so it lifts off the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -bottom-6 h-24 rounded-[50%] opacity-60 blur-3xl"
        style={{ background: "rgb(var(--accent-500) / 0.35)" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-line-2 bg-base-1 shadow-float">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-line-1 bg-base-3/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint/60" />
          <div className="ml-3 flex-1 rounded-md bg-base-1 px-3 py-1 text-center font-mono text-[10px] text-ink-dim">
            adgen.app/dashboard
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-[168px] shrink-0 flex-col gap-1 border-r border-line-1 bg-base-1/60 p-3 sm:flex">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="grid h-5 w-5 place-items-center rounded-md text-[9px] font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--accent-400)), rgb(var(--accent-500)) 55%, rgb(var(--ribbon-cyan)))",
                }}
              >
                A
              </span>
              <span className="text-[12px] font-semibold tracking-tight text-ink-hi">
                AdGen
              </span>
            </div>
            {[
              ["Control room", true],
              ["Generator", false],
              ["Hook Radar", false],
              ["Auto-pilot", false],
              ["Revenue", false],
              ["Clients", false],
            ].map(([label, on]) => (
              <div
                key={String(label)}
                className={`rounded-md px-2 py-1.5 text-[11px] ${
                  on
                    ? "bg-volt/10 font-semibold text-ink-hi"
                    : "text-ink-lo"
                }`}
              >
                {label as string}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-volt">
              Control room
            </div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight text-ink-hi sm:text-[22px]">
              Director&apos;s dashboard
            </div>

            {/* URL bar */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-line-1 bg-base-1 px-3 py-2 shadow-xs">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-volt">
                URL
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-lo">
                yourstore.com/products/pour-over-kettle
              </span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(180deg, rgb(var(--accent-400)), rgb(var(--accent-500)))",
                }}
              >
                Generate
              </span>
            </div>

            {/* Pipeline */}
            <div className="mt-3 rounded-xl border border-line-1 bg-base-1 p-3 shadow-xs">
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  ["Observe", "done"],
                  ["Write", "done"],
                  ["Direct", "done"],
                  ["Render", "now"],
                  ["Ship", "todo"],
                ].map(([label, state]) => (
                  <div key={String(label)} className="min-w-0">
                    <div
                      className={`text-[10px] font-medium ${
                        state === "todo" ? "text-ink-dim" : "text-ink-hi"
                      }`}
                    >
                      {label as string}
                    </div>
                    <div
                      className="mt-1 h-[3px] rounded-full"
                      style={{
                        background:
                          state === "done"
                            ? "rgb(var(--mint-500))"
                            : state === "now"
                              ? "rgb(var(--accent-500))"
                              : "rgb(var(--line-2))",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tiles */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Videos", "24"],
                ["Clicks", "1,840"],
                ["Attributed", "$4,182"],
              ].map(([k, v], i) => (
                <div
                  key={String(k)}
                  className="rounded-xl border border-line-1 bg-base-1 p-2.5 shadow-xs"
                >
                  <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink-dim">
                    {k as string}
                  </div>
                  <div
                    className={`mt-0.5 text-[16px] font-bold tabular-nums tracking-tight ${
                      i === 2 ? "text-mint" : "text-ink-hi"
                    }`}
                  >
                    {v as string}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A 9:16 phone showing the output format: product frame with the caption
 * style the renderer actually burns in — bold, lower third, outlined.
 */
export function PhoneAd({
  caption = "Your coffee deserves better than a kitchen tap.",
  className = "",
}: {
  caption?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[220px] overflow-hidden rounded-[28px] border-[6px] border-base-4 bg-base-0 shadow-float ${className}`}
      style={{ aspectRatio: "9 / 16" }}
    >
      {/* Stand-in for the product photograph the renderer pulls from the page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgb(var(--ribbon-violet) / 0.55), rgb(var(--accent-600) / 0.75) 55%, rgb(var(--ribbon-cyan) / 0.45))",
        }}
      />
      <div className="grid-bg absolute inset-0 opacity-30" />

      {/* Caption, styled to match the burned-in ASS style. */}
      <div className="absolute inset-x-3 bottom-[16%] text-center">
        <p
          className="text-[13px] font-extrabold leading-[1.25] text-white"
          style={{
            textShadow:
              "0 0 3px #000, 0 0 3px #000, 0 2px 4px rgba(0,0,0,0.6), 1px 1px 0 #000, -1px -1px 0 #000",
          }}
        >
          {caption}
        </p>
      </div>

      <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-white backdrop-blur">
        9:16 · 1080×1920
      </div>
    </div>
  );
}
