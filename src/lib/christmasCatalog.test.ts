import { describe, expect, it } from "vitest";
import { selectChristmasProducts } from "./christmasCatalog";

type Product = {
  id: string; name: string; slug: string; is_active: boolean; images: string[];
  occasions: { slug: string }[]; category: { slug: string } | null; tags: { slug: string }[];
};
const make = (id: string, overrides: Partial<Product> = {}): Product => ({
  id, name: "Produto real", slug: id, is_active: true, images: ["/product.webp"],
  occasions: [], category: null, tags: [], ...overrides,
});

describe("vitrine Natal vinculada ao catálogo real", () => {
  it("inclui por ocasião de Natal, categoria ou tag", () => {
    const items = [
      make("a", { occasions: [{ slug: "natal-e-ano-novo" }] }),
      make("b", { category: { slug: "natal" } }),
      make("c", { tags: [{ slug: "lembrancinhas-natal" }] }),
      make("d", { name: "Natal", category: { slug: "maternidade" } }),
    ];
    expect(selectChristmasProducts(items).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("não exibe inativos e preserva ordem do catálogo", () => {
    const items = [
      make("new", { occasions: [{ slug: "natal-e-ano-novo" }] }),
      make("inactive", { is_active: false, category: { slug: "natal" } }),
      make("old", { tags: [{ slug: "natal" }] }),
    ];
    expect(selectChristmasProducts(items).map((x) => x.id)).toEqual(["new", "old"]);
  });

  it("não mistura ocasião genérica com Natal", () => {
    expect(selectChristmasProducts([make("maternity", { occasions: [{ slug: "maternidade" }] })])).toHaveLength(0);
  });
});
