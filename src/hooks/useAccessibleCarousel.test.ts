import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccessibleCarousel } from "./useAccessibleCarousel";

function setupDom(total: number, itemW = 100, viewport = 100) {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "clientWidth", { configurable: true, value: viewport });
  Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: itemW * total });
  scroller.scrollLeft = 0;
  scroller.scrollTo = vi.fn((opts: ScrollToOptions) => {
    scroller.scrollLeft = opts.left ?? 0;
  }) as unknown as typeof scroller.scrollTo;
  scroller.scrollBy = vi.fn(({ left }: ScrollToOptions) => {
    scroller.scrollLeft += (left as number) ?? 0;
  }) as unknown as typeof scroller.scrollBy;
  const items: HTMLElement[] = [];
  for (let i = 0; i < total; i++) {
    const el = document.createElement("a");
    Object.defineProperty(el, "offsetLeft", { configurable: true, value: i * itemW });
    Object.defineProperty(el, "offsetWidth", { configurable: true, value: itemW });
    el.focus = vi.fn();
    items.push(el);
  }
  return { scroller, items };
}

/** Render hook with DOM attached AND scroll listener wired up. */
function mount(total: number, itemW = 100, viewport = 100, threshold?: number) {
  const dom = setupDom(total, itemW, viewport);
  // Start with total=0 so first effect doesn't add a listener; then rerender
  // with the real total — at that point refs are set and the listener attaches.
  const { result, rerender } = renderHook(
    ({ t }) => useAccessibleCarousel({
      storageKey: `t:${Math.random()}`,
      total: t,
      activeSwitchThreshold: threshold,
    }),
    { initialProps: { t: 0 } },
  );
  (result.current.scrollerRef as React.MutableRefObject<HTMLDivElement | null>).current = dom.scroller;
  (result.current.itemsRef as React.MutableRefObject<Array<HTMLElement | null>>).current = dom.items;
  act(() => rerender({ t: total }));
  return { result, ...dom };
}

function scrollTo(scroller: HTMLDivElement, left: number) {
  scroller.scrollLeft = left;
  act(() => { scroller.dispatchEvent(new Event("scroll")); });
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
  localStorage.clear();
  sessionStorage.clear();
});

describe("useAccessibleCarousel — anti-flicker threshold (18px)", () => {
  it("ignores micro-movements (<18px gap to active)", () => {
    // 3 items of 100px, viewport 100. Item centers: 50, 150, 250.
    const { result, scroller } = mount(3);
    expect(result.current.activeIdx).toBe(0);

    // scrollLeft=8 -> center=58. dist0=8, dist1=92. active stays 0.
    scrollTo(scroller as HTMLDivElement, 8);
    expect(result.current.activeIdx).toBe(0);

    // scrollLeft=55 -> center=105. dist0=55, dist1=45. gap=10 (<18). stay 0.
    scrollTo(scroller as HTMLDivElement, 55);
    expect(result.current.activeIdx).toBe(0);
  });

  it("switches when candidate is ≥18px closer than current active", () => {
    const { result, scroller } = mount(3);
    // scrollLeft=68 -> center=118. dist0=68, dist1=32. gap=36 (>18). switch.
    scrollTo(scroller as HTMLDivElement, 68);
    expect(result.current.activeIdx).toBe(1);
  });

  it("respects custom activeSwitchThreshold (40px ignores 36px gap)", () => {
    const { result, scroller } = mount(3, 100, 100, 40);
    scrollTo(scroller as HTMLDivElement, 68);
    expect(result.current.activeIdx).toBe(0);
  });
});

describe("useAccessibleCarousel — keyboard navigation", () => {
  it("ArrowRight / ArrowLeft / Home / End with bounds", () => {
    const { result } = mount(4);
    const press = (key: string) => act(() => {
      result.current.onKeyDown({ key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>);
    });

    press("ArrowRight"); expect(result.current.activeIdx).toBe(1);
    press("End");        expect(result.current.activeIdx).toBe(3);
    press("ArrowRight"); expect(result.current.activeIdx).toBe(3); // clamped
    press("ArrowLeft");  expect(result.current.activeIdx).toBe(2);
    press("Home");       expect(result.current.activeIdx).toBe(0);
    press("ArrowLeft");  expect(result.current.activeIdx).toBe(0); // clamped
  });

  it("scrollBy delegates to the underlying scroller", () => {
    const { result, scroller } = mount(4, 100, 300);
    act(() => result.current.scrollBy(1));
    expect((scroller as HTMLDivElement).scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number), behavior: "smooth" }),
    );
  });
});

describe("useAccessibleCarousel — keyboard intent ownership", () => {
  it("keeps End selected through intermediate scroll events, then returns to geometry on direct input", () => {
    const { result, scroller } = mount(4);
    act(() => result.current.onKeyDown({ key: "End", preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>));
    expect(result.current.activeIdx).toBe(3);

    // Native smooth scroll may publish positions of several other cards.
    scrollTo(scroller, 90);
    scrollTo(scroller, 190);
    expect(result.current.activeIdx).toBe(3);

    // A user-controlled wheel or touch/drag must regain selection ownership.
    act(() => { scroller.dispatchEvent(new Event("wheel")); });
    scrollTo(scroller, 100);
    expect(result.current.activeIdx).toBe(1);

    act(() => result.current.onKeyDown({ key: "Home", preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>));
    expect(result.current.activeIdx).toBe(0);
    act(() => result.current.pointerHandlers.onPointerDown({ pointerType: "touch" } as React.PointerEvent<HTMLDivElement>));
    scrollTo(scroller, 200);
    expect(result.current.activeIdx).toBe(2);
  });
});
