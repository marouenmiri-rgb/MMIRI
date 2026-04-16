import Link from "next/link";
import clsx from "clsx";
import { StatusPill } from "./StatusPill";

type Ad = {
  id: string;
  productTitle?: string | null;
  productUrl: string;
  status: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string | Date;
};

/**
 * Vertical 9:16 "reel" card — the main way ads are displayed in this app,
 * instead of table rows. Hover lifts + glows. Thumbnail fills; gradient
 * overlay keeps the title legible regardless of the image behind it.
 */
export function AdReelCard({ ad }: { ad: Ad }) {
  const title = ad.productTitle ?? "Untitled";
  const date = new Date(ad.createdAt);
  const isReady = ad.status === "READY";

  return (
    <Link
      href={`/generator?id=${ad.id}`}
      className="group relative block aspect-[9/16] overflow-hidden rounded-xl2 border border-line-1 bg-base-2 transition-all hover:-translate-y-1 hover:border-volt/50 hover:shadow-glow"
    >
      {ad.thumbnailUrl ? (
        <img
          src={ad.thumbnailUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition group-hover:opacity-100 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 spot" />
      )}

      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-base-0 via-base-0/60 to-transparent" />

      {/* top-left: status */}
      <div className="absolute left-3 top-3">
        <StatusPill status={ad.status} />
      </div>

      {/* top-right: play chip */}
      {isReady && ad.videoUrl && (
        <div className="absolute right-3 top-3 chip-live">
          <span className="dot-live" /> Ready
        </div>
      )}

      {/* bottom: meta */}
      <div className="absolute inset-x-3 bottom-3 space-y-1">
        <div
          className={clsx(
            "font-display leading-tight tracking-tight text-ink-hi text-[15px]",
            "line-clamp-2",
          )}
        >
          {title}
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-mid">
          <span className="font-mono uppercase tracking-wider">
            #{ad.id.slice(0, 6)}
          </span>
          <span>{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    </Link>
  );
}
