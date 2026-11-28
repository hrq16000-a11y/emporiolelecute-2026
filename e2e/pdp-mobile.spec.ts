import { expect, test, type Locator, type Page } from "@playwright/test";

import { PDP_TEST_SLUG, usePdpCatalog } from "./fixtures/pdp-catalog";

const PDP_PATH = `/produto/${PDP_TEST_SLUG}`;

async function openPdp(page: Page, images?: string[]) {
  await usePdpCatalog(page, images);
  await page.goto(PDP_PATH, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('[data-testid="pdp-gallery-main"]')).toBeVisible();
  await expect(page.locator('[data-testid="pdp-badge"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kit de aromas — amostra visual", level: 1, exact: true })).toBeVisible();
  await expect.poll(() => page.locator('[data-testid="pdp-gallery-main"] img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect.poll(async () => {
    const header = await rect(page.locator("header"));
    const breadcrumb = await rect(page.getByRole("navigation", { name: "Breadcrumb" }));
    return breadcrumb.y - (header.y + header.height);
  }).toBeGreaterThanOrEqual(0);
}

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, "elemento esperado não foi renderizado").not.toBeNull();
  return box!;
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe("PDP mobile — layout integrity", () => {
  test("não tem overflow horizontal e favorito não fica coberto pelo Badge", async ({ page }, testInfo) => {
    test.skip(!/(mobile|tablet)/i.test(testInfo.project.name), "Somente breakpoints mobile e tablet");
    await openPdp(page);

    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            className: String((el as HTMLElement).className || "").slice(0, 180),
            text: String((el.textContent || "").trim()).slice(0, 80),
            left: r.left,
            right: r.right,
            width: r.width,
          };
        })
        .filter((item) => item.width > 0 && (item.left < -1 || item.right > window.innerWidth + 1))
        .slice(0, 12),
    }));

    expect(metrics.documentWidth, JSON.stringify(metrics.offenders, null, 2)).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyWidth, JSON.stringify(metrics.offenders, null, 2)).toBeLessThanOrEqual(metrics.innerWidth + 1);

    const favorite = page.locator('[data-testid="pdp-favorite-button"]');
    await expect(favorite).toBeVisible();
    const favRect = await rect(favorite);
    expect(favRect.width).toBeGreaterThanOrEqual(44);
    expect(favRect.height).toBeGreaterThanOrEqual(44);

    const badge = page.locator('[data-testid="pdp-badge"]');
    await expect(badge).toHaveCount(1);
    await expect(badge).toBeVisible();
    expect(intersects(favRect, await rect(badge)), "Badge da PDP não pode cobrir o favorito").toBe(false);
  });

  test("visual regression do primeiro viewport da PDP", async ({ page }, testInfo) => {
    test.skip(!/mobile/i.test(testInfo.project.name), "Somente breakpoints mobile");
    await openPdp(page);
    await expect(page).toHaveScreenshot(`pdp-mobile-${testInfo.project.name}.png`, {
      fullPage: false,
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
    });
  });
});

test("galeria respeita movimento reduzido e mantém controles acessíveis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPdp(page, ["/e2e-fixtures/pdp-kit.webp", "/e2e-fixtures/pdp-kit-alt.webp"]);

  const gallery = page.getByTestId("pdp-gallery-main");
  const first = gallery.locator('[data-gallery-slide="0"]');
  const second = gallery.locator('[data-gallery-slide="1"]');
  await expect(first).toHaveAttribute("aria-hidden", "false");
  await expect(second).toHaveAttribute("aria-hidden", "true");
  await gallery.getByRole("button", { name: "Próxima imagem", exact: true }).click();
  await expect(second).toHaveAttribute("aria-hidden", "false");
  await expect(first).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => second.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);

  const zoom = gallery.getByRole("button", { name: "Ampliar imagem", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    await expect(zoom).toBeVisible();
    const box = await rect(zoom);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await zoom.focus();
    await expect(zoom).toBeFocused();
    await expect(zoom).toHaveCSS("opacity", "1");
  }
});


test("galeria avança uma vez por tecla e não reage a teclas fora de seus controles", async ({ page }) => {
  await openPdp(page, [
    "/e2e-fixtures/pdp-kit.webp",
    "/e2e-fixtures/pdp-kit-alt.webp",
    "/e2e-fixtures/pdp-kit-third.webp",
  ]);
  const gallery = page.getByTestId("pdp-gallery-main");
  const slide = (index: number) => gallery.locator(`[data-gallery-slide="${index}"]`);
  const next = gallery.getByRole("button", { name: "Próxima imagem", exact: true });

  await expect(slide(0)).toHaveAttribute("aria-hidden", "false");
  // Sem gesto do visitante, a imagem permanece mesmo após o antigo intervalo.
  await page.waitForTimeout(5200);
  await expect(slide(0)).toHaveAttribute("aria-hidden", "false");

  const outside = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Início", exact: true });
  await outside.press("ArrowRight");
  await expect(outside).toBeFocused();
  await expect(slide(0)).toHaveAttribute("aria-hidden", "false");

  const quantity = page.locator("main").getByRole("spinbutton");
  await quantity.press("ArrowRight");
  await expect(quantity).toBeFocused();
  await expect(slide(0)).toHaveAttribute("aria-hidden", "false");

  // Três imagens tornam inequívoca uma eventual movimentação dupla.
  await next.press("ArrowRight");
  await expect(slide(1)).toHaveAttribute("aria-hidden", "false");
  await expect(slide(2)).toHaveAttribute("aria-hidden", "true");
  await next.press("ArrowLeft");
  await expect(slide(0)).toHaveAttribute("aria-hidden", "false");

  // O grupo desktop já tem um handler próprio (preventDefault): sem duplo avanço.
  const horizontalThumbs = page.getByRole("tablist", { name: "Miniaturas do produto" });
  if (await horizontalThumbs.isVisible()) {
    const first = horizontalThumbs.getByRole("tab", { name: "Ver imagem 1 de 3", exact: true });
    const second = horizontalThumbs.getByRole("tab", { name: "Ver imagem 2 de 3", exact: true });
    await first.press("ArrowRight");
    await expect(second).toBeFocused();
    await expect(slide(1)).toHaveAttribute("aria-hidden", "false");
    await expect(slide(2)).toHaveAttribute("aria-hidden", "true");
  }

  await gallery.locator('[data-gallery-slide][aria-hidden="false"]').click();
  const lightbox = page.getByRole("dialog");
  await expect(lightbox).toBeVisible();
  const initialIndex = Number(await gallery.locator('[data-gallery-slide][aria-hidden="false"]').getAttribute("data-gallery-slide"));
  await lightbox.getByRole("button", { name: "Próxima imagem", exact: true }).press("ArrowRight");
  await expect(slide((initialIndex + 1) % 3)).toHaveAttribute("aria-hidden", "false");
  await lightbox.getByRole("button", { name: "Próxima imagem", exact: true }).press("Escape");
  await expect(lightbox).toBeHidden();
});
