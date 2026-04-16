import clsx from "clsx";

const MAP: Record<string, { label: string; className: string; dot?: string }> = {
  QUEUED: {
    label: "Queued",
    className: "bg-base-3 text-ink-mid border border-line-2",
    dot: "bg-ink-lo",
  },
  SCRAPING: {
    label: "Scraping",
    className: "bg-volt/10 text-volt-400 border border-volt/30",
    dot: "bg-volt",
  },
  WRITING: {
    label: "Writing",
    className: "bg-volt/10 text-volt-400 border border-volt/30",
    dot: "bg-volt",
  },
  DIRECTING: {
    label: "Directing",
    className: "bg-volt/10 text-volt-400 border border-volt/30",
    dot: "bg-volt",
  },
  RENDERING: {
    label: "Rendering",
    className: "bg-warn/10 text-warn border border-warn/30",
    dot: "bg-warn",
  },
  READY: {
    label: "On air",
    className: "bg-lime/10 text-lime border border-lime/30",
    dot: "bg-lime",
  },
  FAILED: {
    label: "Failed",
    className: "bg-danger/10 text-danger border border-danger/30",
    dot: "bg-danger",
  },
};

export function StatusPill({ status }: { status: string }) {
  const info =
    MAP[status] ?? {
      label: status,
      className: "bg-base-3 text-ink-mid border border-line-2",
      dot: "bg-ink-lo",
    };
  const isLive = status !== "READY" && status !== "FAILED" && status !== "QUEUED";
  return (
    <span className={clsx("pill", info.className)}>
      <span
        className={clsx(
          "inline-block h-1.5 w-1.5 rounded-full",
          info.dot,
          isLive && "animate-pulseRing",
        )}
      />
      {info.label}
    </span>
  );
}
