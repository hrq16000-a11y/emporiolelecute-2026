import { expect, test } from "@playwright/test";

// Client-side navigation and deep-link checks intentionally do not assume
// an authenticated session or particular live product inventory.
test.describe("Busca — rotas e navegação", () => {
  test("abre uma pesquisa sem acento diretamente pela URL", async ({ page }) => {
    await page.goto("/buscar?q=coracao", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Buscar produtos" })).toBeVisible();
    await expect(page.getByPlaceholder("O que você procura?")).toHaveValue("coracao");
  });

  test("abre uma pesquisa com acento diretamente pela URL", async ({ page }) => {
    await page.goto("/buscar?q=cora%C3%A7%C3%A3o", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Buscar produtos" })).toBeVisible();
    await expect(page.getByPlaceholder("O que você procura?")).toHaveValue("coração");
  });

  test("cabeçalho encaminha a pesquisa para /buscar?q= no desktop e no celular", async ({ page }) => {
    await page.goto("/produtos", { waitUntil: "domcontentloaded" });

    const search = page.locator("header").getByRole("combobox");
    if (!(await search.isVisible())) {
      await page.locator("header").getByRole("button", { name: "Abrir busca" }).click();
    }
    await expect(search).toBeVisible();

    await search.fill("  coracao  ");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/buscar\?q=coracao$/);
  });
});
