import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setPrivateMotionScope, useReducedMotion } from "./useReducedMotion";

afterEach(() => {
  cleanup();
  setPrivateMotionScope(null, false);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("shared motion preference", () => {
  it("synchronizes private scope across controllers and clears it on exit", () => {
    const first = renderHook(() => useReducedMotion());
    const second = renderHook(() => useReducedMotion());
    act(() => setPrivateMotionScope(null, false));
    expect(first.result.current.enabled).toBe(false);
    act(() => setPrivateMotionScope('authorized-account', true));
    expect(first.result.current.enabled).toBe(true);
    expect(second.result.current.enabled).toBe(true);
    act(() => setPrivateMotionScope(null, false));
    expect(second.result.current.enabled).toBe(false);
  });

  it("ignores legacy public device preference for anonymous visitors", () => {
    localStorage.setItem("emporio:reduced-motion", "1");
    const hook = renderHook(() => useReducedMotion());
    expect(hook.result.current.enabled).toBe(false);
    hook.unmount();
    const restored = renderHook(() => useReducedMotion());
    expect(restored.result.current.enabled).toBe(false);
  });

  it("reports system reduction even when the saved site choice enables motion", () => {
    localStorage.setItem("emporio:reduced-motion", "0");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true, media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const hook = renderHook(() => useReducedMotion());
    expect(hook.result.current.enabled).toBe(true);
    expect(hook.result.current.systemEnabled).toBe(true);
  });
});