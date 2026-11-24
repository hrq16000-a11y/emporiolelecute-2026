import { readFileSync } from 'node:fs';
import { transpile, ScriptTarget, ModuleKind } from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { toCsv } from '@/lib/seoExport';
import * as shipping from '../../supabase/functions/calculate-shipping/lib';

type Row = Record<string, unknown>;
type Database = Record<string, Row[]>;
const installHandler = (path: string, database: Database, extra: Record<string, unknown> = {}) => {
  const queries: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const writes: Row[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'synthetic-owner', email: 'owner@example.test', email_confirmed_at: '2026-11-24' } } }) },
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      queries.push({ table, filters });
      let update: Row | undefined;
      const rows = () => (database[table] ?? []).filter(row => filters.every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(row[key]);
        return row[key] === value;
      }));
      const result = () => {
        const found = rows();
        if (update) { for (const row of found) Object.assign(row, update); }
        return { data: found, error: null, count: found.length };
      };
      const query = {
        select: () => query, limit: () => query, order: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        ilike: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        in: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        maybeSingle: async () => ({ ...result(), data: result().data[0] ?? null }),
        insert: async (value: Row) => { writes.push(value); return { error: null }; },
        upsert: async (value: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
          const target = database[table] ?? (database[table] = []);
          const existing = target.find(row => options?.onConflict && row[options.onConflict] === value[options.onConflict]);
          if (existing && !options?.ignoreDuplicates) Object.assign(existing, value);
          if (!existing) target.push({ id: 'synthetic-row', ...value });
          writes.push({ table, value, options });
          return { error: null };
        },
        update: (value: Row) => { update = value; return query; },
        then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync(path, 'utf8').replace(/^import .*;$/gm, '');
  const dependencies = { createClient: () => client, ...(!source.includes('const corsHeaders') ? { corsHeaders: {} } : {}), z, ...shipping,
    Deno: { env: { get: () => 'isolated-test-setting' }, serve: (value: typeof handler) => { handler = value; } }, ...extra };
  new Function(...Object.keys(dependencies), transpile(source, { target: ScriptTarget.ES2022, module: ModuleKind.None }))(...Object.values(dependencies));
  return { queries, writes, handle: async (req: Request) => { if (!handler) throw new Error('Handler not registered'); return handler(req); } };
};
const ACTIVE = '00000000-0000-4000-8000-000000000001';
const HIDDEN = '00000000-0000-4000-8000-000000000002';
const CEP = '12345678';
const catalog = () => ({
  shipping_settings: [{ origin_zip_code: '80000000', is_enabled: true }],
  shipping_providers: [], shipping_rules: [],
  products: [{ id: ACTIVE, is_active: true, price: 53, weight_kg: 0.3 }, { id: HIDDEN, is_active: false, price: 12, weight_kg: 9 }],
});
const quoteRequest = (ids = [ACTIVE]) => new Request('https://isolated.test/calculate-shipping', {
  method: 'POST', headers: { authorization: 'Bearer isolated-test-session' }, body: JSON.stringify({ cep_destino: CEP, items: ids.map(product_id => ({ product_id, name: 'Synthetic soap', quantity: 1 })) }),
});
const subscriptionRequest = (endpoint: string) => new Request('https://isolated.test/notification-prefs', {
  method: 'POST', headers: { authorization: 'Bearer isolated-test-session' },
  body: JSON.stringify({ action: 'subscribe', email: 'owner@example.test', order_code: 'LCABC123',
    subscription: { endpoint, keys: { p256dh: 'synthetic-key', auth: 'synthetic-auth' } } }),
});

describe('Selected security findings only', () => {
  it('rejects hidden catalog products including mixed active/hidden carts', async () => {
    const fixture = installHandler('supabase/functions/calculate-shipping/index.ts', catalog());
    expect((await fixture.handle(quoteRequest([HIDDEN]))).status).toBe(400);
    expect((await fixture.handle(quoteRequest([ACTIVE, HIDDEN]))).status).toBe(400);
    expect(fixture.queries.filter(query => query.table === 'products').every(query => query.filters.some(([key, value]) => key === 'is_active' && value === true))).toBe(true);
    expect(fixture.writes).toEqual([]);
  });
  it('fallback audits and diagnostics omit the destination postcode', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const fixture = installHandler('supabase/functions/calculate-shipping/index.ts', catalog());
      const response = await fixture.handle(quoteRequest());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ estimated: true });
      expect(fixture.writes).toContainEqual(expect.objectContaining({ event_type: 'estimate_fallback' }));
      expect(JSON.stringify(fixture.writes)).not.toContain(CEP);
      expect(JSON.stringify(log.mock.calls)).not.toContain(CEP);
    } finally { log.mockRestore(); }
  });
  it('cache-hit diagnostics omit the postcode-bearing cache key', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const database: Database = catalog();
      database.shipping_providers = [{ is_active: true, provider_code: 'melhor_envio', api_key: 'synthetic-provider-key', endpoint_url: 'https://isolated.test/carrier' }];
      database.shipping_quote_cache = [{ cache_key: `melhor_envio:80000000:${CEP}:0.3`, created_at: new Date().toISOString(), options: [{ provider: 'Synthetic carrier', service_name: 'Test', price: 20, estimated_delivery_days: '3' }] }];
      const fixture = installHandler('supabase/functions/calculate-shipping/index.ts', database);
      expect((await fixture.handle(quoteRequest())).status).toBe(200);
      expect(log.mock.calls).toContainEqual(['[calculate-shipping] cache hit', { count: 1 }]);
      expect(JSON.stringify(log.mock.calls)).not.toContain(CEP);
    } finally { log.mockRestore(); }
  });
  it('a conflicting subscription endpoint never transfers its owner or keys', async () => {
    const endpoint = 'https://push.example.test/existing';
    const existing = { id: 'other-subscription', endpoint, email: 'other@example.test', p256dh: 'original-key', auth: 'original-auth' };
    const database = { orders: [{ order_code: 'LCABC123', customer_email: 'owner@example.test' }], push_subscriptions: [existing] };
    const fixture = installHandler('supabase/functions/notification-prefs/index.ts', database);
    expect((await fixture.handle(subscriptionRequest(endpoint))).status).toBe(403);
    expect(existing).toEqual({ id: 'other-subscription', endpoint, email: 'other@example.test', p256dh: 'original-key', auth: 'original-auth' });
    expect(fixture.queries.filter(query => query.table === 'push_subscriptions').at(-1)?.filters).toContainEqual(['email', 'owner@example.test']);
  });
  it('a caller can register and refresh their own subscription', async () => {
    const database: Database = { orders: [{ order_code: 'LCABC123', customer_email: 'owner@example.test' }], push_subscriptions: [] };
    const fixture = installHandler('supabase/functions/notification-prefs/index.ts', database);
    const endpoint = 'https://push.example.test/owned';
    expect((await fixture.handle(subscriptionRequest(endpoint))).status).toBe(200);
    expect((await fixture.handle(subscriptionRequest(endpoint))).status).toBe(200);
    expect(database.push_subscriptions).toHaveLength(1);
    expect(database.push_subscriptions[0]).toMatchObject({ email: 'owner@example.test', endpoint, p256dh: 'synthetic-key' });
  });
  it('unapproved registry paths remain hidden even if the selection helper returns them', async () => {
    const selections: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
    const fixture = installHandler('supabase/functions/seo-jsonld-hubs/index.ts', {}, {
      resilientSelect: async (_client: unknown, table: string, _columns: unknown, customize: (q: unknown) => unknown) => {
        const filters: Array<[string, unknown]> = [];
        const q = { eq: (key: string, value: unknown) => { filters.push([key, value]); return q; }, order: () => q, limit: () => q };
        customize(q); selections.push({ table, filters });
        return { data: table === 'theme_hubs' ? [] : [
          { path: '/draft-synthetic', is_indexable: false, discovery_status: 'draft' },
          { path: '/public-synthetic', is_indexable: true, discovery_status: 'approved' },
        ] };
      },
      fetch: async () => new Response('<script type="application/ld+json">{"@type":"Organization","name":"Synthetic","url":"https://isolated.test"}</script>'),
    });
    const response = await fixture.handle(new Request('https://isolated.test/seo-jsonld-hubs', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.pages.map((page: { path: string }) => page.path)).toEqual(['/public-synthetic']);
    expect(JSON.stringify(payload)).not.toContain('/draft-synthetic');
    expect(selections.find(selection => selection.table === 'combination_pages_registry')?.filters).toEqual([['is_indexable', true], ['discovery_status', 'approved']]);
  });
  it('GSC exports neutralize query formulas while preserving numeric metrics', () => {
    const csv = toCsv([{ query: '=HYPERLINK("https://example.test")', clicks: 3, ctr: 0.5 }, { query: ' @SUM(1)', clicks: 2, ctr: 0.2 }]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")",3,0.5');
    expect(csv).toContain("' @SUM(1),2,0.2");
  });
});