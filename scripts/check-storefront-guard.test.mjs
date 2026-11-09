import { test } from "node:test";
import assert from "node:assert/strict";
import { auditStorefront, loadFiles } from "./check-storefront-guard.mjs";

test("baseline estática do Empório mantém gate aprovado", () => {
  assert.deepEqual(auditStorefront(loadFiles()), []);
});

test("alteração do banner gera falha na home", () => {
  const f = loadFiles();
  f.home = f.home.replaceAll("<NatalHomeSpotlight", "<RemovedSpotlight");
  assert.ok(auditStorefront(f).some((x) => x.code === "HOME"));
});

test("detecta robots desindexando campanha e canonical incorreto", () => {
  const f = loadFiles();
  f.robots += "\nDisallow: /natal\n";
  f.campaign = f.campaign.replace("https://emporiolelecute.com.br/natal", "https://invalid.example/natal");
  const errors = auditStorefront(f).map((x) => x.code);
  assert.ok(errors.includes("ROBOTS"));
  assert.ok(errors.includes("CANONICAL"));
});

test("impede adicionar agente externo ao bundle da loja", () => {
  const f = loadFiles();
  const pkg = JSON.parse(f.package);
  pkg.dependencies["rea-agents"] = "latest";
  f.package = JSON.stringify(pkg);
  assert.ok(auditStorefront(f).some((x) => x.code === "EXTERNAL_AGENTS"));
});

test("aponta perda de imagens reais do catálogo", () => {
  const f = loadFiles();
  f.campaign = f.campaign.replaceAll("product-images/products/", "sample-images/");
  assert.ok(auditStorefront(f).some((x) => x.code === "PRODUCTS"));
});
