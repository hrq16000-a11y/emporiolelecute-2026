import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import CanonicalNormalizer from "./CanonicalNormalizer";

afterEach(cleanup);

function canonicalHrefs() {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')).map(link => link.href);
}

describe("CanonicalNormalizer", () => {
  it("emits one clean fallback and replaces it with route-specific metadata", async () => {
    const view = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/produtos?categoria=sabonetes&utm_source=teste"]}>
          <CanonicalNormalizer />
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(canonicalHrefs()).toEqual(["https://emporiolelecute.com.br/produtos"]));

    view.rerender(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/produtos?categoria=sabonetes&utm_source=teste"]}>
          <CanonicalNormalizer />
          <Helmet><link rel="canonical" href="https://emporiolelecute.com.br/categoria/sabonetes" /></Helmet>
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(canonicalHrefs()).toEqual(["https://emporiolelecute.com.br/categoria/sabonetes"]));
  });
});
