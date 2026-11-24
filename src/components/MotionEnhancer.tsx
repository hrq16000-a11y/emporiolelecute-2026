import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Motion global e leve: revela seções `.scroll-3d` (fallback para navegadores
 * sem animation-timeline) e aplica tilt 3D que segue o ponteiro em `.product-card`.
 * Desligado com prefers-reduced-motion ou html.motion-reduced.
 */
const MotionEnhancer = () => {
  const { enabled } = useReducedMotion();
  useEffect(() => {
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("motion-reduced");
    const resetCards = () => document.querySelectorAll<HTMLElement>(".product-card").forEach((card) => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
    resetCards();
    if (enabled || reduced()) return;

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    const observeAll = () =>
      document.querySelectorAll(".scroll-3d:not(.is-in)").forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let raf = 0;
    const onMove = (ev: PointerEvent) => {
      if (reduced() || ev.pointerType === "touch") return;
      const card = (ev.target as HTMLElement)?.closest?.(".product-card") as HTMLElement | null;
      if (!card) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (reduced() || !card.isConnected) return;
        const r = card.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
      });
    };
    const onLeave = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement)?.closest?.(".product-card") as HTMLElement | null;
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
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      resetCards();
    };
  }, [enabled]);
  return null;
};

export default MotionEnhancer;
