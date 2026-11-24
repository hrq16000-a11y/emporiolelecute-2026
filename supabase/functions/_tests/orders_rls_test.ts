// Deno test: verify that anonymous clients cannot bypass RLS to write to
// `orders` or `order_items`, and that the `create_order_with_items` RPC
// continues to be the only path for guest checkout.
//
// Run with:
//   RUN_LOCAL_RLS_TESTS=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<local-anon-key> deno test --allow-net=127.0.0.1:54321 --allow-env supabase/functions/_tests/orders_rls_test.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const isLocalRlsUrl = (value: string | undefined): boolean =>
  typeof value === 'string' && /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):54321\/?$/.test(value) && !/[\r\n]/.test(value);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
if (Deno.env.get("RUN_LOCAL_RLS_TESTS") !== "1" || !isLocalRlsUrl(SUPABASE_URL) || !SUPABASE_ANON_KEY) {
  throw new Error("RLS tests require explicit RUN_LOCAL_RLS_TESTS=1, local Supabase on port 54321 and a local anon key.");
}

const anon = () => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

const randomCode = () => "LCT" + Math.random().toString(36).slice(2, 7).toUpperCase();

Deno.test({ name: "anon cannot SELECT orders directly", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { data, error } = await anon().from("orders").select("id").limit(1);
  // Either RLS hides everything (data === []) or returns an explicit error.
  // What must NEVER happen: returning rows.
  assertEquals(error, null);
  assertEquals(data?.length ?? 0, 0);
} });

Deno.test({ name: "anon cannot SELECT order_items directly", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { data, error } = await anon().from("order_items").select("id").limit(1);
  assertEquals(error, null);
  assertEquals(data?.length ?? 0, 0);
} });

Deno.test({ name: "anon cannot INSERT directly into orders", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { error } = await anon().from("orders").insert({
    order_code: randomCode(),
    customer_name: "Hacker",
    customer_email: "hacker@example.com",
    customer_phone: "0000000000",
    address_cep: "00000-000",
    address_city: "X",
    address_state: "XX",
    shipping_method: "x",
    subtotal: 1,
    total: 1,
  });
  assert(error !== null, "Expected RLS to block direct INSERT into orders");
} });

Deno.test({ name: "anon cannot INSERT directly into order_items (no orphan/forged items)", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  // Try attaching items to a random/forged order_id.
  const { error } = await anon().from("order_items").insert({
    order_id: "00000000-0000-0000-0000-000000000000",
    product_name: "Forged",
    quantity: 1,
    unit_price: 1,
  });
  assert(error !== null, "Expected RLS to block direct INSERT into order_items");
} });

Deno.test({ name: "RPC create_order_with_items rejects empty items", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { error } = await anon().rpc("create_order_with_items", {
    _order: {
      order_code: randomCode(),
      customer_name: "Test",
      customer_email: "test@example.com",
      customer_phone: "11999999999",
    },
    _items: [],
  });
  assert(error !== null, "Expected RPC to reject empty items array");
} });

Deno.test({ name: "RPC create_order_with_items rejects missing required customer fields", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { error } = await anon().rpc("create_order_with_items", {
    _order: { order_code: randomCode() }, // missing name + email
    _items: [{ product_name: "X", quantity: 1, unit_price: 1 }],
  });
  assert(error !== null, "Expected RPC to reject missing customer fields");
} });

Deno.test({ name: "RPC create_order_with_items succeeds with valid payload", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const code = randomCode();
  const { data, error } = await anon().rpc("create_order_with_items", {
    _order: {
      order_code: code,
      customer_name: "Cliente Teste",
      customer_email: "cliente@example.com",
      customer_phone: "41999999999",
      address_cep: "80000-000",
      address_city: "Curitiba",
      address_state: "PR",
      subtotal: 69,
      total: 69,
    },
    _items: [
      { product_name: "Sabonete teste", quantity: 10, unit_price: 6.9 },
    ],
  });
  assertEquals(error, null);
  assert(data && typeof data === "object", "Expected RPC to return order data");
  // Anon still cannot read the row back.
  const { data: readback } = await anon().from("orders").select("id").eq("order_code", code);
  assertEquals(readback?.length ?? 0, 0);
} });
