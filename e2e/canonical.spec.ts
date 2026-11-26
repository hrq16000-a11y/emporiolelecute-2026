import { expect, test, type Page } from "@playwright/test";

/**
 * Regressão SEO: páginas de catálogo com query string NÃO podem canonicalizar
 * para a URL com parâmetros. O canonical deve apontar para a URL base
 * (/produtos ou a taxonomia oficial /categoria/<slug>).
 */

async function canonicalHref(page: Page) {
  return page.locator('link[rel="canonical"]').first().getAttribute("href");
}

async function robotsContent(page: Page) {
  const meta = page.locator('meta[name="robots"]');
  return (await meta.count()) ? meta.first().getAttribute("content") : null;
}

async function openAndSettle(page: Page, url: string) {
  // These pages only read catalog data. Block the application's telemetry
  // sink so CI never inserts synthetic browser events into Production.
  await page.route("**/rest/v1/stale_bundle_logs", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      return;
    }
    await route.continue();
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => canonicalHref(page)).not.toBeNull();
  // DynamicSEO owns robots after React mounts; wait for that contract instead
  // of reading the static document before hydration completes.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^(index, follow|noindex,follow)$/, { timeout: 15000 });
}

test.describe("SEO — canonical em páginas filtradas", () => {
  test("um filtro estrutural canonicaliza para a taxonomia oficial", async ({ page }) => {
    await openAndSettle(page, "/produtos?categoria=sabonetes");
    const href = await canonicalHref(page);
    expect(href).toBeTruthy();
    expect(new URL(href!).search).toBe("");
    expect(new URL(href!).pathname).toMatch(/^\/(produtos|categoria\/[a-z0-9-]+)$/);
  });

  test("múltiplos filtros/paginação: canonical volta para /produtos e vira noindex", async ({ page }) => {
    await openAndSettle(page, "/produtos?categoria=sabonetes&ocasiao=maternidade&page=2");
    const href = await canonicalHref(page);
    expect(new URL(href!).pathname).toBe("/produtos");
    expect(new URL(href!).search).toBe("");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await page.locator('meta[name="robots"]').count()).toBe(1);
    expect((await robotsContent(page)) ?? "").toContain("noindex");
  });

  test("paginação legada page=2 também recebe noindex", async ({ page }) => {
    await openAndSettle(page, "/produtos?page=2");
    expect(page.url()).toContain("page=2");
    const href = await canonicalHref(page);
    expect(new URL(href!).pathname).toBe("/produtos");
    expect(new URL(href!).search).toBe("");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await page.locator('meta[name="robots"]').count()).toBe(1);
    expect((await robotsContent(page)) ?? "").toContain("noindex");
  });

  test("filtros múltiplos não resolvidos continuam noindex", async ({ page }) => {
    await openAndSettle(page, "/produtos?categoria=qa-categoria-inexistente&ocasiao=qa-ocasiao-inexistente");
    expect(page.url()).toContain("qa-categoria-inexistente");
    const href = await canonicalHref(page);
    expect(new URL(href!).pathname).toBe("/produtos");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await page.locator('meta[name="robots"]').count()).toBe(1);
    expect((await robotsContent(page)) ?? "").toContain("noindex");
  });

  test("canonical permanece sem parâmetros após reload", async ({ page }) => {
    await openAndSettle(page, "/produtos?ocasiao=maternidade&search=lavanda");
    const before = await canonicalHref(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await expect.poll(() => canonicalHref(page)).toBe(before);

    const after = await canonicalHref(page);
    expect(new URL(after!).search).toBe("");
    // Nunca deve haver mais de um canonical na página.
    expect(await page.locator('link[rel="canonical"]').count()).toBe(1);
  });

  test("página de categoria canonicaliza para si mesma", async ({ page }) => {
    await openAndSettle(page, "/categoria/sabonetes?page=1");
    const href = await canonicalHref(page);
    expect(new URL(href!).search).toBe("");
    expect(new URL(href!).pathname.startsWith("/categoria/")).toBe(true);
  });
});
