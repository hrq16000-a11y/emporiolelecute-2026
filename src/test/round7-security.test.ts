import { describe, expect, it } from 'vitest';
import { escapeEmailHtml, safeEmailLink } from '../../supabase/functions/_shared/email-output';
import { safeBodyPreview } from '@/lib/telemetry';
import { escapeCsv } from '@/lib/seoExport';
import { crawlerProductSchema } from '../../supabase/functions/_shared/crawler-product-schema';

describe('Round 7 private output boundaries', () => {
  it('crawler product output omits invented stock, review counts and invalid offers', () => {
    const product = { name: 'Soap', description: 'Description', slug: 'soap', price: '5.25', images: ['https://store.test/soap.webp'] };
    const schema = crawlerProductSchema(product, 'https://store.test/soap', 'Store');
    expect(schema.offers?.price).toBe(5.25);
    expect(schema.offers).not.toHaveProperty('availability');
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(crawlerProductSchema({ ...product, price: null }, 'https://store.test/soap', 'Store')).not.toHaveProperty('offers');
  });
  it('keeps order names and tracking codes as text in notification emails', () => {
    expect(escapeEmailHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(safeEmailLink('javascript:alert(1)')).toBeNull();
    expect(safeEmailLink('https://carrier.test/?a=1&b=2')).toBe('https://carrier.test/?a=1&amp;b=2');
  });
  it('never includes customer details in captured request bodies', () => {
    const body = JSON.stringify({ customer_email: 'private@example.test', customer_phone: '41999999999' });
    expect(safeBodyPreview({ body })).toBe('[request body omitted]');
    expect(safeBodyPreview({ body })).not.toContain('private@example.test');
  });
  it('neutralizes formula cells across customer and diagnostic exports', () => {
    for (const cell of ['=1+1', '+cmd', '-cmd', '@SUM(A1)', ' \t=1']) expect(escapeCsv(cell)).toBe(`'${cell}`);
    expect(escapeCsv(-2)).toBe('-2');
  });
});