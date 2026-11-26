import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCacheCleanup } from "./cacheCleanup";

const APP_CACHE_VERSION = "2026-05-15-v1";
const STORAGE_KEY = "app:cache-version";
const RELOAD_KEY = "app:cache-cleanup-reloaded";

describe("runCacheCleanup", () => {
  const unregister = vi.fn().mockResolvedValue(true);
  const getRegistrations = vi.fn();
  const cacheDelete = vi.fn().mockResolvedValue(true);
  const cacheKeys = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    getRegistrations.mockResolvedValue([{ unregister }]);
    cacheKeys.mockResolvedValue(["legacy-cache"]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys: cacheKeys, delete: cacheDelete },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the current cache version is already installed", async () => {
    localStorage.setItem(STORAGE_KEY, APP_CACHE_VERSION);
    const reload = vi.fn();

    await expect(runCacheCleanup(reload)).resolves.toBe(false);

    expect(getRegistrations).not.toHaveBeenCalled();
    expect(cacheKeys).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("cleans legacy caches and requests exactly one reload before app boot", async () => {
    const reload = vi.fn();

    await expect(runCacheCleanup(reload)).resolves.toBe(true);

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith("legacy-cache");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_CACHE_VERSION);
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe("1");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not create a reload loop when the session reload already happened", async () => {
    sessionStorage.setItem(RELOAD_KEY, "1");
    const reload = vi.fn();

    await expect(runCacheCleanup(reload)).resolves.toBe(false);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_CACHE_VERSION);
    expect(reload).not.toHaveBeenCalled();
  });

  it("fails open when browser storage or cache cleanup is unavailable", async () => {
    getRegistrations.mockRejectedValueOnce(new Error("storage unavailable"));
    const reload = vi.fn();

    await expect(runCacheCleanup(reload)).resolves.toBe(false);

    expect(reload).not.toHaveBeenCalled();
  });
});
