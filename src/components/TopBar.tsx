export function TopBar({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-ink-100 bg-white/80 px-8 py-6 backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
