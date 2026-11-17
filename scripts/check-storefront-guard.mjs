#!/usr/bin/env node
/** Storefront gate: static, offline and read-only. A PASS is not a production or checkout test. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FILES = Object.freeze({
  app: "src/App.tsx",
  home: "src/pages/Index.tsx",
  campaign: "src/pages/Natal.tsx",
  navigation: "src/components/Header.tsx",
  sitemap: "scripts/generate-sitemap.ts",
  robots: "public/robots.txt",
  package: "package.json",
});

const ORIGIN = "https://emporiolelecute.com.br";

export function loadFiles(root = process.cwd()) {
  return Object.fromEntries(Object.entries(FILES).map(([key, file]) =>
    [key, readFileSync(resolve(root, file), "utf8")]));
}

export function auditStorefront(f) {
  const problems = [];
  const gate = (ok, code, reason) => {
    if (!ok) problems.push({ code, reason });
  };
  gate(f.app.includes('path="/natal"') && f.app.includes('import("./pages/Natal")'),
    "ROUTE", "Rota e import de /natal devem permanecer no router.");
  gate(f.home.includes("<NatalHomeSpotlight") && f.home.includes("<NatalWelcomeInvite"),
    "HOME", "Vitrine e convite de Natal devem existir na home.");
  gate(f.navigation.includes('href: "/natal"'),
    "NAVIGATION", "Menu principal precisa apontar para /natal.");
  gate(f.campaign.includes('const canonical = "' + ORIGIN + '/natal"') &&
    f.campaign.includes('<link rel="canonical" href={canonical}'),
    "CANONICAL", "Canonical da campanha deve ser o domínio oficial.");
  gate(f.campaign.includes('name="robots" content="index,follow') &&
    f.campaign.includes('"@type": "CollectionPage"'),
    "INDEXABILITY", "Metadados de indexação e CollectionPage não encontrados na origem.");
  gate(f.campaign.includes("<QuoteFormSection") &&
    f.campaign.includes("/ocasiao/natal-e-ano-novo"),
    "CONVERSION", "Orçamento e navegação para coleção de Natal devem permanecer.");
  gate(f.campaign.includes("/produto/lembrancinha") &&
    f.campaign.includes("product-images/products/"),
    "PRODUCTS", "Links e imagens de produtos reais não encontrados.");
  gate(f.sitemap.includes(ORIGIN + "/natal") && f.sitemap.includes("</urlset>"),
    "SITEMAP", "Gerador de sitemap deve incluir /natal.");
  gate(f.robots.includes("Sitemap: " + ORIGIN + "/sitemap.xml") &&
    !/^\s*Disallow:\s*\/natal(?:\s|\/|$)/m.test(f.robots),
    "ROBOTS", "robots.txt não deve bloquear /natal.");
  let deps = {};
  try {
    const pkg = JSON.parse(f.package);
    deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
  } catch {
    problems.push({ code: "PACKAGE", reason: "package.json inválido." });
  }
  gate(!Object.keys(deps).some((name) =>
    /^(rea-agents|@mendable\/firecrawl-js|@firecrawl\/|@hyperframes\/|hyperframes$|@remotion\/|remotion$|freellmapi$|claude-mem$|ai-memory$)/i.test(name)),
    "EXTERNAL_AGENTS", "Agentes, pipelines de mídia e roteadores LLM não podem entrar no runtime do comércio automaticamente.");
  return problems;
}

function main() {
  let problems;
  try { problems = auditStorefront(loadFiles()); }
  catch (error) {
    console.error("[storefront] Falha de leitura: " + error.message);
    process.exitCode = 1;
    return;
  }
  for (const p of problems) console.error("[FAIL] " + p.code + ": " + p.reason);
  if (problems.length) process.exitCode = 1;
  else console.log("[storefront] PASS: rotas, Natal, produtos reais, SEO e runtime externo.");
  console.log("[storefront] Check source only: verify browser, cart, quote form and production separately.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
