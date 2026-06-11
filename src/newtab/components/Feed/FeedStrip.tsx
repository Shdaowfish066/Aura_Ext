import { useRef, useState } from "react";
import type { FeedItem } from "../../../types";
import { useMarquee } from "../../hooks/useMarquee";
import FeedCardHorizontal from "./FeedCardHorizontal";

type Props = {
  items: FeedItem[];
  loading: boolean;
  reshuffling: boolean;
  stale: boolean;
  feedError: string | null;
  aiActive: boolean;
  onRefresh: () => void;
};

const MIN_ITEMS_FOR_MARQUEE = 5;

/**
 * Full-width auto-scrolling feed strip pinned to the bottom of the dashboard.
 * Items render twice for a seamless marquee wrap (see useMarquee).
 */
export default function FeedStrip({
  items,
  loading,
  reshuffling,
  stale,
  feedError,
  aiActive,
  onRefresh,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Mouse drag-to-scroll state (touch scrolling is native). Recent pointer
  // samples feed the release "flick" so dragging glides instead of stopping.
  const drag = useRef({
    down: false,
    startX: 0,
    startScroll: 0,
    moved: 0,
    lastX: 0,
    lastT: 0,
    vx: 0, // px/ms, smoothed
  });

  const marqueeEnabled =
    !loading && !reshuffling && items.length >= MIN_ITEMS_FOR_MARQUEE;

  const { nudge, stop } = useMarquee(scrollerRef, {
    enabled: marqueeEnabled,
    direction,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
    };
    stop(); // grabbing kills any in-flight momentum
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.down) return;
    const d = drag.current;
    const dx = e.clientX - d.startX;
    el.scrollLeft = d.startScroll - dx;
    d.moved = Math.max(d.moved, Math.abs(dx));

    const t = performance.now();
    const dt = t - d.lastT;
    if (dt > 0) {
      const instant = (e.clientX - d.lastX) / dt;
      d.vx = d.vx * 0.7 + instant * 0.3; // low-pass for a stable flick reading
      d.lastX = e.clientX;
      d.lastT = t;
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    scrollerRef.current?.releasePointerCapture(e.pointerId);
    // Flick: convert px/ms pointer velocity into px/frame scroll momentum.
    // Pointer moving right scrolls content left (scrollLeft decreases).
    if (Math.abs(d.vx) > 0.15) nudge(-d.vx * 16);
  };

  // A real drag shouldn't open the card the pointer happened to land on.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved > 8) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = 0;
    }
  };

  // Mouse wheel (vertical or horizontal) glides the strip with inertia.
  const onWheel = (e: React.WheelEvent) => {
    nudge((e.deltaY + e.deltaX) * 0.15);
  };

  const showSkeletons = loading && items.length === 0;

  return (
    <div className="min-h-0">
      {/* Header row */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
            For you
          </h2>

          {aiActive && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              ✦ AI curated
            </span>
          )}
          {stale && (
            <span className="rounded-full bg-warm/15 px-2 py-0.5 text-[10px] font-medium text-warm">
              cached
            </span>
          )}
          {reshuffling && (
            <span className="shimmer rounded-full px-2.5 py-0.5 text-[10px] font-medium text-subtle">
              tuning…
            </span>
          )}
          {feedError && (
            <span
              className="max-w-[280px] truncate rounded-full border border-warm/30 bg-warm/10 px-2 py-0.5 text-[10px] font-medium text-warm"
              title={feedError}
            >
              ⚠ {feedError}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 1 ? -1 : 1))}
            title={
              direction === 1
                ? "Scrolling forward — click to reverse"
                : "Scrolling backward — click to reverse"
            }
            aria-label="Toggle scroll direction"
            className="rounded-full border border-hairline px-2.5 py-1 text-xs text-subtle transition-colors hover:border-primary/50 hover:text-ink"
          >
            {direction === 1 ? "→" : "←"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh feed"
            className="rounded-full border border-hairline px-2.5 py-1 text-xs text-subtle transition-colors hover:border-primary/50 hover:text-ink disabled:opacity-40"
          >
            <span
              className={`inline-block ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            >
              ↻
            </span>
            <span className="ml-1.5">Refresh</span>
          </button>
        </div>
      </div>

      {/* The strip */}
      <div className="group/strip relative">
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onWheel={onWheel}
          onDragStart={(e) => e.preventDefault()}
          /* pt-3/-mt-3: headroom inside the scroll clip so cards can lift on
             hover without being cut off at the top. */
          className={`-mt-3 flex cursor-grab gap-4 overflow-x-auto pb-2.5 pt-3 transition-opacity duration-300 active:cursor-grabbing select-none ${
            reshuffling ? "opacity-40" : "opacity-100"
          }`}
        >
        {showSkeletons ? (
          Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="shimmer h-[180px] w-[300px] shrink-0 rounded-2xl"
            />
          ))
        ) : items.length === 0 ? (
          <div className="flex h-[180px] w-full items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-faint">
            No stories right now. Try refreshing in a moment.
          </div>
        ) : (
          <>
            {items.map((item) => (
              <FeedCardHorizontal key={item.id} item={item} />
            ))}
            {/* Duplicate pass for seamless marquee wrap. */}
            {marqueeEnabled && (
              <div aria-hidden="true" className="contents">
                {items.map((item) => (
                  <FeedCardHorizontal key={`${item.id}-dup`} item={item} />
                ))}
              </div>
            )}
          </>
        )}
        </div>

        {/* Drag affordance — fades in when the pointer is over the strip. */}
        {!showSkeletons && items.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 right-1 rounded-full border border-hairline bg-base/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-subtle opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/strip:opacity-100"
          >
            drag ⇄
          </div>
        )}
      </div>
    </div>
  );
}
