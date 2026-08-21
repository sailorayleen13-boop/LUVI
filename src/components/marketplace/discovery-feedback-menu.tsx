"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Sparkles, ThumbsDown, EyeOff } from "lucide-react";
import type { Product } from "@/lib/marketplace/types";
import { recordDiscoveryFeedback, type DiscoveryFeedbackAction } from "@/lib/marketplace/discovery-feedback";
import { useToast } from "@/lib/store/toast-context";
import { t } from "@/lib/i18n";

const MENU_WIDTH = 208;

/**
 * Subtle kebab menu on discovery product cards: "Más como esto / Menos
 * como esto / No me interesa". Rendered through a portal into
 * document.body and positioned with `fixed` coordinates computed from the
 * trigger's own bounding rect — required because every discovery card
 * lives inside HorizontalScroller's `overflow-x-auto` row, which clips any
 * normally-positioned (absolute/relative) dropdown the moment it extends
 * past the row's visible bounds. `fixed` positioning's containing block is
 * the viewport (there's no transformed ancestor here to change that), so
 * it escapes that clipping entirely — the same technique tooltip/dropdown
 * libraries use for content inside scroll containers.
 *
 * See lib/marketplace/discovery-feedback.ts for why these three actions
 * are recorded locally only for now, not written to Supabase.
 */
export function DiscoveryFeedbackMenu({
  product,
  onNotInterested,
}: {
  product: Product;
  onNotInterested: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
    }
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    // Capture phase: HorizontalScroller's own scroll doesn't bubble a
    // "scroll" event to window, but capture-phase listeners still see it
    // fire on the scrolling element itself. Simplest correct fix for a
    // fixed-position menu whose anchor just moved out from under it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleTriggerClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
      });
    }
    setOpen((current) => !current);
  }

  function handleAction(action: DiscoveryFeedbackAction, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    recordDiscoveryFeedback(product, action);
    setOpen(false);
    if (action === "more_like_this") showToast(t.feedback.moreLikeThisToast);
    else if (action === "less_like_this") showToast(t.feedback.lessLikeThisToast);
    else {
      showToast(t.feedback.notInterestedToast);
      onNotInterested();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={t.feedback.menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-charcoal-soft shadow-sm backdrop-blur-sm active:scale-90"
      >
        <MoreHorizontal size={17} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="fixed z-50 overflow-hidden rounded-2xl border border-charcoal/8 bg-white py-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction("more_like_this", e)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-charcoal active:bg-charcoal/5"
            >
              <Sparkles size={16} className="text-fucsia-dark" />
              {t.feedback.moreLikeThis}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction("less_like_this", e)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-charcoal active:bg-charcoal/5"
            >
              <ThumbsDown size={16} className="text-charcoal-soft" />
              {t.feedback.lessLikeThis}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => handleAction("not_interested", e)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-charcoal active:bg-charcoal/5"
            >
              <EyeOff size={16} className="text-charcoal-soft" />
              {t.feedback.notInterested}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
