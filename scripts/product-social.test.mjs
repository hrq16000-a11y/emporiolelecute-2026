import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productSocial } from "../api/product-social.js";

const slug = "lembrancinha-sabonete-natal-presepio-sagrada-familia";
const canonical = "https://emporiolelecute.com.br/produto/" + slug;
const html = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonical}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="product">
<meta property="og:title" content="Lembrancinha Presépio | Empório LeleCute">
<meta property="og:image" content="https://example.test/product.webp">
<meta name="x-prerender" content="edge-bot">
<script type="application/ld+json">{"@type":"Product"}</script>
</head><body>Presépio</body></html>`;
const req = (query = "slug=" + slug, init = {}) => new Request(
  "https://emporiolelecute.com.br/api/product-social?" + query,
  { headers: { "user-agent": "facebookexternalhit/1.1", Cookie: "private", Authorization: "Bearer private" }, ...init },
);
const upstream = (body = html, headers = {}) => new Response(body, { headers: { "content-type": "text/plain", ...headers } });
const unexpected = () => { assert.fail("upstream must not be called"); };

test("public product metadata and UTF-8 survive source text/plain", async () => {
  const result = await productSocial(req("slug=" + slug + "&utm_source=share&path=/admin"), async (url, init) => {
    assert.equal(String(url), "https://xfqffqxqiuqauefrrcxn.supabase.co/functions/v1/prerender?path=%2Fproduto%2F" + slug);
    assert.deepEqual(init.headers, { Accept: "text/html, text/plain" });
    assert.equal(init.redirect, "error");
    assert.equal(init.method, "GET");
    assert.ok(init.signal instanceof AbortSignal);
    return upstream();
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.headers.get("vary"), "User-Agent");
  assert.equal(await result.text(), html);
});

test("no upstream call for ordinary visitors or invalid/duplicate slugs", async () => {
  for (const q of ["", "slug=", "slug=..%2Fadmin", "slug=%2Fconta", "slug=x&slug=y", "slug=" + "a".repeat(181)]) {
    assert.equal((await productSocial(req(q), unexpected)).status, 404);
  }
  assert.equal((await productSocial(req(undefined, { headers: { "user-agent": "Mozilla/5.0" } }), unexpected)).status, 404);
  assert.equal((await productSocial(req(undefined, { method: "POST" }), unexpected)).status, 405);
});

test("missing product is noindex 404, never a fabricated card", async () => {
  const missing = html.replace('content="product"', 'content="website"').replace('content="index,follow"', 'content="noindex,follow"');
  const result = await productSocial(req(), async () => upstream(missing));
  assert.equal(result.status, 404);
  assert.equal(result.headers.get("x-robots-tag"), "noindex");
});

test("wrong canonical, absent image, unexpected content, and oversized payload fail closed", async () => {
  for (const fixture of [html.replaceAll(canonical, "https://example.test"), html.replace("https://example.test/product.webp", "http://example.test/image.webp"), "<html>home</html>", html + "x".repeat(128 * 1024)]) {
    assert.equal((await productSocial(req(), async () => upstream(fixture))).status, 503);
  }
  assert.equal((await productSocial(req(), async () => upstream(html, { "x-prerender-error": "1" }))).status, 503);
  assert.equal((await productSocial(req(), async () => upstream(html, { "content-type": "application/json" }))).status, 503);
  assert.equal((await productSocial(req(), async () => { throw new Error("network unavailable"); })).status, 503);
});

test("HEAD has metadata response headers without body", async () => {
  const result = await productSocial(req(undefined, { method: "HEAD" }), async () => upstream());
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "");
});

test("routing is limited to product social crawlers and SPA fallback stays last", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const [route, fallback] = config.rewrites;
  assert.equal(route.source, "/produto/:slug([a-z0-9-]+)");
  assert.equal(route.destination, "/api/product-social?slug=:slug");
  assert.deepEqual(route.missing, [{ type: "query", key: "slug" }]);
  assert.equal(route.has[0].key, "user-agent");
  const regex = new RegExp(route.has[0].value);
  for (const agent of ["facebookexternalhit/1.1", "WhatsApp/2.26", "Twitterbot/1.0", "LinkedInBot/1.0", "Slackbot-LinkExpanding", "TelegramBot", "Discordbot", "Pinterestbot"]) {
    assert.ok(regex.test(agent), agent);
  }
  for (const agent of ["Mozilla/5.0", "Googlebot", "GPTBot", "Bingbot"]) assert.equal(regex.test(agent), false, agent);
  assert.deepEqual(fallback, { source: "/(.*)", destination: "/index.html" });
});
