// Real local Auth/PostgREST persistence, production handlers and memory-only mail.
// Run with Bun only inside the disposable, egress-fenced runner.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { ModuleKind, ScriptTarget, transpile } from 'typescript';
import { z } from 'zod';
import * as shipping from '../supabase/functions/calculate-shipping/lib.ts';
import { ownsVisitorId, deriveVisitorId } from '../supabase/functions/_shared/visitor-capability.ts';
import { buildStatusEmailData } from '../supabase/functions/_shared/order-status-email.ts';

assert.equal(process.env.RUN_SELECTED_LOCAL_QA, '1');
const status = JSON.parse(readFileSync(process.env.LOCAL_STATUS_FILE, 'utf8'));
const api = status.API_URL;
const serviceKey = status.SERVICE_ROLE_KEY;
const anonKey = status.ANON_KEY;
assert.equal(api, 'http://127.0.0.1:54321');
assert.ok(serviceKey && anonKey, 'Disposable local keys required');
const carrierOrigin = 'http://127.0.0.1:8778';
const requests = [];
const nativeFetch = globalThis.fetch;
const localFetch = async (resource, options = {}) => {
 const url = new URL(typeof resource === 'string' ? resource : resource instanceof URL ? resource.href : resource.url);
 assert.ok([api, carrierOrigin].includes(url.origin), 'External network attempt blocked');
 requests.push(url.pathname + url.search);
 return nativeFetch(resource, { ...options, redirect: 'error' });
};
const admin = createClient(api, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: localFetch } });
const requireData = (result, label) => {
 assert.equal(result.error, null, label);
 return result.data;
};
const mails = [];
const loadHandler = path => {
 let handler;
 let attempts = 0;
 const source = readFileSync(path, 'utf8').replace(/^import .*;$/gm, '');
 const dependencies = {
  createClient: (url, key) => { assert.equal(url, api); assert.equal(key, serviceKey); return admin; },
  Resend: class { emails = { send: async mail => { mails.push(mail); return { data: { id: 'memory-only' }, error: null }; } }; },
  corsHeaders: {}, z, ...shipping, ownsVisitorId, buildStatusEmailData, fetch: localFetch,
  Deno: { env: { get: name => ({ SUPABASE_URL: api, SUPABASE_SERVICE_ROLE_KEY: serviceKey, RESEND_API_KEY: 'memory-only' })[name] }, serve: value => { handler = value; } },
  serve: value => { handler = value; },
 };
 new Function(...Object.keys(dependencies), transpile(source, { target: ScriptTarget.ES2022, module: ModuleKind.None }))(...Object.values(dependencies));
 assert.equal(typeof handler, 'function');
 return async (body, token) => {
  const response = await handler(new Request(api + '/isolated-handler', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `127.0.0.${++attempts}`, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
  return { status: response.status, body: await response.json() };
 };
};
let carrierCalls = 0;
const carrier = createServer((req, res) => {
 assert.equal(req.url, '/carrier');
 carrierCalls++;
 req.resume();
 res.setHeader('content-type', 'application/json');
 res.end(JSON.stringify([{ company: { name: 'Local test carrier' }, name: 'Synthetic quote', price: '21.00', delivery_range: { min: 3, max: 4 } }]));
});
await new Promise(resolve => carrier.listen(8778, '127.0.0.1', resolve));
try {
 const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
 const password = 'Local-test-' + randomUUID();
 const account = async label => {
  const email = `${label}-${suffix}@example.test`;
  const created = requireData(await admin.auth.admin.createUser({ email, password, email_confirm: true }), 'local account creation');
  const client = createClient(api, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: localFetch } });
  const session = requireData(await client.auth.signInWithPassword({ email, password }), 'real local password sign-in');
  assert.ok(session.user.email_confirmed_at && session.session.access_token);
  assert.equal(requireData(await admin.auth.getUser(session.session.access_token), 'real session validation').user.id, created.user.id);
  return { email, id: created.user.id, token: session.session.access_token, client };
 };
 const owner = await account('owner'), other = await account('other'), operator = await account('admin');
 requireData(await admin.from('user_roles').insert({ user_id: operator.id, role: 'admin' }), 'local admin grant');
 const orderCode = 'LC' + suffix.toUpperCase() + 'TEST';
 const order = requireData(await admin.from('orders').insert({ order_code: orderCode, customer_email: owner.email, customer_name: 'Synthetic customer', subtotal: 37.5, total: 37.5 }).select().single(), 'synthetic saved order');
 requireData(await admin.from('order_items').insert({ order_id: order.id, product_name: 'Synthetic product', quantity: 3, unit_price: 12.5 }), 'synthetic item');
 const send = loadHandler('supabase/functions/send-order-email/index.ts');
 for (const token of [undefined, anonKey, 'invalid-session', other.token]) {
  const before = requests.length;
  const result = await send({ orderCode }, token);
  assert.equal(result.status, 403); assert.equal(mails.length, 0);
  if (token === undefined) assert.equal(requests.length, before, 'Guest denial before database reads');
 }
 assert.deepEqual((await send({ orderCode }, other.token)).body, (await send({ orderCode: 'LCMISSING' }, other.token)).body);
 assert.equal((await send({ orderCode, total: 0, customer: { email: other.email } }, owner.token)).status, 200);
 assert.deepEqual(mails.map(mail => mail.to), [['emporiolelecute@gmail.com'], [owner.email]]);
 assert.ok(mails[1].html.includes('37,50') && mails[1].html.includes('Synthetic product'));
 mails.length = 0;
 assert.equal((await send({ orderCode }, operator.token)).status, 200);
 assert.deepEqual(mails.map(mail => mail.to), [['emporiolelecute@gmail.com']]);
 assert.equal(requireData(await admin.from('orders').select('total').eq('id', order.id).single(), 'saved total readback').total, 37.5);
 const deniedRead = await owner.client.from('orders').select('id');
 assert.ok(deniedRead.error || deniedRead.data.length === 0, 'Private fixture table must reject direct customer access');
 console.log('PASS: real confirmed sessions, guest/non-owner denials, matching owner/admin sends captured only in memory, canonical total readback.');

 const product = requireData(await admin.from('products').insert({ name: 'Synthetic product', price: 12.5, weight_kg: 0.3 }).select().single(), 'local product');
 const hidden = requireData(await admin.from('products').insert({ name: 'Synthetic hidden product', price: 1, weight_kg: 0.3, is_active: false }).select().single(), 'local hidden product');
 requireData(await admin.from('shipping_settings').insert({ origin_zip_code: '80000000', is_enabled: true, default_box_weight_kg: 0.3 }), 'local settings');
 requireData(await admin.from('shipping_providers').insert({ provider_code: 'melhor_envio', provider_name: 'Local test carrier', api_key: 'local-synthetic-credential', endpoint_url: carrierOrigin + '/carrier', is_active: true }), 'local provider');
 const quote = loadHandler('supabase/functions/calculate-shipping/index.ts');
 const cart = { cep_destino: '01001000', items: [{ product_id: product.id, name: product.name, quantity: 3 }] };
 for (const token of [undefined, anonKey, 'invalid-session']) {
  const before = requests.length;
  assert.equal((await quote(cart, token)).status, 401);
  assert.equal(carrierCalls, 0);
  assert.ok(!requests.slice(before).some(path => path.includes('/rest/v1/')), 'No provider/cache/audit access before authentication');
 }
 assert.equal((await quote({ ...cart, items: [...cart.items, { product_id: hidden.id, name: hidden.name, quantity: 1 }] }, owner.token)).status, 400);
 assert.equal(carrierCalls, 0);
 const result = await quote(cart, owner.token);
 assert.equal(result.status, 200); assert.equal(carrierCalls, 1); assert.equal(result.body.options[0].price, 21);
 console.log('PASS: real login before provider/cache/audit access; active catalog validated; carrier contacted only on local loopback sink.');

 const visit = loadHandler('supabase/functions/track-visit/index.ts');
 const credential = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
 const visitorId = await deriveVisitorId(credential);
 const identity = { visitor_id: visitorId, visitor_credential: credential };
 const legacy = randomUUID();
 for (const event of ['init', 'pageview', 'heartbeat', 'consent', 'lead', 'session_end']) {
  const before = requests.length;
  assert.equal((await visit({ visitor_id: legacy, event })).status, 403);
  assert.equal(requests.length, before, 'Legacy denial before persistence');
 }
 assert.equal((await visit({ ...identity, event: 'init', path: '/loja', device: { screen_w: 390 } })).status, 200);
 const page = await visit({ ...identity, event: 'pageview', path: '/loja' });
 assert.equal(page.status, 200); assert.ok(page.body.pageview_id);
 assert.equal((await visit({ ...identity, event: 'heartbeat', delta_seconds: 10, pageview_id: randomUUID() })).status, 200);
 assert.equal((await visit({ ...identity, event: 'consent', accepted: true, categories: { analytics: true } })).status, 200);
 assert.equal((await visit({ ...identity, event: 'lead', lead_trigger: 'quote' })).status, 200);
 assert.equal((await visit({ ...identity, event: 'session_end' })).status, 200);
 const before = requests.length;
 assert.equal((await visit({ ...identity, visitor_credential: 'cd'.repeat(32), event: 'lead' })).status, 403);
 assert.equal(requests.length, before);
 const row = requireData(await admin.from('visitors').select('*').eq('visitor_id', visitorId).single(), 'owned visitor readback');
 assert.equal(row.screen_w, 390); assert.equal(row.total_pageviews, 1); assert.equal(row.total_time_seconds, 10); assert.equal(row.lead_status, 'lead'); assert.equal(row.consent_status, 'accepted');
 assert.ok(!JSON.stringify(row).includes(credential), 'Credential must never be persisted');
 const persistedPage = requireData(await admin.from('visitor_pageviews').select('*').eq('id', page.body.pageview_id).single(), 'owned pageview readback');
 assert.equal(persistedPage.time_on_page_seconds, 10);
 assert.equal(requireData(await admin.from('visitors').select('visitor_id').eq('visitor_id', legacy), 'legacy readback').length, 0);
 console.log('PASS: all six visitor events credential-bound; legacy/foreign requests denied before persistence; own history read back; no credential stored.');
 console.log('ISOLATED SELECTED SECURITY HOMOLOGATION PASS: real local Auth and PostgREST, minimal disposable schema; not a full migration/RLS replay or production deployment.');
} finally {
 await new Promise(resolve => carrier.close(resolve));
}