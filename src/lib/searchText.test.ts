import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "./searchText";

describe("normalizeSearchText", () => {
  it("finds accented products with unaccented queries", () => {
    expect(normalizeSearchText("Sabonete Coração")).toContain(normalizeSearchText("coracao"));
    expect(normalizeSearchText("Sabonete Coração")).toContain(normalizeSearchText("coração"));
  });

  it("normalizes diacritics, letter case and spacing consistently", () => {
    expect(normalizeSearchText("  CHÁ   de   BEBÊ  ")).toBe("cha de bebe");
    expect(normalizeSearchText(" Vélas\t  Artesanais ")).toBe("velas artesanais");
  });

  it("does not change the underlying words or token order", () => {
    expect(normalizeSearchText("Kit coração azul")).toBe("kit coracao azul");
    expect(normalizeSearchText("")).toBe("");
  });
});
