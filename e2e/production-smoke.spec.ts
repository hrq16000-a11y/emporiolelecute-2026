import { expect, test, type Page } from "@playwright/test";

const PRODUCT_PATH = "/produto/lembrancinha-sabonete-natal-presepio-sagrada-familia";

function watchBrowser(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText ?? "unknown";
    // Chromium/WebKit report ERR_ABORTED when SPA navigation cancels requests
    // from the previous route. Keep real network failures visible and failing.
    if (error === "net::ERR_ABORTED") return;
    errors.push(`requestfailed: ${request.method()} ${request.url()} — ${error}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function expectFirstMainImageLoaded(page: Page) {
  const image = page.locator("main img:visible").first();
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

async function fillRequiredPersonalization(page: Page) {
  const required = page.getByText("obrigatório", { exact: true });
  for (let index = 0; index < await required.count(); index += 1) {
    const group = required.nth(index).locator("xpath=../..");
    const textInput = group.locator("input").first();
    if (await textInput.count()) {
      await textInput.fill("Teste de homologação");
      continue;
    }

    const firstChoice = group.getByRole("radio").first();
    await expect(firstChoice, "Opção obrigatória precisa ter ao menos uma escolha disponível").toBeVisible();
    await firstChoice.click();
  }
}

test("Production home, catálogo e página de produto carregam sem erros", async ({ page }) => {
  const errors = watchBrowser(page);

  const home = await page.goto("/");
  expect(home?.status()).toBe(200);
  await expect(page).toHaveTitle(/Empório LeleCute/i);
  await expect(page.locator("main")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const catalog = await page.goto("/produtos");
  expect(catalog?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Sabonete Personalizado/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expectNoHorizontalOverflow(page);

  const product = await page.goto(PRODUCT_PATH);
  expect(product?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Lembrancinha Sabonete Natal - Presépio Sagrada Família/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expectNoHorizontalOverflow(page);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("carrinho e checkout integrado carregam com item sintético de sessão, sem criar pedido", async ({ page }) => {
  const errors = watchBrowser(page);
  const commercialWrites: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    const writes = !["GET", "HEAD", "OPTIONS"].includes(request.method());
    if (writes && /(supabase\.co|mercadopago|stripe)/i.test(url) && /(orders?|payments?|checkout|create-order|create_order)/i.test(url)) {
      commercialWrites.push(`${request.method()} ${url}`);
    }
  });

  const emptyCart = await page.goto("/carrinho");
  expect(emptyCart?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();

  await page.goto(PRODUCT_PATH);
  await expect(page.getByRole("heading", { level: 1, name: /Lembrancinha Sabonete Natal - Presépio Sagrada Família/i })).toBeVisible();
  await fillRequiredPersonalization(page);

  const addToCart = page.getByRole("button", { name: /Adicionar ao Carrinho/i }).first();
  await expect(addToCart).toBeVisible();
  await addToCart.click();
  await expect(page).toHaveURL(/\/carrinho$/);

  await expect(page.getByRole("heading", { level: 1, name: "Finalizar Pedido" })).toBeVisible();
  await expect(page.locator("#step-cart")).toBeVisible();
  await expect(page.locator("#step-data")).toBeVisible();
  await expect(page.locator("#step-checkout")).toBeVisible();

  for (const selector of ["#name", "#email", "#phone", "#cep", "#city", "#state"]) {
    await expect(page.locator(selector), `Campo de checkout ausente: ${selector}`).toBeVisible();
  }

  await expect(page.locator("#finalize-whatsapp-btn")).toBeVisible();
  await expect(page.locator("#finalize-whatsapp-btn")).toBeEnabled();
  await expectNoHorizontalOverflow(page);

  // Não clicar em "Finalizar pelo WhatsApp": a homologação não deve criar pedidos nem iniciar pagamentos.
  expect(commercialWrites).toEqual([]);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("rota administrativa protege o painel e apresenta somente o login sem sessão", async ({ page }) => {
  const errors = watchBrowser(page);

  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByText("Área Administrativa", { exact: true })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  expect(errors, errors.join("\n")).toEqual([]);
});
