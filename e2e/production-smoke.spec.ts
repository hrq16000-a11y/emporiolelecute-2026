import { expect, test, type Page, type Request } from "@playwright/test";

const PRODUCT_PATH = "/produto/lembrancinha-sabonete-natal-presepio-sagrada-familia";

async function watchBrowser(page: Page) {
  const errors: string[] = [];
  const cancellations: string[] = [];
  const navigations: string[] = [];
  const pending = new Set<Request>();

  // Capture chunk-load errors before the app's own handler can preventDefault()
  // and initiate a recovery reload.
  await page.addInitScript(() => {
    const w = window as typeof window & { __productionSmokeErrors?: string[] };
    w.__productionSmokeErrors = [];
    window.addEventListener("error", (event) => {
      const message = event.message || (event.target instanceof HTMLScriptElement ? event.target.src : "resource error");
      w.__productionSmokeErrors?.push(`window.error: ${message}`);
    }, true);
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason as Error | string | undefined;
      w.__productionSmokeErrors?.push(`unhandledrejection: ${typeof reason === "string" ? reason : reason?.message ?? "unknown"}`);
    }, true);
  });

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  page.on("request", (request) => pending.add(request));
  page.on("requestfinished", (request) => pending.delete(request));
  page.on("requestfailed", (request) => {
    pending.delete(request);
    const failure = request.failure()?.errorText ?? "unknown";
    const detail = `${request.method()} ${request.url()} — ${failure}`;
    if (failure === "net::ERR_ABORTED" || failure === "Load request cancelled") {
      cancellations.push(detail);
    } else {
      errors.push(`requestfailed: ${detail}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500 || (response.status() === 404 && /\\.(js|css|woff2?|png|jpe?g|webp|svg)(?:[?#]|$)/i.test(response.url()))) {
      errors.push(`response ${response.status()}: ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  return { errors, cancellations, navigations, pending };
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

async function expectBrowserClean(
  page: Page,
  browser: { errors: string[]; cancellations: string[]; navigations: string[]; pending: Set<Request> },
) {
  // Let hydration and lazy imports settle before the browser fixture closes.
  await page.waitForLoadState("networkidle", { timeout: 20000 });
  await page.waitForTimeout(1000);
  await waitForNetworkIdle(browser.pending);
  const runtimeErrors = await page.evaluate(() => {
    const w = window as typeof window & { __productionSmokeErrors?: string[] };
    return w.__productionSmokeErrors ?? [];
  });
  console.log("[production-smoke] browser diagnostics", JSON.stringify({
    navigations: browser.navigations,
    cancellations: browser.cancellations,
    runtimeErrors,
  }));
  const errors = [...browser.errors, ...runtimeErrors];
  expect(errors, errors.join("\n")).toEqual([]);
}

test("Production home carrega e não apresenta overflow", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Empório LeleCute/i);
  await expect(page.locator("main")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(page, browser);
});

test("Production catálogo carrega produtos e imagens", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/produtos");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Sabonete Personalizado/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(page, browser);
});

test("Production página de produto carrega imagem e CTA", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto(PRODUCT_PATH);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Lembrancinha Sabonete Natal - Presépio Sagrada Família/i })).toBeVisible();
  await expectFirstMainImageLoaded(page);
  await expect(page.getByRole("button", { name: /Adicionar ao Carrinho/i }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(page, browser);
});

test("Production carrinho vazio apresenta estado correto", async ({ page }) => {
  const browser = watchBrowser(page);
  const response = await page.goto("/carrinho");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrowserClean(page, browser);
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
  await expectBrowserClean(page, browser);
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
  await expectBrowserClean(page, browser);

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
  await expectBrowserClean(page, browser);
});
