// Force one-time cleanup of legacy ServiceWorkers, CacheStorage and stale
// HTTP cache entries on devices that visited the site before this version.
// Bump APP_CACHE_VERSION to trigger another cleanup in the future.
const APP_CACHE_VERSION = "2026-05-15-v1";
const STORAGE_KEY = "app:cache-version";

export async function runCacheCleanup(reload: () => void = () => window.location.reload()): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current === APP_CACHE_VERSION) return false;

    // Unregister any existing service workers (legacy installs).
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }

    // Clear all CacheStorage entries.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }

    localStorage.setItem(STORAGE_KEY, APP_CACHE_VERSION);

    // Reload once so the user immediately sees the fresh build.
    if (!sessionStorage.getItem("app:cache-cleanup-reloaded")) {
      sessionStorage.setItem("app:cache-cleanup-reloaded", "1");
      reload();
      return true;
    }
  } catch {
    // best-effort, never block app boot
  }
  return false;
}
