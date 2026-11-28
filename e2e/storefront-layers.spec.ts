import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PDP_TEST_SLUG, usePdpCatalog } from "./fixtures/pdp-catalog";

async function mockHome(page: Page) {
  await page.route("**/rest/v1/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/cookie_consent_config")) {
      return route.fulfill({ json: { is_enabled: true, delay_ms: 0 } });
    }
    if (url.pathname.endsWith("/social_proof_settings")) {
      return route.fulfill({ json: { is_enabled: true, initial_delay_ms: 250, visible_ms: 25000, interval_ms: 2000, position: "bottom-right" } });
    }
    if (url.pathname.endsWith("/product_reviews")) {
      return route.fulfill({ json: [{ id: "review-fixture", author_name: "Cliente de teste", rating: 5,
        comment: "Avaliação fictícia exclusiva do teste isolado.", review_date: null, is_verified: true,
        product: { name: "Produto de teste", slug: PDP_TEST_SLUG, images: null } }] });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/functions/v1/**", route => route.fulfill({ json: {} }));
  await page.route("**/storage/v1/object/public/product-images/**", route =>
    route.fulfill({ path: path.resolve(process.cwd(), "src/assets/category-kits.webp"), contentType: "image/webp" }));
}

test("consentimento, convite e prova social não competem; convite devolve foco", async ({ page }) => {
  test.setTimeout(45000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockHome(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cookies = page.getByRole("dialog", { name: "Consentimento de cookies" });
  const invite = page.getByRole("dialog", { name: "O Natal já floresceu por aqui." });
  const proof = page.getByRole("button", { name: "Fechar prova social" });
  const whatsapp = page.getByRole("link", { name: "Contato via WhatsApp", exact: true });
  const campaignLink = page.getByRole("link", { name: "Visitar nosso Natal encantado" });
  await expect(cookies).toBeVisible();
  await expect(campaignLink).toBeVisible();
  // Ultrapassa o tempo original: nenhum convite é consumido por estar bloqueado.
  await page.waitForTimeout(8300);
  await expect(invite).toHaveCount(0);
  await expect(proof).toHaveCount(0);
  await expect(whatsapp).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("lelecute_natal_2026_invite_seen"))).toBeNull();

  await cookies.getByRole("button", { name: "Recusar" }).click();
  await expect(cookies).toHaveCount(0);
  await expect(whatsapp).toBeVisible();
  await expect(proof).toBeVisible();
  await campaignLink.focus();
  await expect(campaignLink).toBeFocused();
  await expect(invite).toBeVisible({ timeout: 12000 });
  await expect(proof).toHaveCount(0); // sem links invisíveis focáveis
  await expect(campaignLink).toBeFocused(); // convite automático não rouba foco
  await expect(invite).toHaveCSS("animation-name", "none");
  const close = invite.getByRole("button", { name: "Fechar convite de Natal" });
  const size = await close.boundingBox();
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(size?.width ?? 0).toBeGreaterThanOrEqual(44);
  await close.press("Enter");
  await expect(invite).toHaveCount(0);
  await expect(campaignLink).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("lelecute_natal_2026_invite_seen"))).toBe("1");
  await expect(proof).toBeVisible();
  const proofBox = await proof.locator("xpath=../..").boundingBox();
  const waBox = await whatsapp.boundingBox();
  expect(proofBox && waBox && proofBox.y + proofBox.height <= waBox.y).toBeTruthy();
  const closeBox = await proof.boundingBox();
  expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(whatsapp).toHaveCSS("animation-name", "none");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test("exit intent não interfere com edição ou lightbox, mas mantém convite legítimo", async ({ page }) => {
  test.setTimeout(45000);
  await usePdpCatalog(page, undefined, { personalization_enabled: true, personalization_label: "Mensagem especial" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/produto/${PDP_TEST_SLUG}`, { waitUntil: "domcontentloaded" });
  const field = page.getByRole("textbox", { name: "Mensagem especial", exact: true });
  await expect(field).toBeVisible();
  await page.waitForTimeout(8300);
  const exit = page.getByRole("dialog", { name: "Antes de sair", exact: true });
  const trigger = () => page.evaluate(() => {
    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0, relatedTarget: null }));
  });
  await field.focus();
  await trigger();
  await expect(exit).toHaveCount(0);
  const zoom = page.getByTestId("pdp-gallery-main").getByRole("button", { name: "Ampliar imagem", exact: true });
  await zoom.press("Enter");
  const lightbox = page.getByRole("dialog", { name: /Imagem ampliada/ });
  await expect(lightbox).toBeVisible();
  await trigger();
  await expect(exit).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("__exit_intent_state__"))).toBeNull();
  await lightbox.getByRole("button", { name: "Fechar ampliação" }).press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(zoom).toBeFocused();
  await trigger();
  await expect(exit).toBeVisible();
  const closeExit = exit.getByRole("button", { name: "Fechar sugestão de atendimento" });
  const exitCloseBox = await closeExit.boundingBox();
  expect(exitCloseBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(exitCloseBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  await exit.getByRole("button", { name: "Continuar navegando" }).click();
  await expect(exit).toBeHidden();
  await expect(zoom).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("__exit_intent_state__") || "{}").shownCount)).toBe(1);
  await trigger();
  await expect(exit).toBeHidden();
});
