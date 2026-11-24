import { describe, expect, it } from 'vitest';
import { reconcileCartCatalog, type CartCatalogProduct } from './cart-catalog';
import type { CartItem } from '@/stores/cartStore';

const item: CartItem = { id: 'synthetic-product', slug: 'synthetic', name: 'Synthetic', price: 9.99, quantity: 3, minQuantity: 1, image: '' };
const product: CartCatalogProduct = { id: item.id, slug: item.slug, name: item.name, price: 9.99, original_price: null, min_quantity: 1, is_active: true };

describe('Round 2 catalog preflight', () => {
  it('keeps matching catalog prices and quantities unchanged', () => {
    expect(reconcileCartCatalog([item], [product])).toEqual({ items: [{ ...item, originalPrice: undefined }], changed: false });
  });
  it('refreshes stale prices and requires another confirmation without mutating the original cart', () => {
    const result = reconcileCartCatalog([item], [{ ...product, price: 12.5 }]);
    expect(result.changed).toBe(true);
    expect(result.items[0].price).toBe(12.5);
    expect(item.price).toBe(9.99);
  });
  it('rejects negative client values', () => {
    expect(() => reconcileCartCatalog([{ ...item, price: -1 }], [product])).toThrow();
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid quantity %s', quantity => {
    expect(() => reconcileCartCatalog([{ ...item, quantity }], [product])).toThrow();
  });
  it('rejects nonexistent products', () => {
    expect(() => reconcileCartCatalog([item], [])).toThrow();
  });
  it('rejects mixed baskets with an unavailable product', () => {
    expect(() => reconcileCartCatalog([item, { ...item, id: 'hidden' }], [product, { ...product, id: 'hidden', is_active: false }])).toThrow();
  });
  it('refreshes the catalog minimum before confirmation', () => {
    const result = reconcileCartCatalog([item], [{ ...product, min_quantity: 5 }]);
    expect(result.items[0].quantity).toBe(5);
    expect(result.changed).toBe(true);
  });
  it('rejects invalid catalog money', () => {
    expect(() => reconcileCartCatalog([item], [{ ...product, price: NaN }])).toThrow();
  });
});