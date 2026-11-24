export const crawlerProductSchema = (product: { name: string; description: string; slug: string; price: unknown; images: string[] }, url: string, brand: string) => {
  const price = typeof product.price === 'number' || (typeof product.price === 'string' && product.price.trim()) ? Number(product.price) : NaN;
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name,
    description: product.description, url, sku: product.slug,
    ...(product.images.length ? { image: product.images } : {}),
    brand: { '@type': 'Brand', name: brand },
    ...(Number.isFinite(price) && price > 0 ? {
      offers: { '@type': 'Offer', url, priceCurrency: 'BRL', price },
    } : {}),
  };
};