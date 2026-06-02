import type { FeedItem } from "../../../types";

/** A single feed article card with Claude's "why you'd like this" caption. */
export default function FeedCard({
  item,
  index = 0,
}: {
  item: FeedItem;
  index?: number;
}) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
      className="group block animate-fade-up overflow-hidden rounded-2xl border border-hairline bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-elevated"
    >
      {item.imageUrl && (
        <div className="h-28 w-full overflow-hidden">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {item.topic}
          </span>
          <span className="text-[11px] text-faint">{item.source}</span>
        </div>
        <h3 className="font-display text-[15px] font-semibold leading-snug text-ink group-hover:text-white">
          {item.title}
        </h3>
        {item.claudeCaption && (
          <p className="mt-2 border-l-2 border-warm/60 pl-2.5 text-[13px] italic leading-snug text-subtle">
            {item.claudeCaption}
          </p>
        )}
      </div>
    </a>
  );
}
