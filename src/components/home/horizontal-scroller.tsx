"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";

// Below this many pixels of pointer movement, a mouse-down+up is still
// treated as a plain click (so product cards / wishlist / LUVI IT keep
// working) rather than a drag.
const DRAG_THRESHOLD_PX = 6;

// The container's own px-4 (16px) inset, combined with scroll-snap-align on
// its children, means the browser settles the "resting" scrollLeft a few
// pixels off true 0 even when nothing has scrolled yet — a plain > 0
// threshold would show the prev arrow at the true start.
const EDGE_TOLERANCE_PX = 20;

/**
 * Shared horizontal-scroll primitive behind every discovery carousel
 * (Trending, New Arrivals, Drops, Stores, search's merchant row, etc.) —
 * enhancing it here is what makes drag-to-scroll and arrow controls appear
 * everywhere at once instead of being wired into each page separately.
 *
 * Mobile touch scrolling is untouched: drag-to-scroll only arms itself for
 * mouse pointer events (`pointerType === "mouse"`), so touch input keeps
 * using the browser's native momentum/snap scrolling exactly as before.
 *
 * Deliberately does NOT use the Pointer Capture API. Capturing a mouse
 * pointer on the scroller also retargets its eventual "mouseup"/"click" to
 * the capturing element instead of whatever child was actually under the
 * cursor, which would break clicks on product cards / wishlist buttons.
 * Tracking is done the classic way instead: once a real drag is confirmed,
 * pointermove/pointerup listeners are attached to `window` for the rest of
 * that gesture, so movement is tracked even if the cursor leaves the row.
 */
export function HorizontalScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    dragging: false,
    dragged: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollability = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > EDGE_TOLERANCE_PX);
    setCanScrollNext(el.scrollLeft < maxScrollLeft - EDGE_TOLERANCE_PX);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollability();

    const resizeObserver = new ResizeObserver(updateScrollability);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateScrollability, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateScrollability);
    };
  }, [updateScrollability]);

  // Plain (hoisted) function declarations, not useCallback: they only ever
  // close over refs/state-setters, which are stable identities anyway, and
  // a plain declaration lets endDrag reference itself for removeEventListener
  // without the temporal-dead-zone issue a `const foo = useCallback(() => {
  // ... foo ... })` self-reference would have.
  function handleWindowPointerMove(e: PointerEvent) {
    const el = scrollerRef.current;
    if (!el || dragState.current.pointerId !== e.pointerId) return;
    const deltaX = e.clientX - dragState.current.startX;
    if (!dragState.current.dragging && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;

    if (!dragState.current.dragging) {
      dragState.current.dragging = true;
      dragState.current.dragged = true;
      setIsDragging(true);
    }
    e.preventDefault();
    el.scrollLeft = dragState.current.startScrollLeft - deltaX;
  }

  function endDrag() {
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    scrollerRef.current?.classList.add("snap-x", "snap-mandatory");
    dragState.current.pointerId = -1;
    dragState.current.dragging = false;
    setIsDragging(false);
    // dragState.current.dragged is intentionally left as-is here — the
    // click-capture handler below reads and clears it right after this
    // pointerup's trailing click fires.
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return; // touch keeps native scrolling
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      dragging: false,
      dragged: false,
    };
    // Disable scroll-snap synchronously, imperatively, right on mousedown —
    // not gated behind a React state update (which only lands on the next
    // render). CSS scroll-snap-type: mandatory can otherwise still be in
    // effect for the first programmatic `scrollLeft` write of the gesture,
    // which was observed to disrupt the browser's own pointer-event
    // delivery for the rest of that drag at some viewport widths.
    el.classList.remove("snap-x", "snap-mandatory");
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (dragState.current.dragged) {
      // A real drag happened — swallow the trailing click so it doesn't
      // navigate a product card / toggle a wishlist button / fire LUVI IT.
      e.preventDefault();
      e.stopPropagation();
      dragState.current.dragged = false;
    }
  }

  function scrollByAmount(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative" data-testid="horizontal-scroller">
      <div
        ref={scrollerRef}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        tabIndex={0}
        role="group"
        className={`no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:cursor-grab ${
          isDragging ? "select-none md:cursor-grabbing" : "snap-x snap-mandatory"
        }`}
      >
        {children}
      </div>

      {canScrollPrev && (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label={t.common.previous}
          className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-md backdrop-blur-sm transition hover:bg-white md:flex"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label={t.common.next}
          className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-md backdrop-blur-sm transition hover:bg-white md:flex"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
