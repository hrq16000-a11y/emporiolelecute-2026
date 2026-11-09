import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import Buscar from "@/pages/Buscar";

const fixtures = vi.hoisted(() => {
  const categories = [{ id: "soap", name: "Sabonetes", slug: "sabonetes" }];
  const products = [{
    id: "soap-heart",
    slug: "soap-heart",
    name: "Sabonete Coração",
    description: "Lembrancinha artesanal",
    long_description: null,
    price: 5,
    original_price: null,
    rating: 5,
    images: ["/placeholder.svg"],
    keywords: ["chá de bebê"],
    occasions: [],
    tags: [],
    is_active: true,
    category: categories[0],
    category_id: "soap",
  }];
  return { categories, products, rpc: vi.fn() };
});

vi.mock("@/hooks/useProducts", () => ({
  useDbProducts: () => ({ data: fixtures.products, isLoading: false }),
  useDbCategories: () => ({ data: fixtures.categories }),
  useDbOccasions: () => ({ data: [] }),
}));
vi.mock("@/hooks/useSearchCacheVersion", () => ({ useSearchCacheVersion: () => 1 }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: fixtures.rpc } }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/WhatsAppButton", () => ({ default: () => null }));
vi.mock("@/components/ProductCard", () => ({
  default: ({ product }: { product: { name: string } }) => <div data-testid="product-card">{product.name}</div>,
}));
vi.mock("@/components/SearchEmptyState", () => ({
  default: () => <div data-testid="empty-search">Nenhum produto encontrado</div>,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

const mount = (element: React.ReactNode, path = "/") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {element}<LocationDisplay />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  fixtures.rpc.mockReset();
  fixtures.rpc.mockResolvedValue({ data: { ids: ["soap-heart"], total: 1, offset: 0, has_more: false }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("storefront search regressions", () => {
  it("sends desktop header search to /buscar?q= and trims whitespace", () => {
    mount(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "  coracao  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("location").textContent).toBe("/buscar?q=coracao");
  });

  it("does not submit whitespace as a search", () => {
    mount(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("offers an accented product for an unaccented query", async () => {
    mount(<SearchBar />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "coracao" } });
    fireEvent.click(await screen.findByRole("option", { name: /Sabonete Coração/ }));
    expect(screen.getByTestId("location").textContent).toBe("/produto/soap-heart");
  });

  it.each(["coracao", "coração"])("renders server-ranked results for the query %s", async (term) => {
    mount(<Buscar />, `/buscar?q=${encodeURIComponent(term)}`);
    expect(await screen.findByTestId("product-card")).toHaveTextContent("Sabonete Coração");
    await waitFor(() => expect(fixtures.rpc).toHaveBeenCalledWith(
      "search_products",
      expect.objectContaining({ _q: term, _offset: 0 }),
    ));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a recoverable RPC error rather than a false empty result", async () => {
    fixtures.rpc
      .mockResolvedValueOnce({ data: null, error: { message: "Service unavailable", code: "XX001" } })
      .mockResolvedValueOnce({ data: { ids: ["soap-heart"], total: 1, offset: 0, has_more: false }, error: null });
    mount(<Buscar />, "/buscar?q=coracao");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Busca indisponível no momento")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-search")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByTestId("product-card")).toHaveTextContent("Sabonete Coração"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fixtures.rpc).toHaveBeenCalledTimes(2);
  });
});
