"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Narrowest a card may get before a column is dropped (includes card padding).
const MIN_CARD_PX = 160;
const PHONE_QUERY = "(max-width: 639px)";

/**
 * One-row shelf sizing: how many cards fit the shelf's current width (so it
 * reflows as the sidebars are resized), or swipe mode on phones.
 */
function useShelfLayout(ref) {
  const [layout, setLayout] = useState({ cols: 5, swipe: false });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia(PHONE_QUERY);
    const measure = () => {
      const cols = Math.max(2, Math.floor(el.clientWidth / MIN_CARD_PX));
      const swipe = mq.matches;
      setLayout((prev) => (prev.cols === cols && prev.swipe === swipe ? prev : { cols, swipe }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, [ref]);
  return layout;
}

export function ShelfHeader({ title, eyebrow, onShowAll }) {
  return (
    <div className="flex items-end justify-between gap-3 px-2 sm:px-3 mb-1 sm:mb-2">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] sm:text-xs font-semibold text-neutral-400 truncate mb-0.5">{eyebrow}</p>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
          {onShowAll ? (
            <button type="button" onClick={onShowAll} className="hover:underline underline-offset-2 text-left focus:outline-none focus-visible:underline">
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
      </div>
      {onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="flex-shrink-0 pb-0.5 text-xs sm:text-sm font-bold text-neutral-400 hover:text-white hover:underline underline-offset-2 transition-colors"
        >
          Show all
        </button>
      )}
    </div>
  );
}

/**
 * A titled row of cards. Desktop/tablet: exactly one row, as many columns as
 * fit, with "Show all" when there are more. Phones: a horizontal swipe row.
 */
export default function Shelf({ title, eyebrow, items, renderItem, onShowAll, swipeLimit = 20 }) {
  const ref = useRef(null);
  const { cols, swipe } = useShelfLayout(ref);
  const list = items || [];
  const shown = swipe ? list.slice(0, swipeLimit) : list.slice(0, cols);
  const hasMore = list.length > shown.length;

  return (
    <section aria-label={title} className={list.length ? "" : "hidden"}>
      <ShelfHeader title={title} eyebrow={eyebrow} onShowAll={hasMore ? onShowAll : undefined} />
      <div
        ref={ref}
        className={swipe ? "tt-swipe-row" : "grid"}
        style={swipe ? undefined : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {shown.map((item, i) => renderItem(item, i, list))}
      </div>
    </section>
  );
}
