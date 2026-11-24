import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("shared motion preference", () => {
  it("synchronizes toggles across mounted controllers and saves the choice", () => {
    const first = renderHook(() => useReducedMotion());
    const second = renderHook(() => useReducedMotion());
    act(() => first.result.current.reset());
    expect(first.result.current.enabled).toBe(false);
    act(() => second.result.current.toggle());
    expect(first.result.current.enabled).toBe(true);
    expect(second.result.current.enabled).toBe(true);
    expect(localStorage.getItem("emporio:reduced-motion")).toBe("1");
    act(() => first.result.current.toggle());
    expect(second.result.current.enabled).toBe(false);
    expect(localStorage.getItem("emporio:reduced-motion")).toBe("0");
  });

  it("restores a saved disabled-animation choice on remount", () => {
    localStorage.setItem("emporio:reduced-motion", "1");
    const hook = renderHook(() => useReducedMotion());
    expect(hook.result.current.enabled).toBe(true);
    hook.unmount();
    const restored = renderHook(() => useReducedMotion());
    expect(restored.result.current.enabled).toBe(true);
    act(() => restored.result.current.reset());
    expect(localStorage.getItem("emporio:reduced-motion")).toBeNull();
  });
});