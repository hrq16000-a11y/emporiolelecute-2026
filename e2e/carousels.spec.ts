import { test, expect, Page } from "@playwright/test";
import { installStorefrontFixtures } from "./storefront-fixtures";

test.beforeEach(async ({ page }) => {
  await installStorefrontFixtures(page);
});

/**
 * E2E tests for CategoriesScroll and OccasionsThumbs carousels.
 *
 * Run all projects (desktop + tablet + mobile):
 *   npx playwright test
 *
 * Run a single project:
 *   npx playwright test --project=mobile
 *
 * Run against a deployed URL (skip dev server):
 *   BASE_URL=https://emporiolelecute.com.br PW_NO_SERVER=1 npx playwright test
 */

// Stable data-testid selectors — survive ARIA copy changes.
const CATEGORIES = '[data-testid="categories-carousel"]';
const OCCASIONS  = '[data-testid="occasions-carousel"]';

async function waitForCarousels(page: Page) {
  await page.goto("/");
  await expect(page.locator(CATEGORIES)).toBeVisible();
  await expect(page.locator(OCCASIONS)).toBeVisible();
  await expect(page.locator(CATEGORIES).locator('[aria-selected="true"]').first()).toBeVisible();
  await expect(page.locator(OCCASIONS).locator('[aria-selected="true"]').first()).toBeVisible();
  await page.locator(CATEGORIES).evaluate((el) => {
    const node = el as HTMLElement;
    node.scrollLeft = 0;
    node.dispatchEvent(new Event("scroll"));
  });
  await page.locator(OCCASIONS).evaluate((el) => {
    const node = el as HTMLElement;
    node.scrollLeft = 0;
    node.dispatchEvent(new Event("scroll"));
  });
}

test.describe("Carousels — keyboard navigation", () => {
  test("Categories: arrow keys move active item without flicker", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    await carousel.focus();

    const initialActive = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350); // smooth-scroll settle
    const nextActive = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    expect(nextActive).not.toBe(initialActive);

    // End jumps to last; Home jumps to first.
    await page.keyboard.press("End");
    await page.waitForTimeout(350);
    const last = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await page.keyboard.press("Home");
    await page.waitForTimeout(350);
    const first = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    expect(last).not.toBe(first);

    // ARIA live region announces focused category.
    await expect(page.locator('section[aria-label="Categorias"] [aria-live="polite"]')).toContainText(/Categoria em foco/i);
  });

  test("Occasions: arrow keys move active item and announce via aria-live", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(OCCASIONS);
    await carousel.focus();
    const before = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
    await expect.poll(() => carousel.locator('[aria-selected="true"]').first().getAttribute("id")).not.toBe(before);
    await expect(page.locator('text=/Ocasião em foco/i').first()).toBeVisible();
  });
});

test.describe("Carousels — mouse scroll (desktop only)", () => {
  test.skip(({ isMobile }) => !!isMobile, "Mouse wheel not applicable on touch devices");

  test("Categories: scrollBy via arrow buttons updates active without flicker", async ({ page }) => {
    // At 1440px the full row may fit; 1024px exercises the real overflow state.
    await page.setViewportSize({ width: 1024, height: 900 });
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    await carousel.hover();
    const next = page.getByRole("button", { name: /Próxima categoria/i });
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();

    const beforeId = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await next.click();
    await expect.poll(() => carousel.locator('[aria-selected="true"]').first().getAttribute("id")).not.toBe(beforeId);

    const selectedCount = await carousel.locator('[aria-selected="true"]').count();
    expect(selectedCount).toBe(1);
  });

  test("Occasions: arrow buttons present and operate carousel", async ({ page }) => {
    // At 1440px twelve occasion tiles can fit; 1024px tests the overflow controls.
    await page.setViewportSize({ width: 1024, height: 900 });
    await waitForCarousels(page);
    const carousel = page.locator(OCCASIONS);
    await carousel.hover();
    const next = page.getByRole("button", { name: /Próxima ocasião/i });
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    const before = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await next.click();
    await expect.poll(() => carousel.locator('[aria-selected="true"]').first().getAttribute("id")).not.toBe(before);
  });
});

test.describe("Carousels — native horizontal scroll (mobile + tablet)", () => {
  test.skip(({ isMobile, browserName }) => !isMobile && browserName !== "webkit", "Touch tests only on mobile/tablet projects");

  async function swipeLeft(page: Page, selector: string) {
    const carousel = page.locator(selector);
    await expect(carousel).toBeVisible();
    const geometry = await carousel.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth + 4);

    // Exercise the scroll listener at the completed native-scroll position.
    // Temporarily disable CSS smooth scrolling so the assertion does not race
    // the animation timeline on tablet WebKit.
    await carousel.evaluate((el) => {
      const node = el as HTMLElement;
      const previousBehavior = node.style.scrollBehavior;
      node.style.scrollBehavior = "auto";
      node.scrollLeft = node.scrollWidth - node.clientWidth;
      node.dispatchEvent(new Event("scroll"));
      node.style.scrollBehavior = previousBehavior;
    });
    await expect.poll(() =>
      carousel.evaluate((el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
    ).toBe(true);
  }

  test("Categories: horizontal scroll changes the active category", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    const before = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await swipeLeft(page, CATEGORIES);
    await expect.poll(() =>
      carousel.locator('[aria-selected="true"]').first().getAttribute("id")
    ).not.toBe(before);
  });

  test("Occasions: horizontal scroll changes the active occasion", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(OCCASIONS);
    const before = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    await swipeLeft(page, OCCASIONS);
    await expect.poll(() =>
      carousel.locator('[aria-selected="true"]').first().getAttribute("id")
    ).not.toBe(before);
  });
});

test.describe("Carousels — anti-flicker on micro scrolls", () => {
  test("tiny scroll deltas (<18px gap) do NOT toggle active item", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    await carousel.evaluate((el) => { (el as HTMLElement).scrollLeft = 0; });
    await page.waitForTimeout(150);
    const initial = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");

    for (let i = 0; i < 10; i++) {
      const delta = (i % 2 === 0 ? 1 : -1) * 5;
      await carousel.evaluate((el, d) => { (el as HTMLElement).scrollLeft += d; }, delta);
      await page.waitForTimeout(40);
    }
    const after = await carousel.locator('[aria-selected="true"]').first().getAttribute("id");
    expect(after).toBe(initial);
  });

  test("active item toggles AT MOST ONCE across many <18px micro-scrolls", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    await carousel.evaluate((el) => { (el as HTMLElement).scrollLeft = 0; });
    await page.waitForTimeout(200);

    // Instrument: observe aria-selected changes via MutationObserver.
    await page.evaluate((sel) => {
      const root = document.querySelector(sel) as HTMLElement | null;
      if (!root) return;
      (window as any).__activeChanges = 0;
      (window as any).__lastActiveId = root.querySelector('[aria-selected="true"]')?.id ?? null;
      const obs = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === "attributes" && m.attributeName === "aria-selected") {
            const t = m.target as HTMLElement;
            if (t.getAttribute("aria-selected") === "true") {
              const id = t.id;
              if (id && id !== (window as any).__lastActiveId) {
                (window as any).__activeChanges += 1;
                (window as any).__lastActiveId = id;
              }
            }
          }
        }
      });
      obs.observe(root, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
      (window as any).__activeObs = obs;
    }, CATEGORIES);

    // 30 jitter scrolls below the 18px threshold (±8px each).
    for (let i = 0; i < 30; i++) {
      const delta = (i % 2 === 0 ? 1 : -1) * 8;
      await carousel.evaluate((el, d) => { (el as HTMLElement).scrollLeft += d; }, delta);
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(250);

    const changes = await page.evaluate(() => (window as any).__activeChanges ?? 0);
    // STRICT: micro-scrolls below threshold must NOT toggle the active item.
    expect(changes, `aria-selected toggled ${changes}× during sub-threshold jitter`).toBeLessThanOrEqual(1);
  });
});

test.describe("ARIA & focus management", () => {
  test("Categories carousel exposes listbox semantics with selected option", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(CATEGORIES);
    await expect(carousel).toHaveAttribute("role", "listbox");
    const selected = carousel.locator('[role="option"][aria-selected="true"]');
    await expect(selected).toHaveCount(1);
  });

  test("Occasions carousel exposes listbox semantics with selected option", async ({ page }) => {
    await waitForCarousels(page);
    const carousel = page.locator(OCCASIONS);
    await expect(carousel).toHaveAttribute("role", "listbox");
    const selected = carousel.locator('[role="option"][aria-selected="true"]');
    await expect(selected).toHaveCount(1);
  });
});
