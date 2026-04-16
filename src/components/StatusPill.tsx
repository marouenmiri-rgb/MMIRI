import clsx from "clsx";

const MAP: Record<string, { label: string; className: string }> = {
  QUEUED: { label: "Queued", className: "bg-ink-100 text-ink-600" },
  SCRAPING: { label: "Scraping", className: "bg-blue-50 text-blue-700" },
  WRITING: { label: "Writing", className: "bg-indigo-50 text-indigo-700" },
  DIRECTING: { label: "Directing", className: "bg-purple-50 text-purple-700" },
  RENDERING: { label: "Rendering", className: "bg-amber-50 text-amber-700" },
  READY: { label: "Ready", className: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Failed", className: "bg-rose-50 text-rose-700" },
};

export function StatusPill({ status }: { status: string }) {
  const info = MAP[status] ?? { label: status, className: "bg-ink-100 text-ink-600" };
  return <span className={clsx("pill", info.className)}>{info.label}</span>;
}
