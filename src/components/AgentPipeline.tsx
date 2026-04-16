import clsx from "clsx";

export type PipelineStep = {
  id: string;
  label: string;
  agent: string;
  statusKey: string; // status string that means "this step is active"
};

export const PIPELINE: PipelineStep[] = [
  { id: "scrape", label: "Observe", agent: "Scraper", statusKey: "SCRAPING" },
  { id: "write", label: "Write", agent: "Copywriter", statusKey: "WRITING" },
  { id: "direct", label: "Direct", agent: "Creative Director", statusKey: "DIRECTING" },
  { id: "render", label: "Render", agent: "Video Engine", statusKey: "RENDERING" },
  { id: "ship", label: "Ship", agent: "Outreach", statusKey: "READY" },
];

type Phase = "done" | "active" | "pending";

function phaseFor(stepIdx: number, current: string | null | undefined): Phase {
  const order = PIPELINE.map((s) => s.statusKey);
  const currentIdx = current ? order.indexOf(current) : -1;
  if (currentIdx === -1) return "pending";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

/**
 * Horizontal agent-flow — the product's identity. Shown on the dashboard
 * hero and the generator. When `current` is an active status key, that
 * step glows and pulses. Done steps light up lime; pending steps are dim.
 */
export function AgentPipeline({
  current,
  compact,
}: {
  current?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        compact ? "rounded-xl2 border border-line-1 bg-base-1/60 p-4" : "",
      )}
    >
      {!compact && <div className="grid-bg absolute inset-0 -z-0 animate-gridShift" />}
      <div className="relative z-10 flex items-stretch gap-0">
        {PIPELINE.map((step, i) => {
          const phase = phaseFor(i, current);
          return (
            <div key={step.id} className="flex flex-1 items-center">
              <StepNode step={step} phase={phase} compact={compact} index={i} />
              {i < PIPELINE.length - 1 && <Connector phase={phase} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepNode({
  step,
  phase,
  compact,
  index,
}: {
  step: PipelineStep;
  phase: Phase;
  compact?: boolean;
  index: number;
}) {
  return (
    <div
      className={clsx(
        "relative flex min-w-0 flex-col items-start gap-1.5",
        compact ? "px-3" : "px-5 py-3",
      )}
    >
      <div className="flex items-center gap-2">
        <Dot phase={phase} />
        <span
          className={clsx(
            "font-mono text-[10px] uppercase tracking-[0.22em]",
            phase === "active"
              ? "text-volt"
              : phase === "done"
                ? "text-lime"
                : "text-ink-dim",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div
        className={clsx(
          "truncate font-display leading-none tracking-tight",
          compact ? "text-sm" : "text-lg",
          phase === "pending" ? "text-ink-lo" : "text-ink-hi",
        )}
      >
        {step.label}
      </div>
      {!compact && (
        <div
          className={clsx(
            "truncate text-xs",
            phase === "active"
              ? "text-volt-400"
              : phase === "done"
                ? "text-lime/80"
                : "text-ink-dim",
          )}
        >
          {step.agent}
        </div>
      )}
    </div>
  );
}

function Dot({ phase }: { phase: Phase }) {
  if (phase === "active") {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-volt animate-pulseRing" />
        <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-volt" />
      </span>
    );
  }
  if (phase === "done") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-line-3" />;
}

function Connector({ phase }: { phase: Phase }) {
  const active = phase === "active" || phase === "done";
  return (
    <div className="relative flex-1 min-w-6">
      <div
        className={clsx(
          "h-[2px] w-full rounded",
          active ? "bg-gradient-to-r from-volt to-lime" : "bg-line-2",
        )}
      />
      {phase === "active" && (
        <div className="absolute inset-0 h-[2px] shimmer" />
      )}
    </div>
  );
}
