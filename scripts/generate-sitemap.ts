/**
 * Fase 2.1b — Materialização do sitemap (Estratégia B).
 *
 * Fonte única de verdade:  supabase/functions/generate-sitemap
 * Saída materializada:     public/sitemap.xml  (servida estática pelo CDN)
 * Audit trail:             public/.sitemap-source.json (commit junto)
 *
 * Fluxo (simples, auditável, sem mágica):
 *   1. Faz HTTP GET na edge function deployada.
 *   2. Valida o XML (presença dos marcadores `lovable:sitemap-source`).
 *   3. Sobrescreve `public/sitemap.xml` apenas se a validação passar.
 *   4. Escreve `public/.sitemap-source.json` com timestamp/hash/count
 *      para auditoria do último materializado.
 *
 * Falha SEGURA: se o fetch falhar (offline, função fora do ar), o script
 * loga warning e SAI 0 — o `public/sitemap.xml` existente é preservado.
 * O build NUNCA quebra por causa de sitemap.
 *
 * Execução:
 *   - manual:  bun run scripts/generate-sitemap.ts
 *   - prebuild (recomendado): adicionar
 *       "prebuild": "bun run scripts/generate-sitemap.ts"
 *     em package.json (Lovable executa antes do `vite build`).
 *
 * REQUISITOS .env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
 */

// @ts-expect-error - node types not in tsconfig
import { writeFileSync, readFileSync, existsSync } from "fs";
// @ts-expect-error - node types not in tsconfig
import { resolve } from "path";
// @ts-expect-error - node types not in tsconfig
import { createHash } from "crypto";
// @ts-expect-error - node types not in tsconfig
import process from "process";

const OUT_XML = resolve("public/sitemap.xml");
const OUT_META = resolve("public/.sitemap-source.json");
const SOURCE_MARKER = "lovable:sitemap-source generate-sitemap";

function loadEnv(): Record<string, string> {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main(): Promise<void> {
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn(
      "[sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY ausentes — pulando regeneração.",
    );
    return;
  }

  const endpoint = `${url}/functions/v1/generate-sitemap`;
  console.log(`[sitemap] GET ${endpoint}`);

  let xml: string;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: "{}",
    });
    if (!res.ok) {
      console.warn(
        `[sitemap] edge function HTTP ${res.status} — preservando sitemap atual.`,
      );
      return;
    }
    xml = await res.text();
  } catch (err) {
    console.warn(
      `[sitemap] falha de rede (${(err as Error).message}) — preservando sitemap atual.`,
    );
    return;
  }

  // Página editorial sazonal pública, adicionada sem modificar a fonte dinâmica dos produtos.
  const natalUrl = "https://emporiolelecute.com.br/natal";
  if (!xml.includes(`<loc>${natalUrl}</loc>`) && xml.includes("</urlset>")) {
    xml = xml.replace("</urlset>", `  <url>
    <loc>${natalUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
</urlset>`);
  }

  // Validação: deve conter o marcador de origem (anti-corrupção).
  if (!xml.includes(SOURCE_MARKER)) {
    console.warn(
      "[sitemap] resposta sem marcador de origem — preservando sitemap atual.",
    );
    return;
  }

  // Extrai metadata dos comentários para auditoria.
  const pick = (k: string): string | null => {
    const m = xml.match(new RegExp(`<!--\\s*lovable:${k}\\s+(.*?)\\s*-->`));
    return m ? m[1].trim() : null;
  };
  const meta = {
    materialized_at: new Date().toISOString(),
    source: pick("sitemap-source"),
    generated_at: pick("sitemap-generated-at"),
    namespace: pick("sitemap-namespace"),
    products_count: Number(pick("sitemap-products-count") ?? "0"),
    sha256: createHash("sha256").update(xml).digest("hex"),
    bytes: xml.length,
    endpoint,
  };

  writeFileSync(OUT_XML, xml, "utf8");
  writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(
    `[sitemap] materializado (${meta.bytes} bytes, ${meta.products_count} produtos, ns=${meta.namespace})`,
  );
}

main().catch((err) => {
  console.warn(`[sitemap] erro inesperado: ${(err as Error).message}`);
});
