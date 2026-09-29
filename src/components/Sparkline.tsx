import { themeColor } from "@/lib/theme";

export function Sparkline({
  values,
  height = 28,
  stroke = themeColor.accent,
  fill = themeColor.accentSoft,
}: {
  values: number[];
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (values.length < 2) return null;
  const w = 100;
  const h = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className="block"
    >
      <path d={area} style={{ fill }} />
      <path
        d={line}
        style={{ stroke, fill: "none" }}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
