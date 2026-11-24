import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeDiagnosticValue, redactTrackingText } from '@/lib/tracking-privacy';
import { readOrderStreamEvents } from '@/lib/order-stream-events';

// Execute the actual function entry with isolated clients, never the shared backend.
const notificationHandler = (user: unknown, order: unknown = null) => {
  const calls: string[] = [];
  let table = '';
  const prefs = { email_enabled: true, push_enabled: false };
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: table === 'orders' ? order : prefs })),
    upsert: vi.fn(async (values: Record<string, unknown>) => {
      if (table === 'notification_preferences') Object.assign(prefs, values);
      return { error: null };
    }),
    delete: vi.fn().mockReturnThis(),
  };
  const client = { auth: { getUser: vi.fn(async () => { calls.push('auth'); return { data: { user } }; }) },
    from: vi.fn((name: string) => { calls.push('query'); table = name; return query; }) };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync('supabase/functions/notification-prefs/index.ts', 'utf8')
    .replace(/^import .*;$/m, '');
  // Strip TypeScript through the project's installed compiler; production logic is unchanged.
  return { source, client, calls, query, setHandler: (value: typeof handler) => { handler = value; },
    handle: async (req: Request) => { if (!handler) throw new Error('Handler not installed'); return handler(req); } };
};

const install = async (user: unknown, order: unknown = null) => {
  const fixture = notificationHandler(user, order);
  const { transpile } = await import('typescript');
  const compiled = transpile(fixture.source, { target: 9, module: 0 });
  new Function('createClient', 'Deno', compiled)(() => fixture.client, {
    env: { get: () => 'isolated-test-value' }, serve: fixture.setHandler,
  });
  return fixture;
};

const request = (email: string, code: string, signedIn = false, action = 'get', values = {}) => new Request('https://isolated.test/notification-prefs', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(signedIn ? { authorization: 'Bearer isolated-test-session' } : {}) },
  body: JSON.stringify({ action, email, order_code: code, ...values }),
});

describe('360 Round 1 privacy rules', () => {
  it('redacts errors, nested sensitive identifiers and cyclic context while preserving diagnostics', () => {
    const input: Record<string, unknown> = { error: new Error('Failure LCABC123 owner@example.test'),
      route: '/rastrear/LCABCDEFGHIJKLMNOPQR', order_id: 'synthetic-order', nested: { orderCode: 'LCABC123' }, status: 500 };
    input.self = input;
    const output = sanitizeDiagnosticValue(input);
    expect(JSON.stringify(output)).not.toMatch(/LCABC123|LCABCDEFGHIJKLMNOPQR|owner@example.test|synthetic-order/);
    expect(output).toMatchObject({ status: 500, order_id: '[omitted]', self: '[omitted]' });
  });
  it('redacts encoded tracking URLs without crashing on UTF-8 or malformed sequences', () => {
    expect(redactTrackingText('%2Frastrear%2FLCABC123')).toBe('/rastrear');
    expect(redactTrackingText('/buscar?q=%C3%A7')).toBe('/buscar?q=ç');
    expect(() => redactTrackingText('%FF')).not.toThrow();
  });
  it('denies every signed-out order probe before querying orders', async () => {
    const fixture = await install(null);
    for (const code of ['LCABC123', 'LCZZZ999']) {
      const response = await fixture.handle(request('owner@example.test', code));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'sign_in_required' });
    }
    expect(fixture.client.from).not.toHaveBeenCalled();
  });
  it('denies unconfirmed identities before querying orders', async () => {
    const fixture = await install({ email: 'owner@example.test' });
    expect((await fixture.handle(request('owner@example.test', 'LCABC123', true))).status).toBe(401);
    expect(fixture.client.from).not.toHaveBeenCalled();
  });
  it('denies third-party email without querying and hides missing orders identically', async () => {
    const fixture = await install({ email: 'owner@example.test', email_confirmed_at: '2026-11-24' });
    const third = await fixture.handle(request('other@example.test', 'LCABC123', true));
    expect(third.status).toBe(403);
    expect(fixture.client.from).not.toHaveBeenCalled();
    const missing = await fixture.handle(request('owner@example.test', 'LCABC123', true));
    expect(missing.status).toBe(403);
    expect(await missing.json()).toEqual(await third.json());
    expect(fixture.calls).toEqual(['auth', 'auth', 'query']);
    expect(fixture.query.ilike).toHaveBeenCalledWith('customer_email', 'owner@example.test');
  });
  it('allows a verified owner to read preferences only after authentication and scoped lookup', async () => {
    const fixture = await install({ email: 'owner@example.test', email_confirmed_at: '2026-11-24' }, { customer_email: 'owner@example.test' });
    const response = await fixture.handle(request('owner@example.test', 'LCABC123', true));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ email_enabled: true, push_enabled: false, devices: 0 });
    expect(fixture.calls[0]).toBe('auth');
  });
  it('persists owner preference changes and reads them back through the same handler', async () => {
    const fixture = await install({ email: 'owner@example.test', email_confirmed_at: '2026-11-24' }, { customer_email: 'owner@example.test' });
    const saved = await fixture.handle(request('owner@example.test', 'LCABC123', true, 'save', { email_enabled: false, push_enabled: false }));
    expect(saved.status).toBe(200);
    const read = await fixture.handle(request('owner@example.test', 'LCABC123', true));
    expect(await read.json()).toMatchObject({ email_enabled: false, push_enabled: false });
    expect(fixture.query.upsert).toHaveBeenCalledWith({ email: 'owner@example.test', email_enabled: false, push_enabled: false }, { onConflict: 'email' });
  });
  it.each(['get', 'save', 'subscribe', 'unsubscribe'])('denies third-party %s before any read or mutation', async action => {
    const fixture = await install({ email: 'owner@example.test', email_confirmed_at: '2026-11-24' });
    expect((await fixture.handle(request('other@example.test', 'LCABC123', true, action))).status).toBe(403);
    expect(fixture.client.from).not.toHaveBeenCalled();
    expect(fixture.query.upsert).not.toHaveBeenCalled();
    expect(fixture.query.delete).not.toHaveBeenCalled();
  });
  it('preserves ready/status/ping events across split SSE chunks', () => {
    const first = readOrderStreamEvents('event: ready\ndata: {}\n\nevent: sta');
    expect(first.events).toEqual(['ready']);
    const next = readOrderStreamEvents(first.remainder + 'tus\ndata: {}\n\nevent: ping\ndata: {}\n\n');
    expect(next.events).toEqual(['status', 'ping']);
    expect(next.remainder).toBe('');
  });
  it('the actual SSE handler accepts POST bodies, rejects URL queries and emits only status fields', async () => {
    const { transpile } = await import('typescript');
    const source = readFileSync('supabase/functions/order-stream/index.ts', 'utf8').replace(/^import .*;$/gm, '');
    let handler: ((req: Request) => Promise<Response>) | undefined;
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: { order_code: 'LCABC123', status: 'production', updated_at: '2026-11-24' } })) };
    new Function('createClient', 'createTrackingLimiter', 'trackingClient', 'Deno', transpile(source, { target: 9, module: 0 }))(
      () => ({ from: () => query }), () => () => 0, () => 'synthetic-client',
      { env: { get: () => 'isolated-test-value' }, serve: (value: typeof handler) => { handler = value; } },
    );
    if (!handler) throw new Error('Handler not installed');
    const handle = handler as (req: Request) => Promise<Response>;
    expect((await handle(new Request('https://isolated.test/order-stream?code=LCABC123'))).status).toBe(405);
    const response = await handle(new Request('https://isolated.test/order-stream', { method: 'POST', body: JSON.stringify({ code: 'LCABC123' }) }));
    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream missing');
    try {
      const chunk = await reader.read();
      expect(new TextDecoder().decode(chunk.value)).toContain('event: ready');
      expect(query.select).toHaveBeenCalledWith('order_code, status, payment_status, tracking_code, tracking_url, updated_at');
    } finally { await reader.cancel(); }
  });
});