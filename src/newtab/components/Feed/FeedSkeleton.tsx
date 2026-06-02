/** Shimmering placeholder cards shown while the feed loads. */
export default function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-hairline bg-surface p-4"
        >
          <div className="shimmer h-3 w-20 rounded-full" />
          <div className="shimmer mt-3 h-4 w-3/4 rounded" />
          <div className="shimmer mt-2 h-3 w-full rounded" />
          <div className="shimmer mt-2 h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}
