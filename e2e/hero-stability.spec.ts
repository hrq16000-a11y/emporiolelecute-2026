import { test, expect } from "@playwright/test";

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
  const toggle = page.getByRole("button", { name: "Reduzir animações da interface" }).filter({ visible: true });
  await toggle.click();
  expect(Math.abs((await geometry()).height - initial.height)).toBeLessThan(1);
  await page.getByRole("button", { name: "Slide 2", exact: true }).click();
  expect(Math.abs((await geometry()).height - initial.height)).toBeLessThan(1);
});