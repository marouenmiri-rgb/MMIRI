/**
 * Six-cell signal grid for a 3PL lead — SKU count, est. monthly orders,
 * carrier, free-ship threshold, international flag, review count.
 * Inline tiles, monospaced numerics, dimmed labels. No charts.
 */
export function SignalsGrid({
  signals,
}: {
  signals: {
    skuCount?: number | null;
    reviewCount?: number | null;
    estMonthlyOrders?: number | null;
    hasShippingPage?: boolean;
    shipsInternationally?: boolean;
    currentCarrier?: string | null;
    freeShippingThreshold?: string | null;
  };
}) {
  const cells: { label: string; value: string; tone?: "good" | "warn" }[] = [
    {
      label: "SKUs",
      value: signals.skuCount != null ? String(signals.skuCount) : "—",
    },
    {
      label: "Orders / mo",
      value:
        signals.estMonthlyOrders != null
          ? `~${signals.estMonthlyOrders.toLocaleString()}`
          : "—",
      tone:
        signals.estMonthlyOrders != null && signals.estMonthlyOrders >= 500
          ? "good"
          : undefined,
    },
    {
      label: "Reviews",
      value:
        signals.reviewCount != null
          ? signals.reviewCount.toLocaleString()
          : "—",
    },
    {
      label: "Carrier",
      value: signals.currentCarrier ?? "unknown",
    },
    {
      label: "Free ship",
      value: signals.freeShippingThreshold
        ? `$${signals.freeShippingThreshold}+`
        : "—",
    },
    {
      label: "Intl",
      value: signals.shipsInternationally ? "yes" : "no",
      tone: signals.shipsInternationally ? "good" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-line-1 bg-base-2/60 px-3 py-2"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-dim">
            {c.label}
          </div>
          <div
            className={
              c.tone === "good"
                ? "mt-1 font-mono text-[13px] text-lime"
                : "mt-1 font-mono text-[13px] text-ink-hi"
            }
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
