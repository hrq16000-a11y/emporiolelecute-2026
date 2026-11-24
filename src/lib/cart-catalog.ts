import type { CartItem } from '@/stores/cartStore';

export interface CartCatalogProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  min_quantity: number;
  is_active: boolean;
}

// This is a display/preflight check, never an authorization of final order prices.
export const reconcileCartCatalog = (items: CartItem[], products: CartCatalogProduct[]) => {
  if (!items.length) throw new Error('O carrinho está vazio.');
  let changed = false;
  const nextItems = items.map(item => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('Confira as quantidades do carrinho.');
    if (!Number.isFinite(item.price) || item.price < 0) throw new Error('Confira os valores do carrinho.');
    const product = products.find(candidate => candidate.id === item.id);
    if (!product?.is_active) throw new Error('Um produto do carrinho não está disponível. Remova-o para continuar.');
    if (!Number.isFinite(product.price) || product.price < 0 || !Number.isSafeInteger(product.min_quantity) || product.min_quantity < 1) {
      throw new Error('Não foi possível conferir os valores deste produto. Tente novamente.');
    }
    const quantity = Math.max(product.min_quantity, item.quantity);
    if (item.price !== product.price || item.minQuantity !== product.min_quantity || quantity !== item.quantity || item.slug !== product.slug || item.originalPrice !== (product.original_price ?? undefined)) changed = true;
    return { ...item, name: product.name, slug: product.slug, price: product.price, originalPrice: product.original_price ?? undefined, minQuantity: product.min_quantity, quantity };
  });
  return { items: nextItems, changed };
};