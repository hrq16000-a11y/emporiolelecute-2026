import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { ModuleKind, ScriptTarget, transpile } from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import * as shipping from '../../supabase/functions/calculate-shipping/lib';
import { deriveVisitorId, ownsVisitorId } from '../../supabase/functions/_shared/visitor-capability';
import { getVisitorIdentity, markLead } from '@/lib/visitor';
import { recordConsent } from '@/lib/cookie-consent';
import { sanitizeDiagnosticValue } from '@/lib/tracking-privacy';

type Row = Record<string, unknown>;
const secret = 'ab'.repeat(32);
const otherSecret = 'cd'.repeat(32);
const legacyId = '00000000-0000-4000-8000-000000000001';
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Execute production handlers against in-memory clients only.
const install = (path: string, user: Row | null = null, authError = false) => {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const reads: string[] = []; const writes: Row[] = [];
  const rpc = vi.fn(async (_name: string, _args: Row) => ({ data: 'synthetic-pageview', error: null }));
  const getUser = vi.fn(async () => ({ data: { user }, error: authError ? new Error('Invalid identity') : null }));
  const client = { auth: { getUser }, rpc, from: (table: string) => {
    reads.push(table);
    const q = {
      select: () => q, eq: () => q, limit: () => q, order: () => q,
      maybeSingle: async () => ({ data: table === 'visitors' ? { visitor_id: 'owned', is_bot: false } : null, error: null }),
      insert: async (value: Row) => { writes.push(value); return { error: null }; },
      update: (value: Row) => { writes.push(value); return q; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    }; return q;
  } };
  const fetch = vi.fn(async () => new Response('{}'));
  const source = readFileSync(path, 'utf8').replace(/^import .*;$/gm, '');
  const dependencies = { createClient: () => client, corsHeaders: {}, ownsVisitorId, z, ...shipping, fetch,
    Deno: { env: { get: () => 'isolated-setting' }, serve: (value: typeof handler) => { handler = value; } } };
  new Function(...Object.keys(dependencies), transpile(source, { target: ScriptTarget.ES2022, module: ModuleKind.None }))(...Object.values(dependencies));
  return { reads, writes, rpc, fetch, getUser, handle: async (body: Row, token?: string) => {
    if (!handler) throw new Error('Missing handler');
    return handler(new Request('https://isolated.test/function', { method: 'POST', headers: token ? { authorization: token } : {}, body: JSON.stringify(body) }));
  } };
};

describe('Authorized carrier account boundary', () => {
  it.each([
    ['guest', null, undefined, false],
    ['public key bearer', null, 'Bearer public-key', false],
    ['invalid identity', { id: 'owner' }, 'Bearer synthetic', true],
    ['anonymous auth', { id: 'owner', is_anonymous: true }, 'Bearer synthetic', false],
  ] as const)('%s cannot read credentials/cache or call carrier/write audits', async (_name, user, token, error) => {
    const f = install('supabase/functions/calculate-shipping/index.ts', user, error);
    expect((await f.handle({ cep_destino: '01001000', items: [] }, token)).status).toBe(401);
    expect(f.reads).toEqual([]); expect(f.writes).toEqual([]); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('server-verified non-anonymous login reaches validation', async () => {
    const f = install('supabase/functions/calculate-shipping/index.ts', { id: 'owner' });
    expect((await f.handle({ cep_destino: '01001000', items: [] }, 'Bearer synthetic')).status).toBe(400);
    expect(f.getUser).toHaveBeenCalledWith('synthetic');
  });
});

describe('Browser-bound visitor history', () => {
  it('recursive diagnostics omit the browser credential', () => {
    expect(sanitizeDiagnosticValue({ nested: [{ visitor_credential: secret, visitorCredential: secret, status: 403 }] })).toEqual({ nested: [{ visitor_credential: '[omitted]', visitorCredential: '[omitted]', status: 403 }] });
  });
  it.each(['init', 'pageview', 'heartbeat', 'consent', 'lead', 'session_end'])('a leaked legacy UUID cannot authorize %s', async event => {
    const f = install('supabase/functions/track-visit/index.ts');
    expect((await f.handle({ visitor_id: legacyId, event, path: '/loja' })).status).toBe(403);
    expect(f.reads).toEqual([]); expect(f.writes).toEqual([]); expect(f.rpc).not.toHaveBeenCalled(); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('another browser secret cannot mutate the owned record', async () => {
    const f = install('supabase/functions/track-visit/index.ts');
    expect((await f.handle({ visitor_id: await deriveVisitorId(secret), visitor_credential: otherSecret, event: 'lead' })).status).toBe(403);
    expect(f.reads).toEqual([]); expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(['init', 'pageview', 'heartbeat', 'consent', 'lead', 'session_end'])('the owner can record %s without persisting the secret', async event => {
    const f = install('supabase/functions/track-visit/index.ts');
    expect((await f.handle({ visitor_id: await deriveVisitorId(secret), visitor_credential: secret, event, path: '/loja', delta_seconds: 10 })).status).toBe(200);
    expect(f.writes.length).toBeGreaterThan(0);
    expect(JSON.stringify(f.writes)).not.toContain(secret);
  });
  it('heartbeat cannot mutate a foreign caller-selected pageview', async () => {
    const f = install('supabase/functions/track-visit/index.ts');
    expect((await f.handle({ visitor_id: await deriveVisitorId(secret), visitor_credential: secret, event: 'heartbeat', pageview_id: legacyId, delta_seconds: 10 })).status).toBe(200);
    expect(f.rpc).toHaveBeenCalledWith('track_heartbeat', expect.objectContaining({ _pageview_id: null, _visitor_id: await deriveVisitorId(secret) }));
  });
  it('legacy browsers start a new stable identity and leads send its capability', async () => {
    recordConsent(true); localStorage.setItem('elc_visitor_id', legacyId);
    const identity = await getVisitorIdentity();
    expect(identity?.visitor_credential).toMatch(/^[a-f0-9]{64}$/);
    expect(identity?.visitor_id).not.toBe(legacyId);
    expect(await getVisitorIdentity()).toEqual(identity);
    const fetch = vi.fn(async () => new Response('{}')); vi.stubGlobal('fetch', fetch);
    await markLead('quote');
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(call[1].body))).toMatchObject({ ...identity, event: 'lead' });
  });
  it('refusal creates no credential and revocation cancels a pending identity', async () => {
    expect(await getVisitorIdentity()).toBeNull();
    recordConsent(true); const pending = getVisitorIdentity(); recordConsent(false);
    expect(await pending).toBeNull(); expect(localStorage.getItem('elc_visitor_credential')).toBeNull();
  });
});