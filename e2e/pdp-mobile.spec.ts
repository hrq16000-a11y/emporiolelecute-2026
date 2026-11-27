import { expect, test, type Locator, type Page } from "@playwright/test";

import { PDP_TEST_SLUG, usePdpCatalog } from "./fixtures/pdp-catalog";

const PDP_PATH = `/produto/${PDP_TEST_SLUG}`;

async function openPdp(page: Page) {
  await usePdpCatalog(page);
  await page.goto(PDP_PATH, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('[data-testid="pdp-gallery-main"]')).toBeVisible();
  await expect(page.locator('[data-testid="pdp-badge"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kit de aromas — amostra visual" })).toBeVisible();
  await expect.poll(() => page.locator('[data-testid="pdp-gallery-main"] img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
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
    test.skip(!/mobile/i.test(testInfo.project.name), "Somente breakpoints mobile");
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
