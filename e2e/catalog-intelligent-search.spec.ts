import { expect, test, type Page } from "@playwright/test";
import { usePdpCatalog } from "./fixtures/pdp-catalog";

const categories = ["Âmbar", "Azul", ...Array.from({ length: 100 }, (_, i) => `Coleção ${i + 1}`)]
  .map((name, i) => ({ id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, name,
    slug: i === 0 ? "ambar" : i === 1 ? "azul" : `colecao-${i - 1}`, is_draft: false, is_indexed: true, position: i }));

async function mockCatalog(page: Page) {
  await usePdpCatalog(page);
  await page.route(url => url.pathname.endsWith("/rest/v1/categories"), route => route.fulfill({ json: categories }));
  await page.route(url => url.pathname.endsWith("/rest/v1/rpc/search_products"), route =>
    route.fulfill({ json: { ids: [], suggestion: null, total: 0, offset: 0, has_more: false } }));
}

test("filtro de categorias longo é pesquisável e preserva a seleção", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/buscar", { waitUntil: "domcontentloaded" });
  const main = page.locator("main");
  const facet = main.getByRole("searchbox", { name: "Buscar categorias", exact: true });
  const group = main.getByRole("group", { name: "Categoria", exact: true });
  await expect(facet).toBeVisible();
  await expect(group.getByRole("button")).toHaveCount(13); // Todas + 12 iniciais
  await expect(main.getByRole("button", { name: "Ver todas as 102 opções" })).toBeVisible();

  await facet.fill("ambar");
  const amber = group.getByRole("button", { name: "Âmbar", exact: true });
  await expect(group.getByRole("button")).toHaveCount(2);
  await amber.click();
  await expect(amber).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/categoria=ambar/);

  await facet.fill("azul");
  await expect(group.getByRole("button", { name: "Azul", exact: true })).toBeVisible();
  await expect(amber).toHaveAttribute("aria-pressed", "true");
  await expect(group.getByRole("button")).toHaveCount(3);
  await facet.fill("sem-correspondencia");
  await expect(main.getByText("Nenhuma opção encontrada. Seleções atuais preservadas.")).toBeVisible();
  await expect(amber).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/categoria=ambar/);
  const bounds = await amber.boundingBox();
  expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test("autocomplete não aceita sugestão antiga e oferece busca completa sem correspondência local", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/sobre", { waitUntil: "domcontentloaded" });
  const header = page.locator("header");
  const mobileToggle = header.getByRole("button", { name: "Abrir busca", exact: true });
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  if (mobile) await mobileToggle.click();
  const input = header.getByRole("combobox", { name: "Buscar produtos, categorias...", exact: true });
  await input.fill("ambar");
  const list = header.getByRole("listbox", { name: "Sugestões de busca", exact: true });
  await expect(list.getByRole("option", { name: /Âmbar/ })).toBeVisible();
  await input.press("ArrowDown");
  await expect(list.getByRole("option", { name: /Âmbar/ })).toHaveAttribute("aria-selected", "true");
  const activeId = await input.getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  expect(await list.getByRole("option", { name: /Âmbar/ }).getAttribute("id")).toBe(activeId);

  await input.press("Escape");
  await expect(list).toBeHidden();
  if (mobile) {
    await mobileToggle.click();
    await input.fill("ambar");
    await expect(list.getByRole("option", { name: /Âmbar/ })).toBeVisible();
  } else {
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
  }
  await input.press("ArrowDown");
  await input.fill("zzsemresultado");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/buscar\?q=zzsemresultado/);
  // A URL pode mudar antes que a rota lazy remonte o cabeçalho.
  await expect(page.getByRole("heading", { name: "Buscar produtos", exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("searchbox", { name: "O que você procura?" })).toHaveValue("zzsemresultado");

  if (mobile) await mobileToggle.click();
  await input.fill("zzoutrotermo");
  await expect(header.getByRole("link", { name: /Ver todos os resultados para "zzoutrotermo"/ })).toBeVisible();
  await expect(header.getByText(/Nenhuma sugestão imediata/)).toBeVisible();
});

test("filtros avançados mantêm o slug escolhido ao pesquisar outra categoria", async ({ page }) => {
  await mockCatalog(page);
  await page.addInitScript(() => localStorage.setItem("produtos:filtersOpen", "1"));
  await page.goto("/produtos", { waitUntil: "domcontentloaded" });
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.locator("#produtos-filtros-taxonomia").getByRole("button", { name: "Filtros", exact: true }).click();
  }
  const filter = page.getByRole("searchbox", { name: "Buscar categorias", exact: true });
  await filter.fill("ambar");
  const chosen = page.getByRole("checkbox", { name: "Âmbar", exact: true });
  // A seleção é controlada pela URL: aguarde a navegação e a atualização do checkbox.
  await chosen.click();
  await expect(page).toHaveURL(/categorias=ambar/);
  await expect(chosen).toBeChecked();
  await filter.fill("azul");
  await expect(page.getByRole("checkbox", { name: "Azul", exact: true })).toBeVisible();
  await expect(chosen).toBeChecked();
  await expect(page).toHaveURL(/categorias=ambar/);
});
