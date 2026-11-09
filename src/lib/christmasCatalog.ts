type ChristmasProduct = {
  id: string;
  slug: string;
  is_active: boolean;
  category?: { slug?: string | null } | null;
  occasions?: ReadonlyArray<{ slug?: string | null }>;
  tags?: ReadonlyArray<{ slug?: string | null }>;
};

const containsChristmasSlug = (slug: string | null | undefined): boolean =>
  /(^|-)natal($|-)/.test((slug ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

/**
 * Products are eligible only via category, occasion or product tags.
 * No name or keyword guessing: only active products linked to Christmas taxonomy.
 * The existing catalog ordering is preserved; no static IDs or mock products.
 */
export function selectChristmasProducts<T extends ChristmasProduct>(items: readonly T[]): T[] {
  return items.filter((product) =>
    product.is_active &&
    Boolean(product.slug) &&
    (
      containsChristmasSlug(product.category?.slug) ||
      (product.occasions ?? []).some((occasion) => containsChristmasSlug(occasion.slug)) ||
      (product.tags ?? []).some((tag) => containsChristmasSlug(tag.slug))
    )
  );
}
