import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mayReadOrderDetails, privateOrderFields, trackingResponse } from '../supabase/functions/track-order/privacy.ts';

const origin = 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_ANON_KEY;
assert.equal(process.env.RUN_LOCAL_RLS_TESTS, '1');
assert.equal(process.env.SUPABASE_URL, origin);
assert.ok(key, 'Local anon key required');

async function request(path, { token = key, method = 'GET', body, prefer } = {}) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin);
  const res = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await res.text();
  return { status: res.status, data: raw ? JSON.parse(raw) : null };
}
function success(r, label) {
  const detail = [r.data?.code, r.data?.error, r.data?.msg, r.data?.message]
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .join(' | ');
  assert.ok(r.status >= 200 && r.status < 300, label + ': HTTP ' + r.status + (detail ? ' ' + detail : ''));
  return r.data;
}
function denied(r) {
  if (r.status >= 200 && r.status < 300) assert.deepEqual(r.data, []);
  else assert.equal(r.data?.code, '42501', 'Expected explicit authorization error, not schema/network failure');
}
const rest = (table, query = '') => '/rest/v1/' + table + (query ? '?' + query : '');
const rpc = (name, body, token) => request('/rest/v1/rpc/' + name, { method: 'POST', body, token });
const query = (fields, col, value) => 'select=' + fields + '&' + col + '=eq.' + encodeURIComponent(value);
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const emailA = 'qa-a-' + suffix + '@example.test';
const emailB = 'qa-b-' + suffix + '@example.test';
const password = 'LocalQA-only-' + suffix + '!';

test('pure tracking projection hides private fields and checks verified identity', () => {
  const order = { ...Object.fromEntries(privateOrderFields.map(k => [k, 'synthetic private'])), customer_email: emailA, status: 'pending' };
  const items = [{ product_name: 'synthetic item', personalization: 'synthetic private' }];
  const publicResult = trackingResponse(order, items, false);
  for (const k of privateOrderFields) assert.equal(Object.hasOwn(publicResult.order, k), false);
  assert.equal(Object.hasOwn(publicResult.items[0], 'personalization'), false);
  assert.equal(mayReadOrderDetails({ email: emailB, email_confirmed_at: '2026-01-01' }, emailA, false), false);
  assert.equal(mayReadOrderDetails({ email: emailA }, emailA, false), false);
  assert.equal(mayReadOrderDetails({ email: emailA, email_confirmed_at: '2026-01-01' }, emailA, false), true);
  assert.equal(mayReadOrderDetails({ email: emailB }, emailA, true), true);
});

test('disposable stack: real Auth sessions, cross-customer RLS and authoritative checkout prices', async () => {
  const admin = success(await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: 'admin@local.test', password: 'admin123' } }), 'local seed admin login');
  const signup = async email => success(await request('/auth/v1/signup', { method: 'POST', body: { email, password } }), 'synthetic signup');
  const a = await signup(emailA), b = await signup(emailB);
  for (const s of [admin, a, b]) assert.ok(s.access_token && s.user?.id, 'Real GoTrue session required');
  assert.equal(success(await rpc('has_role', { _user_id: admin.user.id, _role: 'admin' }, admin.access_token), 'admin role'), true);
  assert.equal(success(await rpc('has_role', { _user_id: a.user.id, _role: 'admin' }, a.access_token), 'customer role'), false);

  const escalation = await request(rest('user_roles'), { token: a.access_token, method: 'POST', body: { user_id: a.user.id, role: 'admin' } });
  assert.equal(escalation.data?.code, '42501', 'Role escalation must be denied explicitly');
  assert.equal(success(await rpc('has_role', { _user_id: a.user.id, _role: 'admin' }, a.access_token), 'role after attempt'), false);

  const products = success(await request(rest('products', 'select=slug,name,price&slug=eq.caderno-personalizado-a5')), 'seed catalog');
  assert.equal(products.length, 1, 'Seed product is mandatory');
  const product = products[0];
  const price = Number(product.price);
  assert.ok(Number.isFinite(price) && price > 1);
  const code = () => 'LC' + randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  const payload = (orderCode, amount) => ({
    _order: { order_code: orderCode, customer_name: 'Cliente Sintetico QA', customer_email: emailA,
      customer_phone: '41999999999', address_cep: '80000-000', address_city: 'Curitiba',
      address_state: 'PR', shipping_method: 'A calcular via WhatsApp', shipping_price: 0,
      subtotal: amount, total: amount, discount_amount: 0, status: 'pending' },
    _items: [{ product_name: product.name, product_slug: product.slug, quantity: 1, unit_price: amount }],
  });
  const readOrder = async orderCode => success(await request(rest('orders', query('id,subtotal,total,customer_email', 'order_code', orderCode)), { token: admin.access_token }), 'admin order read');
  const baselineCode = code();
  success(await rpc('create_order_with_items', payload(baselineCode, price)), 'valid guest checkout');
  const baseline = await readOrder(baselineCode);
  assert.equal(baseline.length, 1, 'Positive fixture must exist');
  assert.equal(Number(baseline[0].total), price);
  assert.equal(baseline[0].customer_email, emailA);
  const orderId = baseline[0].id;
  const orderItems = success(await request(rest('order_items', query('id,unit_price,quantity', 'order_id', orderId)), { token: admin.access_token }), 'admin items read');
  assert.equal(orderItems.length, 1);
  assert.equal(Number(orderItems[0].unit_price), price);

  for (const token of [key, b.access_token]) {
    denied(await request(rest('orders', query('id,customer_email,customer_phone', 'order_code', baselineCode)), { token }));
    denied(await request(rest('order_items', query('id,personalization', 'order_id', orderId)), { token }));
  }

  const tamperedCode = code();
  const altered = await rpc('create_order_with_items', payload(tamperedCode, 0.01));
  const saved = await readOrder(tamperedCode);
  if (altered.status >= 200 && altered.status < 300) {
    assert.equal(saved.length, 1);
    assert.equal(Number(saved[0].subtotal), price, 'Server must not trust client subtotal');
    assert.equal(Number(saved[0].total), price, 'Server must not trust client total');
    const items = success(await request(rest('order_items', query('unit_price', 'order_id', saved[0].id)), { token: admin.access_token }), 'tampered items read');
    assert.equal(items.length, 1);
    assert.equal(Number(items[0].unit_price), price, 'Server must not trust client unit price');
  } else {
    assert.ok(['P0001', '22023', '23514'].includes(altered.data?.code), 'Tamper rejected for expected validation class');
    assert.equal(saved.length, 0, 'Rejected checkout must not leave a row');
  }
});
