import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Unique key for persisting scroll position. */
  storageKey: string;
  /** Total number of items in the carousel. */
  total: number;
  /** Whether items are still loading (skip restore until done). */
  isLoading?: boolean;
  /** Px threshold for switching the active card (debounce flicker). */
  activeSwitchThreshold?: number;
  /** Trigger haptic feedback when active item changes. */
  haptic?: boolean;
}

/**
 * Shared accessible carousel logic for touch, mouse, and keyboard.
 * Used by both CategoriesScroll and OccasionsThumbs to keep behavior consistent.
 */
export function useAccessibleCarousel({
  storageKey,
  total,
  isLoading,
  activeSwitchThreshold = 18,
  haptic = false,
}: Options) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const lastActiveRef = useRef(0);
  const lastBestDistRef = useRef(Infinity);
  const persistRaf = useRef<number | null>(null);

  // ---------- Drag-to-scroll (desktop pointer) ----------
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const DRAG_THRESHOLD = 6;
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return; // let native touch handle mobile
    const el = scrollerRef.current;
    if (!el) return;
    // Do NOT setPointerCapture here — it hijacks click events from child <Link>s.
    // We only mark drag active; capture is engaged lazily once movement exceeds threshold.
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.abs(dx);
    // Engage drag state (and capture) only after real movement, so simple clicks
    // on child links keep working untouched.
    if (drag.current.moved > DRAG_THRESHOLD) {
      if (!isDragging) setIsDragging(true);
      try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
      el.scrollLeft = drag.current.startLeft - dx;
    }
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (isDragging) setIsDragging(false);
    const el = scrollerRef.current;
    if (el) {
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = 0;
    }
  };

  // ---------- Active index + persistence ----------
  const updateState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);

    // offsetLeft is relative to offsetParent, not necessarily this scroller.
    // getBoundingClientRect keeps selection correct inside transformed home sections.
    const scrollerRect = el.getBoundingClientRect();
    const center = scrollerRect.left + scrollerRect.width / 2;
    let bestIdx = lastActiveRef.current;
    let bestDist = Infinity;
    let activeDist = Infinity;
    itemsRef.current.forEach((node, i) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const d = Math.abs(rect.left + rect.width / 2 - center);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
      if (i === lastActiveRef.current) activeDist = d;
    });

    // Anti-flicker: only switch when the new candidate is at least
    // `activeSwitchThreshold` pixels closer to center than the
    // currently-active item. Micro-movements never cross this gap.
    const shouldSwitch =
      bestIdx !== lastActiveRef.current &&
      activeDist - bestDist > activeSwitchThreshold;

    if (shouldSwitch) {
      if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(8); } catch { /* noop */ }
      }
      lastActiveRef.current = bestIdx;
      lastBestDistRef.current = bestDist;
      setActiveIdx(bestIdx);
    } else if (bestIdx === lastActiveRef.current) {
      lastBestDistRef.current = bestDist;
    }

    if (persistRaf.current == null) {
      persistRaf.current = requestAnimationFrame(() => {
        persistRaf.current = null;
        const left = String(el.scrollLeft);
        try { sessionStorage.setItem(storageKey, left); } catch { /* noop */ }
        try { localStorage.setItem(storageKey, left); } catch { /* noop */ }
      });
    }
  }, [activeSwitchThreshold, haptic, storageKey]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const initialFrame = requestAnimationFrame(updateState);
    el.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateState) : null;
    observer?.observe(el);
    itemsRef.current.forEach((node) => {
      if (node) observer?.observe(node);
    });
    return () => {
      cancelAnimationFrame(initialFrame);
      observer?.disconnect();
      el.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [updateState, total]);

  useEffect(() => {
    if (isLoading || total === 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey);
      if (saved) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n)) el.scrollLeft = n;
      }
    } catch { /* noop */ }
  }, [isLoading, total, storageKey]);

  const scrollToIndex = useCallback((i: number, focus = false) => {
    const node = itemsRef.current[i];
    const el = scrollerRef.current;
    if (!node || !el) return;
    const scrollerRect = el.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const scaleX = scrollerRect.width > 0 && el.clientWidth > 0
      ? scrollerRect.width / el.clientWidth
      : 1;
    const nodeCenterInContent =
      el.scrollLeft + (nodeRect.left - scrollerRect.left) / scaleX + nodeRect.width / scaleX / 2;
    const target = nodeCenterInContent - el.clientWidth / 2;
    el.scrollTo({ left: target, behavior: "smooth" });
    if (focus) requestAnimationFrame(() => node.focus({ preventScroll: true }));
  }, []);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 600), behavior: "smooth" });
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!total) return;
    let next = activeIdx;
    switch (e.key) {
      case "ArrowRight": next = Math.min(activeIdx + 1, total - 1); break;
      case "ArrowLeft":  next = Math.max(activeIdx - 1, 0); break;
      case "Home":       next = 0; break;
      case "End":        next = total - 1; break;
      default: return;
    }
    e.preventDefault();
    setActiveIdx(next);
    lastActiveRef.current = next;
    scrollToIndex(next, true);
  }, [activeIdx, total, scrollToIndex]);

  return {
    scrollerRef,
    itemsRef,
    activeIdx,
    canLeft,
    canRight,
    isDragging,
    scrollBy,
    scrollToIndex,
    onKeyDown,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}
