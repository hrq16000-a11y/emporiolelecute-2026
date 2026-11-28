import { afterEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { installSeoFallbacks } from "./seoFallbacks";

let head: HTMLHeadElement;
let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
  stop = undefined;
  head?.remove();
});

describe("SEO HTML fallbacks", () => {
  it("keeps entry fallback until a matching route tag mounts, and restores it on unmount", async () => {
    head = document.createElement("head");
    head.innerHTML = '<title data-seo-fallback>Loja</title><meta data-seo-fallback name="description" content="Loja"><meta data-seo-fallback property="og:image" content="/og-image.webp"><meta name="google-site-verification" content="keep"><link rel="canonical" href="https://emporiolelecute.com.br/"><script type="application/ld+json">{}</script>';
    stop = installSeoFallbacks(head);
    expect(head.querySelectorAll("title")).toHaveLength(1);
    const title = document.createElement("title");
    title.textContent = "Produto";
    const description = document.createElement("meta");
    description.name = "description";
    description.content = "Descrição do produto";
    const image = document.createElement("meta");
    image.setAttribute("property", "og:image");
    image.content = "https://emporiolelecute.com.br/produto.webp";
    head.append(title, description, image);
    await waitFor(() => {
      expect(head.querySelectorAll("title")).toHaveLength(1);
      expect(head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
      expect(head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    });
    expect(head.querySelector("title")).toBe(title);
    expect(head.querySelector('meta[name="description"]')).toBe(description);
    expect(head.querySelector('meta[property="og:image"]')).toBe(image);
    expect(head.querySelector('meta[name="google-site-verification"]')?.getAttribute("content")).toBe("keep");
    expect(head.querySelector('link[rel="canonical"]')).not.toBeNull();
    expect(head.querySelector('script[type="application/ld+json"]')).not.toBeNull();

    // A route replacement in the same commit should not expose old fallback.
    const nextTitle = document.createElement("title");
    nextTitle.textContent = "Natal";
    title.replaceWith(nextTitle);
    image.remove();
    await waitFor(() => {
      expect(head.querySelectorAll("title")).toHaveLength(1);
      expect(head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe("/og-image.webp");
    });
    expect(head.querySelector("title")).toBe(nextTitle);
    nextTitle.remove();
    description.remove();
    await waitFor(() => {
      expect(head.querySelector("title")?.textContent).toBe("Loja");
      expect(head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Loja");
    });
  });

  it("does not remove route-owned tags or unmatched fallbacks", async () => {
    head = document.createElement("head");
    head.innerHTML = '<meta data-seo-fallback name="twitter:image" content="/default.webp"><meta data-seo-fallback property="og:image" content="/default.webp"><meta property="og:image" content="/product.webp"><meta property="og:image" content="/detail.webp"><meta name="robots" content="noindex,follow">';
    stop = installSeoFallbacks(head);
    expect(head.querySelectorAll('meta[property="og:image"]')).toHaveLength(2);
    expect(head.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe("/default.webp");
    expect(head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,follow");
  });
});
