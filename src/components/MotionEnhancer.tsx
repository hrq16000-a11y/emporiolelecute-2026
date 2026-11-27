import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Motion de mídia: tilt 3D segue o ponteiro apenas na foto; os controles e
 * a geometria dos cards permanecem estáticos.
 * Desligado com prefers-reduced-motion ou html.motion-reduced.
 */
const MotionEnhancer = () => {
  const { enabled } = useReducedMotion();
  useEffect(() => {
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("motion-reduced");
    const resetCards = () => document.querySelectorAll<HTMLElement>(".product-card-media").forEach((card) => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
    resetCards();
    if (enabled || reduced()) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let raf = 0;
    const onMove = (ev: PointerEvent) => {
      if (reduced() || ev.pointerType === "touch") return;
      const card = (ev.target as HTMLElement)?.closest?.(".product-card-media") as HTMLElement | null;
      if (!card) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (reduced() || !card.isConnected) return;
        const r = card.getBoundingClientRect();
        const x = Math.max(-0.5, Math.min(0.5, (ev.clientX - r.left) / r.width - 0.5));
        const y = Math.max(-0.5, Math.min(0.5, (ev.clientY - r.top) / r.height - 0.5));
        card.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
      });
    };
    const onLeave = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement)?.closest?.(".product-card-media") as HTMLElement | null;
      if (card && !card.contains(ev.relatedTarget as Node)) {
        cancelAnimationFrame(raf);
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      }
    };
    if (fine) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onLeave, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      resetCards();
    };
  }, [enabled]);
  return null;
};

export default MotionEnhancer;
