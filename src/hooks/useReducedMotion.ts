import { useEffect, useSyncExternalStore } from "react";

const CHANGE_EVENT = "emporio:motion-change";
let privateScope: string | null = null;
let privateReduced = false;

export const setPrivateMotionScope = (userId: string | null, reduced: boolean) => {
  privateScope = userId;
  privateReduced = Boolean(userId && reduced);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
};

function systemPrefers(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const getSnapshot = () => Boolean(privateScope && privateReduced) || systemPrefers();
const getCombinedSnapshot = () => `${getSnapshot() ? '1' : '0'}:${systemPrefers() ? '1' : '0'}`;
const subscribe = (notify: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  mq.addEventListener("change", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
    mq.removeEventListener("change", notify);
  };
};

/**
 * Reduced-motion controller.
 * - Public motion is on unless the operating system requests reduction.
 * - Authorized panel supplies its account preference; leaving clears scope.
 * - Applies `motion-reduced` class to <html> for CSS to react.
 */
export function useReducedMotion() {
  const snapshot = useSyncExternalStore(subscribe, getCombinedSnapshot, () => '0:0');
  const enabled = snapshot.startsWith('1');
  const systemEnabled = snapshot.endsWith('1');

  // Reflect on <html> so global CSS can opt-out animations.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("motion-reduced", enabled);
  }, [enabled]);

  return { enabled, systemEnabled };
}
