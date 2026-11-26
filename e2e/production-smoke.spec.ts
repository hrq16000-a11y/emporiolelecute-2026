import { expect, test, type Page, type Request } from "@playwright/test";

const PRODUCT_PATH = "/produto/lembrancinha-sabonete-natal-presepio-sagrada-familia";

function watchBrowser(page: Page) {
  const errors: string[] = [];
  const pending = new Set<Request>();

  page.on("request", (request) => pending.add(request));
  page.on("requestfinished", (request) => pending.delete(request));
  page.on("requestfailed", (request) => {
    pending.delete(request);
    errors.push(`requestfailed: ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "unknown"}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  return { errors, pending };
}

async function waitForNetworkIdle(pending: Set<Request>) {
  await expect.poll(() => pending.size, { timeout: 20000 }).toBe(0);
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

async function expectBrowserClean(errors: string[], pending: Set<Request>) {
  await waitForNetworkIdle(pending);
  expect(errors, errors.join("\n")).toEqual([]);
}

test("Production home carrega e não apresenta overflow", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Empório LeleCute/i);
  await expect(page.locator("main")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(browser.errors, browser.pending);
});

test("Production catálogo carrega produtos e imagens", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/produtos");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Sabonete Personalizado/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(browser.errors, browser.pending);
});

test("Production página de produto carrega imagem e CTA", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto(PRODUCT_PATH);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Lembrancinha Sabonete Natal - Presépio Sagrada Família/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expect(page.getByRole("button", { name: /Adicionar ao Carrinho/i }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(browser.errors, browser.pending);
});

test("Production carrinho vazio apresenta estado correto", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/carrinho");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(browser.errors, browser.pending);
});

test("checkout integrado abre com produto real sem criar pedido nem pagamento", async ({ page }) => {
  const browser = watchBrowser(page);
  const commercialWrites: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    const writes = !["GET", "HEAD", "OPTIONS"].includes(request.method());
    if (writes && /(supabase\.co|mercadopago|stripe)/i.test(url) && /(orders?|payments?|checkout|create-order|create_order)/i.test(url)) {
      commercialWrites.push(`${request.method()} ${url}`);
    }
  });

  await page.goto(PRODUCT_PATH);
  await expect(page.getByRole("heading", { level: 1, name: /Lembrancinha Sabonete Natal - Presépio Sagrada Família/i })).toBeVisible();
  await expectBrowserClean(browser.errors, browser.pending);
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
  await expectBrowserClean(browser.errors, browser.pending);

  // Não clicar em "Finalizar pelo WhatsApp": a homologação não cria pedidos nem inicia pagamentos.
  expect(commercialWrites).toEqual([]);
});

test("rota administrativa protege o painel e apresenta somente o login sem sessão", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByText("Área Administrativa", { exact: true })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(browser.errors, browser.pending);
});
