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
    <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-base-0/70 backdrop-blur-xl">
      <div className="relative overflow-hidden px-10 py-8">
        <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-30" />
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40" />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            {eyebrow && (
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display text-[36px] font-semibold leading-[1.05] tracking-ultratight text-ink-hi">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-mid">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
