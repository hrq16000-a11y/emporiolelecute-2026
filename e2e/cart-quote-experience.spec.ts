import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDP_TEST_SLUG, usePdpCatalog } from "./fixtures/pdp-catalog";

async function touchTarget(locator: Locator, width = false) {
  const box = await locator.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  if (width) expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}

async function isolate(page: Page) {
  await usePdpCatalog(page);
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: { message: "Isolated test" } }));
  await page.route(/^https:\/\/(ipwho\.is|ipapi\.co|get\.geojs\.io|nominatim\.openstreetmap\.org|viacep\.com\.br|brasilapi\.com\.br)\//, route =>
    route.fulfill({ status: 503, json: {} }));
}

test("orçamento tem nomes acessíveis, preserva dados no erro e confirma apenas resposta positiva", async ({ page }, testInfo) => {
  if (testInfo.project.name === "tablet") await page.setViewportSize({ width: 768, height: 1024 });
  await isolate(page);
  const requests: Record<string, unknown>[] = [];
  await page.route("**/functions/v1/send-order-email", async route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: requests.length === 2 } });
  });
  await page.goto("/orcamento", { waitUntil: "domcontentloaded" });
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 1, name: "Orçamento Personalizado" })).toBeVisible();
  const name = main.getByRole("textbox", { name: "Nome completo *", exact: true });
  const email = main.getByRole("textbox", { name: "Email *", exact: true });
  const phone = main.getByRole("textbox", { name: "WhatsApp *", exact: true });
  const occasion = main.getByRole("combobox", { name: "Ocasião", exact: true });
  const quantity = main.getByRole("textbox", { name: "Quantidade", exact: true });
  const message = main.getByRole("textbox", { name: "Mensagem", exact: true });
  const submit = main.getByRole("button", { name: "Solicitar Orçamento", exact: true });
  for (const control of [name, email, phone, occasion, quantity, message, submit]) {
    await expect(control).toBeVisible();
    await touchTarget(control);
  }
  await name.fill("Cliente de teste");
  await email.fill("cliente@example.invalid");
  await phone.fill("41999999999");
  await occasion.click();
  await page.getByRole("option", { name: "Casamento", exact: true }).click();
  await quantity.fill("50 unidades");
  await message.fill("Exclusivamente uma simulação isolada.");
  await submit.click();
  await expect(main.getByRole("alert")).toContainText("Seus dados continuam");
  await expect(name).toHaveValue("Cliente de teste");
  await expect(message).toHaveValue("Exclusivamente uma simulação isolada.");
  expect(requests).toHaveLength(1);
  await submit.click();
  await expect(main.getByRole("status").filter({ hasText: "Solicitação processada" })).toBeVisible();
  await expect(name).toHaveValue("");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0]).toMatchObject({ type: "quote", occasion: "casamento", quantity: "50 unidades" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("carrinho preserva quantidade mínima, navegação por etapa e validação acessível sem enviar pedido", async ({ page }, testInfo) => {
  if (testInfo.project.name === "tablet") await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await isolate(page);
  let writes = 0;
  await page.route("**/functions/v1/send-order-email", route => { writes++; return route.fulfill({ json: { success: false } }); });
  await page.route("**/rest/v1/rpc/create_order*", route => { writes++; return route.fulfill({ json: null }); });
  await page.addInitScript(({ slug }) => {
    localStorage.setItem("emporio-cart-storage", JSON.stringify({ version: 1, state: { items: [{
      id: "10000000-0000-4000-8000-000000000001", slug, name: "Kit artesanal de teste", image: "/e2e-fixtures/pdp-kit.webp",
      price: 39.9, minQuantity: 2, quantity: 2, personalization: "Mensagem completa para o teste de personalização — sem truncar."
    }] } }));
    localStorage.setItem("lc_address_v1", JSON.stringify({ city: "Cidade de teste", state: "PR", savedAt: Date.now() }));
  }, { slug: PDP_TEST_SLUG });
  await page.goto("/carrinho", { waitUntil: "domcontentloaded" });
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Finalizar Pedido", exact: true })).toBeVisible();
  const minus = main.getByRole("button", { name: "Diminuir quantidade de Kit artesanal de teste" });
  const plus = main.getByRole("button", { name: "Aumentar quantidade de Kit artesanal de teste" });
  const remove = main.getByRole("button", { name: "Remover Kit artesanal de teste do carrinho" });
  const qty = main.locator("output").filter({ hasText: /^[23]$/ });
  await expect(minus).toBeDisabled();
  for (const control of [minus, plus, remove]) await touchTarget(control, true);
  await plus.click();
  await expect(qty).toHaveText("3");
  await minus.click();
  await expect(qty).toHaveText("2");
  await expect(minus).toBeDisabled();
  await expect(main.getByText("Mensagem completa para o teste de personalização — sem truncar.")).toBeVisible();
  const steps = main.getByRole("list", { name: "Etapas do pedido" });
  const dataStep = steps.getByRole("button", { name: "2. Seus dados", exact: true });
  await touchTarget(dataStep, true);
  await dataStep.click();
  await expect(main.getByRole("region", { name: "Dados Pessoais" })).toBeFocused();
  const coupon = main.getByRole("textbox", { name: "Cupom de desconto", exact: true });
  await expect(coupon).toBeVisible();
  await touchTarget(coupon);
  const submit = main.getByRole("button", { name: "Finalizar pelo WhatsApp", exact: true });
  await submit.click();
  const name = main.getByRole("textbox", { name: "Nome completo *", exact: true });
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Informe seu nome completo.");
  await expect(main.getByRole("textbox", { name: "CEP *", exact: true })).toHaveAccessibleDescription("Informe o CEP de entrega.");
  await expect(name).toHaveCSS("animation-name", "none");
  expect(writes).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
