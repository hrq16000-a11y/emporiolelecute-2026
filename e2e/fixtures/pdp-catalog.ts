import path from "node:path";
import type { Page } from "@playwright/test";

export const PDP_TEST_SLUG = "kit-wax-melts-difuso-rechaud";

// Synthetic, deterministic catalog response scoped to these tests only.
// Use existing versioned art; never depend on live stock, pricing, settings,
// or write to the real Supabase project during a layout/snapshot test.
const product = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: PDP_TEST_SLUG,
  name: "Kit de aromas — amostra visual",
  description: "Produto fictício para homologação do layout da página.",
  long_description: null,
  price: 39.9,
  original_price: null,
  images: ["/e2e-fixtures/pdp-kit.webp"],
  badge: null,
  rating: 0,
  min_quantity: 1,
  pix_discount: 5,
  production_days: 3,
  weight: 25,
  keywords: [],
  is_active: true,
  personalization_enabled: false,
  personalization_options: [],
  category: null,
  occasions: [],
  tags: [],
  segments: [],
  pdp_badge_override: {
    enabled: true,
    label: "Frete reduzido",
    showIcon: true,
    tone: "blue",
    position: "top-left",
    offsetX: 12,
    offsetY: 12,
  },
};

export async function usePdpCatalog(
  page: Page,
  images = product.images,
  overrides: {
    personalization_enabled?: boolean;
    personalization_label?: string;
    personalization_options?: unknown[];
    min_quantity?: number;
  } = {},
) {
  await page.addInitScript(() => localStorage.setItem("elc_cookie_consent", "rejected"));
  await page.route("**/e2e-fixtures/pdp-kit*.webp", route =>
    route.fulfill({
      path: path.resolve(process.cwd(), "src/assets/category-kits.webp"),
      contentType: "image/webp",
    }));
  await page.route("**/rest/v1/**", route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith("/rpc/resolve_product_slug")) {
      return route.fulfill({ json: [{
        product_id: product.id, matched_slug: PDP_TEST_SLUG,
        primary_slug: PDP_TEST_SLUG, is_primary: true, is_active: true,
        source: "primary",
      }] });
    }
    if (req.method() === "GET" && url.pathname.endsWith("/products")) {
      return route.fulfill({ json: [{ ...product, ...overrides, images }] });
    }
    // Other public tables are empty and all telemetry/mutations are isolated.
    return route.fulfill({ json: [] });
  });
  await page.route("**/functions/v1/**", route => route.fulfill({ json: {} }));
}
