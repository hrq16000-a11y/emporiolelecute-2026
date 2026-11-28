/**
 * Privacidade de dados de clientes.
 *
 * Confirma que dados de contato de pedidos (customer_phone / customer_email)
 * não vazam por leitura pública. O acesso legítimo acontece apenas via
 * Edge Function com identidade verificada para dados pessoais ou sessão de admin.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const isLocalRlsUrl = (value: string | undefined): boolean =>
  typeof value === 'string' && /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):54321\/?$/.test(value) && !/[\r\n]/.test(value);
const canRun = process.env.RUN_LOCAL_RLS_TESTS === "1" && isLocalRlsUrl(url) && Boolean(anonKey);

const suite = canRun ? describe : describe.skip;

const isDenied = (error: { message?: string; code?: string } | null, rows: unknown[] | null) => {
  if (error) return error.code === "42501";
  return Array.isArray(rows) && rows.length === 0;
};

describe("Validação da evidência de privacidade (offline)", () => {
  it("aceita somente negação de permissão explícita ou lista vazia", () => {
    expect(isDenied({ code: "42501" }, null)).toBe(true);
    expect(isDenied(null, [])).toBe(true);
  });
  it("não confunde erros de schema, rede ou resposta ausente com proteção", () => {
    for (const code of ["42703", "42P01", "PGRST204", "PGRST205", "NETWORK"]) {
      expect(isDenied({ code, message: "does not exist" }, null)).toBe(false);
    }
    expect(isDenied(null, null)).toBe(false);
    expect(isDenied(null, [{ id: "synthetic" }])).toBe(false);
  });
});


suite("Privacidade — contatos de pedidos não são públicos", () => {
  const anon = () => createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("não expõe customer_phone em orders para anônimos", async () => {
    const { data, error } = await anon().from("orders").select("id, customer_phone").limit(5);
    expect(isDenied(error, data as unknown[] | null)).toBe(true);
  });

  it("não expõe customer_email em orders para anônimos", async () => {
    const { data, error } = await anon().from("orders").select("id, customer_email").limit(5);
    expect(isDenied(error, data as unknown[] | null)).toBe(true);
  });

  it("não permite listagem de customers para anônimos", async () => {
    const { data, error } = await anon().from("customers").select("id, phone, email").limit(5);
    expect(isDenied(error, data as unknown[] | null)).toBe(true);
  });

  it("não permite listagem completa de orders para anônimos", async () => {
    const { data, error } = await anon().from("orders").select("id").limit(1);
    expect(isDenied(error, data as unknown[] | null)).toBe(true);
  });
});
