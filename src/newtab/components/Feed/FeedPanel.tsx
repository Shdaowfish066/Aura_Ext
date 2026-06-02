import type { FeedItem } from "../../../types";
import FeedCard from "./FeedCard";
import FeedSkeleton from "./FeedSkeleton";

type Props = {
  items: FeedItem[];
  loading: boolean;
  reshuffling: boolean;
  stale: boolean;
  onRefresh: () => void;
};

export default function FeedPanel({
  items,
  loading,
  reshuffling,
  stale,
  onRefresh,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">
            Your Feed
          </h2>
          {stale && (
            <span className="rounded-full bg-warm/15 px-2 py-0.5 text-[10px] font-medium text-warm">
              cached
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-full border border-hairline px-3 py-1 text-xs text-subtle transition-colors hover:border-primary/50 hover:text-ink disabled:opacity-40"
        >
          {reshuffling ? "Reshuffling…" : "Refresh"}
        </button>
      </div>

      <div className="-mr-2 flex-1 overflow-y-auto pr-2">
        {loading ? (
          <FeedSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline p-8 text-center text-sm text-faint">
            No stories right now. Try refreshing in a moment.
          </div>
        ) : (
          <div
            className={`flex flex-col gap-3 transition-opacity duration-300 ${
              reshuffling ? "opacity-40" : "opacity-100"
            }`}
          >
            {items.map((item, i) => (
              <FeedCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
