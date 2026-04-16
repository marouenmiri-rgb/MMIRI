import clsx from "clsx";

export type PlatformKey = "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "X";

export const PLATFORM_META: Record<
  PlatformKey,
  { label: string; color: string; textOn: string; handlePrefix: string }
> = {
  TIKTOK: { label: "TikTok", color: "#ff2b66", textOn: "#ffffff", handlePrefix: "@" },
  INSTAGRAM: { label: "Instagram", color: "#e94a85", textOn: "#ffffff", handlePrefix: "@" },
  YOUTUBE: { label: "YouTube", color: "#ff3b3b", textOn: "#ffffff", handlePrefix: "" },
  X: { label: "X", color: "#f5f5f7", textOn: "#08080c", handlePrefix: "@" },
};

export function PlatformIcon({
  platform,
  className,
  filled,
}: {
  platform: PlatformKey;
  className?: string;
  filled?: boolean;
}) {
  const props = {
    className: clsx("h-4 w-4", className),
    viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  switch (platform) {
    case "TIKTOK":
      return (
        <svg {...props}>
          <path d="M15 4v8.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M15 4c.6 2.2 2 3.6 4 4" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg {...props}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17" cy="7" r="0.9" fill="currentColor" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "X":
      return (
        <svg {...props}>
          <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
        </svg>
      );
  }
}
