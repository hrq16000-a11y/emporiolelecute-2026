import type { Page, Route } from "@playwright/test";

/**
 * Deterministic, read-only storefront fixture for browser tests.
 * All Supabase REST/RPC traffic is intercepted before navigation. E2E must
 * never read or write the hosted production database.
 */
const PRODUCT_ID = "00000000-0000-4000-a000-000000000099";
const PRODUCT = {
  id: PRODUCT_ID,
  name: "Kit Wax Melts Difusor Rechaud",
  slug: "kit-wax-melts-difuso-rechaud",
  description: "Kit artesanal de demonstração para testes automatizados.",
  long_description: "Produto sintético exclusivo do ambiente Playwright.",
  price: 54,
  original_price: 64,
  min_quantity: 1,
  pix_discount: 5,
  production_days: 3,
  weight: 0.5,
  category_id: "00000000-0000-4000-a000-000000000010",
  badge: "Destaque",
  rating: 5,
  images: [
    "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900",
    "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=900",
  ],
  features: ["Produção artesanal", "Personalização"],
  keywords: ["kit", "artesanal"],
  editorial_content: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  personalization_enabled: false,
  personalization_label: null,
  personalization_placeholder: null,
  google_product_category: null,
  category: {
    id: "00000000-0000-4000-a000-000000000010",
    name: "Sabonetes Artesanais",
    slug: "sabonetes-artesanais",
    created_at: "2026-01-01T00:00:00.000Z",
    image_url: null,
    icon: "Gift",
    position: 1,
    is_indexed: true,
    is_draft: false,
  },
  occasions: [],
  tags: [],
  segments: [],
};

const CATEGORY_NAMES = [
  "Sabonetes Artesanais", "Papelaria Personalizada", "Velas Aromáticas",
  "Kits Personalizados", "Lembrancinhas", "Brindes Especiais",
  "Calendários", "Agendas", "Cadernos", "Presentes",
  "Chá de Bebê", "Casamento",
];
const CATEGORY_SLUGS = [
  "sabonetes", "papelaria-personalizada", "velas-aromaticas",
  "kits-personalizados", "lembrancinhas", "brindes-especiais",
  "calendarios", "agendas", "cadernos", "presentes", "cha-de-bebe", "casamento",
];
const CATEGORIES = CATEGORY_NAMES.map((name, index) => ({
  id: `00000000-0000-4000-a000-${String(10 + index).padStart(12, "0")}`,
  name,
  slug: CATEGORY_SLUGS[index],
  position: index + 1,
  is_indexed: true,
  is_draft: false,
  icon: ["Gift", "Heart", "Sparkles", "Package"][index % 4],
  image_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
}));
const OCCASION_NAMES = [
  "Aniversário e Festas", "Maternidade e Chá de Bebê", "Casamento e Bodas",
  "Batizado e Primeira Comunhão", "Eventos Corporativos", "Chá Revelação",
  "Formatura", "Natal", "Páscoa", "Dia das Mães", "Dia dos Pais", "Agradecimento",
];
const OCCASION_SLUGS = [
  "aniversario", "maternidade", "casamento", "batizado", "corporativo",
  "cha-revelacao", "formatura", "natal", "pascoa", "dia-das-maes", "dia-dos-pais", "agradecimento",
];
const OCCASIONS = OCCASION_NAMES.map((name, index) => ({
  id: `00000000-0000-4000-a000-${String(20 + index).padStart(12, "0")}`,
  name,
  slug: OCCASION_SLUGS[index],
  position: index + 1,
  is_indexed: true,
  is_draft: false,
  icon: ["Cake", "Heart", "Flower2", "Gift"][index % 4],
  image_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
}));
const HOME_SECTIONS = [
  { id: "00000000-0000-4000-a000-000000000032", section_key: "hero", component_name: "HeroSlider", label: "Banners", description: null, is_visible: true, position: 1, editable_props: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-a000-000000000030", section_key: "categories", component_name: "CategoriesScroll", label: "Categorias", description: null, is_visible: true, position: 10, editable_props: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id: "00000000-0000-4000-a000-000000000031", section_key: "occasions", component_name: "OccasionsThumbs", label: "Ocasiões", description: null, is_visible: true, position: 20, editable_props: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];
const HERO_SLIDES = [1, 2, 3].map((position) => ({
  id: `00000000-0000-4000-a000-${String(40 + position).padStart(12, "0")}`,
  display_mode: "banner_mobile",
  tagline: "Ateliê Criativo",
  title: `Banner sintético ${position}`,
  subtitle: "Fixture visual de banner para testes automatizados.",
  image_url: null,
  image_mobile_url: "/src/assets/category-sabonetes.webp",
  image_desktop_url: "/src/assets/category-sabonetes.webp",
  image_alt: "Banner de teste Empório LeleCute",
  cta_label: null,
  cta_url: null,
  position,
  is_visible: true,
}));
const SEO = {
  site_title: "Empório LeleCute — Teste automatizado",
  site_description: "Catálogo sintético para testes E2E.",
  site_keywords: "teste, catálogo",
  og_image: "https://emporiolelecute.com.br/og-image.webp",
  twitter_handle: "",
  google_verification: "",
  bing_verification: "",
  facebook_app_id: "",
  canonical_url: "https://emporiolelecute.com.br",
  robots_txt: "",
  additional_meta_tags: "",
  structured_data_business: "",
  sitemap_notification_email: "",
};
const SETTINGS = [
  { key: "seo_config", value: SEO },
  { key: "payment_config", value: { pix_discount: 5, installments: 3, accepted_methods: { pix: true, credit_card: true, boleto: false } } },
  { key: "footer_config", value: {} },
  { key: "contact_info", value: { whatsapp: "5541992214299", email: "qa@example.invalid" } },
];

function payloadFor(pathname: string): unknown {
  if (pathname.endsWith("/rpc/resolve_product_slug")) {
    return [{ product_id: PRODUCT_ID, matched_slug: PRODUCT.slug, primary_slug: PRODUCT.slug, is_primary: true, is_active: true, source: "primary" }];
  }
  if (pathname.endsWith("/rpc/record_product_slug_hit")) return null;
  const table = pathname.split("/").pop() ?? "";
  switch (table) {
    case "home_sections": return HOME_SECTIONS;
    case "hero_slides": return HERO_SLIDES;
    case "categories": return CATEGORIES;
    case "occasions": return OCCASIONS;
    case "store_settings": return SETTINGS;
    case "products": return [PRODUCT];
    case "pdp_sections": return [];
    default: return [];
  }
}

export async function installStorefrontFixtures(page: Page) {
  await page.addInitScript(() => {
    for (const key of ["categoriesScroll:left", "occasionsThumbs:left"]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
  await page.route(/\/rest\/v1\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const data = payloadFor(url.pathname);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-0/1", "cache-control": "no-store" },
      body: JSON.stringify(data),
    });
  });
}
