import { m, type Variants } from "framer-motion";
import type { FeedItem } from "../../../types";

const cardVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.02 },
};

const imageVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
};

const captionVariants: Variants = {
  rest: { height: 0, opacity: 0 },
  hover: { height: "auto", opacity: 1 },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/** Fixed-size horizontal feed card for the bottom marquee strip. */
export default function FeedCardHorizontal({ item }: { item: FeedItem }) {
  const time = relativeTime(item.publishedAt);

  return (
    <m.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial="rest"
      animate="rest"
      whileHover="hover"
      variants={cardVariants}
      transition={{ type: "spring", stiffness: 230, damping: 20, mass: 0.8 }}
      className="relative block h-[180px] w-[300px] shrink-0 overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 hover:border-white/20"
    >
      {item.imageUrl ? (
        <>
          <m.img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            variants={imageVariants}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Scrim so text stays readable over the image. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-elevated" />
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-hero opacity-[0.15] blur-2xl" />
        </>
      )}

      {/* Content overlay. */}
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            {item.topic}
          </span>
          <span className="truncate text-[11px] text-subtle">
            {item.source}
            {time && <span className="text-faint"> · {time}</span>}
          </span>
        </div>

        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-ink">
          {item.title}
        </h3>

        {item.claudeCaption && (
          <m.div
            variants={captionVariants}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="line-clamp-2 border-l-2 border-warm/60 pl-2 pt-1.5 text-[12px] italic leading-snug text-subtle">
              {item.claudeCaption}
            </p>
          </m.div>
        )}
      </div>
    </m.a>
  );
}
