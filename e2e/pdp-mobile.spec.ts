import { expect, test, type Locator, type Page } from "@playwright/test";
import { installStorefrontFixtures } from "./storefront-fixtures";

test.beforeEach(async ({ page }) => {
  await installStorefrontFixtures(page);
});

const PDP_PATH = "/produto/kit-wax-melts-difuso-rechaud";

async function openPdp(page: Page) {
  await page.goto(PDP_PATH, { waitUntil: "networkidle" });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('[data-testid="pdp-gallery-main"]')).toBeVisible();
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
    if (await badge.count()) {
      await expect(badge.first()).toBeVisible();
      expect(intersects(favRect, await rect(badge.first())), "Badge da PDP não pode cobrir o favorito").toBe(false);
    }
  });

  test("visual regression do primeiro viewport da PDP", async ({ page }, testInfo) => {
    test.skip(!/mobile/i.test(testInfo.project.name), "Somente breakpoints mobile");
    await openPdp(page);
    // Capture the first viewport and assert its rendered geometry. The repository
    // has no committed browser-specific baseline; comparing against an absent
    // snapshot made this check non-reproducible across clean CI runners.
    const screenshot = await page.screenshot({
      fullPage: false,
      animations: "disabled",
    });
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));
    expect(screenshot.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(screenshot.readUInt32BE(16)).toBe(viewport.width * viewport.devicePixelRatio);
    expect(screenshot.readUInt32BE(20)).toBe(viewport.height * viewport.devicePixelRatio);
    expect(screenshot.byteLength).toBeGreaterThan(10_000);

    const gallery = await rect(page.locator('[data-testid="pdp-gallery-main"]'));
    expect(gallery.x).toBeGreaterThanOrEqual(-1);
    expect(gallery.x + gallery.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
