import { test, expect } from "@playwright/test";

test("initial section and slide loading retain the final banner geometry", async ({ page }) => {
  await page.route('**/rest/v1/home_sections?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.route('**/rest/v1/hero_slides?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await page.goto('/');
  const loading = page.getByRole('region', { name: 'Carregando banners' });
  await loading.waitFor();
  const bounds = await loading.boundingBox();
  if (!bounds) throw new Error('Loading banner not visible');
  const hero = page.locator('#inicio');
  await hero.locator('.hero-slide-active img:visible').first().waitFor();
  const final = await hero.boundingBox();
  if (!final) throw new Error('Loaded banner not visible');
  expect(Math.abs(final.height - bounds.height)).toBeLessThan(1);
  expect(Math.abs(final.y - bounds.y)).toBeLessThan(1);
});

test("hero retains document geometry across zoom, slides and motion opt-out", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#inicio");
  await hero.locator(".hero-slide-active img:visible").first().waitFor();
  const geometry = () => hero.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, top: bounds.top + window.scrollY, scroll: window.scrollY };
  });
  const initial = await geometry();
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(100);
    expect(Math.abs((await geometry()).height - initial.height)).toBeLessThan(1);
  }
  for (const slide of [2, 3, 1]) {
    await page.getByRole("button", { name: `Slide ${slide}`, exact: true }).click();
    for (let sample = 0; sample < 8; sample += 1) {
      await page.waitForTimeout(100);
      const current = await geometry();
      expect(Math.abs(current.height - initial.height)).toBeLessThan(1);
      expect(Math.abs(current.top - initial.top)).toBeLessThan(1);
      expect(current.scroll).toBe(initial.scroll);
    }
  }
  await expect(page.getByRole("button", { name: "Reduzir animações da interface" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(Math.abs((await geometry()).height - initial.height)).toBeLessThan(1);
  await page.getByRole("button", { name: "Slide 2", exact: true }).click();
  expect(Math.abs((await geometry()).height - initial.height)).toBeLessThan(1);
});