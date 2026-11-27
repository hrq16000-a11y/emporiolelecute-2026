import type { Page } from "@playwright/test";

// Deliberately synthetic public taxonomy: these tests exercise carousel behavior,
// not the current administrator's configuration or live inventory.
export async function useCarouselCatalog(page: Page) {
  const categories = ["Sabonetes", "Lembrancinhas", "Velas", "Presentes", "Brindes", "Kits", "Aromas", "Difusores", "Caixas", "Saches", "Escalda-pés", "Embalagens", "Bandejas", "Cosméticos", "Home sprays", "Cestas", "Cartões", "Laços", "Papelaria", "Lembranças"];
  const occasions = ["Maternidade", "Casamento", "Aniversário", "Chá de bebê", "Batizado", "Eventos corporativos", "Dia das mães", "Dia dos professores", "Festa de formatura", "Bodas de casamento", "Festas de fim de ano", "Confraternização"];
  const rows = (names: string[], prefix: string) => names.map((name, i) => ({
    id: `${prefix}-${i}`, name, slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"),
    position: i, is_indexed: true, is_draft: false, icon: "Gift", image_url: null,
  }));
  await page.route("**/rest/v1/home_sections?*", route => route.fulfill({ json: [
    { id: "e2e-hero", section_key: "hero", component_name: "HeroSlider", is_visible: true, editable_props: {}, position: 10 },
    { id: "e2e-categories", section_key: "categories", component_name: "CategoriesScroll", is_visible: true, editable_props: {}, position: 20 },
    { id: "e2e-occasions", section_key: "occasions", component_name: "OccasionsThumbs", is_visible: true, editable_props: {}, position: 30 },
  ] }));
  await page.route("**/rest/v1/categories?*", route => route.fulfill({ json: rows(categories, "category") }));
  await page.route("**/rest/v1/occasions?*", route => route.fulfill({ json: rows(occasions, "occasion") }));
}
