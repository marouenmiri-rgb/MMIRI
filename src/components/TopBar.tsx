export function TopBar({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-line-1 bg-base-0/80 px-8 py-7 backdrop-blur">
      <div className="grid-bg absolute inset-0 -z-0 animate-gridShift opacity-60" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          {eyebrow && (
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-[30px] font-semibold leading-none tracking-tightest text-ink-hi">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-xl text-sm text-ink-mid">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
