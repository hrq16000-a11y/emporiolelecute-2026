import { useEffect, useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "emporio:reduced-motion";
const CHANGE_EVENT = "emporio:motion-change";
let memoryPreference: boolean | null = null;

function systemPrefers(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readStored(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* Keep the control usable when storage is unavailable. */ }
  return memoryPreference;
}

const getSnapshot = () => readStored() ?? systemPrefers();
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
 * - User toggle wins over system preference.
 * - Persists choice in localStorage.
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

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    memoryPreference = next;
    try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* Use memory fallback. */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Reset the in-memory preference regardless. */ }
    memoryPreference = null;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { enabled, systemEnabled, toggle, reset };
}
