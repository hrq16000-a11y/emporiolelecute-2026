import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

describe("Administrative RPC anonymous access", () => {
  it("denies anonymous user listing even with crafted sort input", async () => {
    if (!url || !key) throw new Error("Backend configuration required for access regression test");
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error, data } = await client.rpc("list_all_users_paginated", {
      _sort_key: "email; SELECT pg_sleep(10); --",
      _sort_dir: "asc; --",
      _limit: 1,
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});