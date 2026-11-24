import { readFileSync } from 'node:fs';
import { ModuleKind, ScriptTarget, transpile } from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { buildStatusEmailData } from '../../supabase/functions/_shared/order-status-email';

type TestUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
};
type Mail = { to: string[]; html: string; subject: string };
type Row = Record<string, unknown>;
const STORE = 'emporiolelecute@gmail.com';
const OWNER = 'owner@example.test';
const confirmedUser = (email = OWNER): TestUser => ({ id: 'synthetic-owner', email, email_confirmed_at: '2026-11-24T00:00:00Z' });

// Execute the real handler with in-memory data, auth and mail; never contact the shared backend.
const installHandler = (options: {
  user?: TestUser | null; authError?: boolean; authThrows?: boolean; admin?: boolean;
  recipient?: string; orderAgeMs?: number;
} = {}) => {
  let registered: ((req: Request) => Promise<Response>) | undefined;
  const send = vi.fn(async (_mail: Mail) => ({ data: { id: 'synthetic-mail' }, error: null }));
  const getUser = vi.fn(async (_token: string) => {
    if (options.authThrows) throw new Error('Synthetic identity outage');
    return { data: { user: options.user ?? null }, error: options.authError ? new Error('Invalid session') : null };
  });
  const order: Row = {
    id: 'synthetic-order', order_code: 'LCABCDEFGHIJKLMNOPQR', customer_email: options.recipient ?? OWNER,
    customer_name: 'Cliente sintético', customer_phone: '41999999999',
    created_at: new Date(Date.now() - (options.orderAgeMs ?? 0)).toISOString(),
    subtotal: 37.5, total: 37.5, shipping_price: 0, status: 'pending',
  };
  const client = {
    auth: { getUser, getClaims: async () => ({ data: { claims: { sub: 'synthetic-admin' } }, error: null }) },
    from: (table: string) => {
      const rows = table === 'orders' ? [order] : table === 'order_items'
        ? [{ order_id: 'synthetic-order', product_name: 'Produto sintético', quantity: 3, unit_price: 12.5 }]
        : options.admin ? [{ user_id: options.user?.id ?? 'synthetic-admin', role: 'admin' }] : [];
      const filters: Array<[string, unknown]> = [];
      const result = () => ({ data: rows.filter(row => filters.every(([key, value]) => row[key as keyof typeof row] === value)), error: null });
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        maybeSingle: async () => ({ data: result().data[0] ?? null, error: null }),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
  const source = readFileSync('supabase/functions/send-order-email/index.ts', 'utf8').replace(/^import .*;$/gm, '');
  const dependencies = {
    createClient: () => client,
    Resend: class { emails = { send }; },
    Deno: { env: { get: () => 'isolated-test-setting' } },
    corsHeaders: { 'Access-Control-Allow-Origin': '*' }, buildStatusEmailData,
    serve: (handler: typeof registered) => { registered = handler; },
  };
  new Function(...Object.keys(dependencies), transpile(source, { target: ScriptTarget.ES2022, module: ModuleKind.None }))(...Object.values(dependencies));
  return {
    send, getUser,
    handle: async (body: Row = { orderCode: order.order_code }, authorization?: string) => {
      if (!registered) throw new Error('Handler not registered');
      return registered(new Request('https://isolated.test/send-order-email', {
        method: 'POST', headers: authorization ? { authorization } : {}, body: JSON.stringify(body),
      }));
    },
  };
};

describe('Round 2.1 — verified customer confirmation boundary', () => {
  it('guest code requests cannot discover orders or cause any emails', async () => {
    const fixture = installHandler({ recipient: 'third-party@example.test' });
    const response = await fixture.handle();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ success: false });
    expect(fixture.send).not.toHaveBeenCalled();
    expect(fixture.getUser).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid session', { user: confirmedUser(), authError: true }],
    ['missing user', {}],
    ['unconfirmed email', { user: { ...confirmedUser(), email_confirmed_at: null } }],
    ['confirmation forged in editable metadata', { user: { id: 'synthetic-owner', email: OWNER, user_metadata: { email_confirmed_at: '2026-11-24', role: 'admin' } } }],
    ['different confirmed email', { user: confirmedUser('other@example.test') }],
    ['missing email', { user: { id: 'synthetic-owner', email_confirmed_at: '2026-11-24' } }],
    ['anonymous authenticated identity', { user: { ...confirmedUser(), is_anonymous: true } }],
    ['identity provider failure', { authThrows: true }],
    ['invalid stored recipient', { user: confirmedUser(), recipient: 'invalid' }],
  ])('%s cannot cause a customer confirmation', async (_name, options) => {
    const fixture = installHandler(options);
    expect((await fixture.handle(undefined, 'Bearer synthetic-session')).status).toBe(403);
    expect(fixture.send).not.toHaveBeenCalled();
  });

  it('verified matching account receives canonical saved order content, not forged payload fields', async () => {
    const fixture = installHandler({ user: confirmedUser('OWNER@EXAMPLE.TEST') });
    expect((await fixture.handle({ orderCode: 'LCABCDEFGHIJKLMNOPQR', customer: { email: 'forged@example.test' }, total: 0, items: [] }, 'Bearer synthetic-session')).status).toBe(200);
    expect(fixture.getUser).toHaveBeenCalledWith('synthetic-session');
    expect(fixture.send.mock.calls.map(([mail]) => mail.to)).toEqual([[STORE], [OWNER]]);
    const customerMail = fixture.send.mock.calls[1]?.[0];
    expect(customerMail?.html).toContain('37,50');
    expect(customerMail?.html).toContain('Produto sintético');
    expect(customerMail?.html).not.toContain('forged@example.test');
  });

  it('absence of a bearer session does not trust a matching identity fixture', async () => {
    const fixture = installHandler({ user: confirmedUser() });
    expect((await fixture.handle(undefined, 'Basic synthetic-session')).status).toBe(403);
    expect(fixture.getUser).not.toHaveBeenCalled();
    expect(fixture.send).not.toHaveBeenCalled();
  });

  it('old orders retain the existing freshness restriction', async () => {
    const fixture = installHandler({ user: confirmedUser(), orderAgeMs: 31 * 60 * 1000 });
    expect((await fixture.handle(undefined, 'Bearer synthetic-session')).status).toBe(403);
    expect(fixture.send).not.toHaveBeenCalled();
  });

  it('quote submissions still send only to the fixed store inbox', async () => {
    const fixture = installHandler();
    expect((await fixture.handle({ type: 'quote', name: 'Cliente sintético', email: 'third-party@example.test', whatsapp: '41999999999' })).status).toBe(200);
    expect(fixture.send.mock.calls.map(([mail]) => mail.to)).toEqual([[STORE]]);
  });

  it('confirmed database admin can notify the store but cannot confirm another mailbox', async () => {
    const fixture = installHandler({ user: confirmedUser('admin@example.test'), admin: true });
    expect((await fixture.handle(undefined, 'Bearer synthetic-session')).status).toBe(200);
    expect(fixture.send.mock.calls.map(([mail]) => mail.to)).toEqual([[STORE]]);
  });

  it('missing and unrelated orders have identical denials for confirmed non-owners', async () => {
    const fixture = installHandler({ user: confirmedUser('other@example.test') });
    const existing = await fixture.handle(undefined, 'Bearer synthetic-session');
    const missing = await fixture.handle({ orderCode: 'LCMISSING' }, 'Bearer synthetic-session');
    expect(existing.status).toBe(403); expect(missing.status).toBe(403);
    expect(await existing.json()).toEqual(await missing.json());
    expect(fixture.send).not.toHaveBeenCalled();
  });

  it('anonymous status-update requests remain denied without sends', async () => {
    const fixture = installHandler();
    expect((await fixture.handle({ type: 'status_update', orderCode: 'LCABC123' })).status).toBe(401);
    expect(fixture.send).not.toHaveBeenCalled();
  });

  it('administrative status updates retain their existing authorization and canonical recipient', async () => {
    const fixture = installHandler({ admin: true });
    // The code matches the independently protected status-update validation.
    expect((await fixture.handle({ type: 'status_update', orderCode: 'LCABCDEFGHIJKLMNOPQR', customerEmail: 'forged@example.test' }, 'Bearer synthetic-admin')).status).toBe(200);
    expect(fixture.send.mock.calls.map(([mail]) => mail.to)).toEqual([[OWNER]]);
  });
});