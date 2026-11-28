import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { describe, expect, it, vi } from "vitest";
import HeroSlider from "./HeroSlider";

vi.mock("@/hooks/useHeroSlides", () => ({
  useHeroSlides: () => ({
    isLoading: false,
    data: [0, 1].map((position) => ({
      id: String(position), position, is_visible: true,
      title: `Slide ${position + 1}`, image_alt: `Banner ${position + 1}`,
      display_mode: "banner", image_url: null,
      image_mobile_url: `https://example.test/mobile-${position}.webp`,
      image_desktop_url: `https://example.test/desktop-${position}.webp`,
    })),
  }),
}));
vi.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => ({ enabled: true }) }));
vi.mock("@/components/TrustBadges", () => ({ default: () => null }));
vi.mock("@/components/HeroEditorialCaption", () => ({ default: () => null }));
vi.mock("@/components/HeroLoading", () => ({ default: () => null }));

describe("Responsive hero images", () => {
  it("renders one image per slide, with mobile source and only first eager/high", () => {
    const { container } = render(<HelmetProvider><HeroSlider /></HelmetProvider>);
    const pictures = container.querySelectorAll("picture.hero-banner-responsive");
    expect(pictures).toHaveLength(2);
    expect(container.querySelectorAll("#inicio img")).toHaveLength(2);
    const source = pictures[0].querySelector("source");
    expect(source?.getAttribute("media")).toBe("(max-width: 767px)");
    expect(source?.getAttribute("srcset")).toBe("https://example.test/mobile-0.webp");
    const first = pictures[0].querySelector("img");
    expect(first?.getAttribute("src")).toBe("https://example.test/desktop-0.webp");
    expect(first?.getAttribute("loading")).toBe("eager");
    expect(first?.getAttribute("fetchpriority")).toBe("high");
    expect(pictures[1].querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });
});
