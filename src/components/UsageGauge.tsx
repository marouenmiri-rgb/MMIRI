import clsx from "clsx";

export function UsageGauge({
  label,
  used,
  limit,
  color = "volt",
}: {
  label: string;
  used: number;
  limit: number;
  color?: "volt" | "lime" | "warn";
}) {
  const unlimited = !isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const near = pct >= 80;
  const over = pct >= 100;

  const bar = over
    ? "bg-danger"
    : near
      ? "bg-warn"
      : color === "lime"
        ? "bg-lime"
        : color === "warn"
          ? "bg-warn"
          : "bg-volt";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
          {label}
        </div>
        <div className="font-mono text-[11px] text-ink-mid">
          {unlimited ? (
            <span className="text-lime">unlimited</span>
          ) : (
            <>
              <span className={over ? "text-danger" : near ? "text-warn" : "text-ink-hi"}>
                {used.toLocaleString()}
              </span>
              <span className="text-ink-dim"> / {limit.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base-3">
        <div
          className={clsx("h-full transition-all duration-500", bar)}
          style={{ width: `${unlimited ? 12 : pct}%` }}
        />
      </div>
    </div>
  );
}
