import { describe, expect, it, vi } from 'vitest';
import { generateOrderCode } from '@/lib/order-code';
import { mayReadOrderDetails, privateOrderFields, trackingResponse } from '../../supabase/functions/track-order/privacy';

describe('Selected order tracking privacy boundary', () => {
  const order = { id: 'order-id', order_code: 'LCABC123', status: 'production', total: 10,
    customer_name: 'Private customer', customer_email: 'owner@example.test', customer_phone: '41999999999',
    address_street: 'Private street', address_number: '42', notes: 'Private note',
    ...Object.fromEntries(privateOrderFields.filter(key => !['customer_name', 'customer_email', 'customer_phone', 'address_street', 'address_number', 'notes'].includes(key)).map(key => [key, 'private'])) };
  const items = [{ id: 'item-id', product_name: 'Soap', quantity: 2, unit_price: 5, personalization: 'Private child name' }];
  it('code-only access exposes no contact, address, notes or personalization', () => {
    const response = trackingResponse(order, items, false);
    for (const key of privateOrderFields) expect(response.order).not.toHaveProperty(key);
    expect(response.items[0]).not.toHaveProperty('personalization');
    expect(response.order.status).toBe('production');
    expect(response.items[0].quantity).toBe(2);
    expect(JSON.stringify(response)).not.toContain('Private');
  });
  it('only a verified matching account or server-verified admin can read details', () => {
    expect(mayReadOrderDetails(null, order.customer_email, false)).toBe(false);
    expect(mayReadOrderDetails({ email: 'owner@example.test' }, order.customer_email, false)).toBe(false);
    expect(mayReadOrderDetails({ email: 'other@example.test', email_confirmed_at: '2026-11-24' }, order.customer_email, false)).toBe(false);
    expect(mayReadOrderDetails({ email: 'OWNER@example.test', email_confirmed_at: '2026-11-24' }, order.customer_email, false)).toBe(true);
    expect(mayReadOrderDetails({ email: 'admin@example.test' }, order.customer_email, true)).toBe(true);
    expect(trackingResponse(order, items, true).order.customer_email).toBe('owner@example.test');
    expect(trackingResponse(order, items, true).items[0].personalization).toBe('Private child name');
  });
  it('generates LC plus six symbols with secure randomness and rejects biased bytes', () => {
    const random = vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => {
      if (array instanceof Uint8Array) array.set([255, 252, 0, 1, 2, 33, 34, 35, 0, 0, 0, 0, 0, 0, 0, 0]);
      return array;
    });
    const insecure = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Insecure randomness'); });
    try {
      expect(generateOrderCode()).toBe('LCABC789');
      expect(random).toHaveBeenCalledOnce();
      expect(insecure).not.toHaveBeenCalled();
    } finally { random.mockRestore(); insecure.mockRestore(); }
  });
});