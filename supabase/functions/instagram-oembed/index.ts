// Edge function: Instagram public scraper (no Graph API, no token).
// Actions:
//   - extract: { url }                 → parse og:image/og:title de um post
//   - profile: { username }            → tentativa best-effort de listar últimas postagens do perfil
//   - bulk-refresh: {}                 → re-extrai thumbnail/título de todos os posts cadastrados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authorizeOperationalRequest } from "../_shared/operational-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHORTCODE_RE = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i;
const UA =
  "Mozilla/5.0 (compatible; LeleCuteBot/1.0; +https://emporiolelecute.com.br)";

function extractMeta(html: string, prop: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m1 = html.match(re1);
  if (m1) return decodeEntities(m1[1]);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1]) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function classifyUrl(url: string): { ok: boolean; shortcode: string | null; permalink: string | null; reason?: string } {
  if (!url || typeof url !== "string") return { ok: false, shortcode: null, permalink: null, reason: "URL vazia" };
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return { ok: false, shortcode: null, permalink: null, reason: "URL deve começar com https://" };
  if (!/instagram\.com/i.test(trimmed)) return { ok: false, shortcode: null, permalink: null, reason: "Não é uma URL do Instagram" };
  const m = trimmed.match(SHORTCODE_RE);
  if (!m) return { ok: false, shortcode: null, permalink: null, reason: "Use uma URL de post: instagram.com/p/<id>, /reel/<id> ou /tv/<id>" };
  return {
    ok: true,
    shortcode: m[1],
    permalink: `https://www.instagram.com/p/${m[1]}/`,
  };
}

async function fetchPostMeta(permalink: string): Promise<{ image_url: string | null; title: string | null; error: string | null; meta_used: string | null }> {
  try {
    const res = await fetch(permalink, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return { image_url: null, title: null, error: `HTTP ${res.status} ao acessar o post`, meta_used: null };
    const html = await res.text();
    if (/login|loginPage|"isLoggedIn":false/i.test(html) && !/og:image/i.test(html)) {
      return { image_url: null, title: null, error: "Instagram exigiu login para esta URL", meta_used: null };
    }
    // Cascata de fallbacks de imagem
    const candidates: { key: string; value: string | null }[] = [
      { key: "og:image", value: extractMeta(html, "og:image") },
      { key: "og:image:secure_url", value: extractMeta(html, "og:image:secure_url") },
      { key: "twitter:image", value: extractMeta(html, "twitter:image") },
      { key: "twitter:image:src", value: extractMeta(html, "twitter:image:src") },
      { key: "image", value: extractMeta(html, "image") },
    ];
    const hit = candidates.find((c) => !!c.value);
    const image_url = hit?.value || null;
    const meta_used = hit?.key || null;
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractMeta(html, "description");
    if (!image_url) return { image_url: null, title, error: "Nenhuma meta de imagem encontrada (og:image, twitter:image, etc.)", meta_used: null };
    return { image_url, title, error: null, meta_used };
  } catch (e) {
    return { image_url: null, title: null, error: `Erro de rede: ${e instanceof Error ? e.message : String(e)}`, meta_used: null };
  }
}

async function logAttempt(supabase: any, post_id: string, source: string, meta: { image_url: string | null; title: string | null; error: string | null; meta_used: string | null }) {
  try {
    await supabase.from("instagram_post_attempts").insert({
      post_id,
      source,
      status: meta.image_url ? "success" : "failed",
      image_url: meta.image_url,
      title: meta.title,
      error_message: meta.error,
      meta_used: meta.meta_used,
    });
  } catch (_) { /* não bloqueia fluxo */ }
}

async function tryProfile(username: string): Promise<{ ok: boolean; posts: { shortcode: string; permalink: string }[]; error?: string }> {
  const u = username.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(u)) return { ok: false, posts: [], error: "Username inválido" };
  try {
    const res = await fetch(`https://www.instagram.com/${u}/`, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, posts: [], error: `Instagram retornou HTTP ${res.status}` };
    const html = await res.text();
    if (/loginPage|"isLoggedIn":false/i.test(html) && !/shortcode/.test(html)) {
      return {
        ok: false,
        posts: [],
        error: "Instagram bloqueou leitura sem login (parede de login). Cole as URLs dos posts manualmente.",
      };
    }
    // Tenta extrair shortcodes do HTML embutido
    const found = new Set<string>();
    const re = /"shortcode":"([A-Za-z0-9_-]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) found.add(m[1]);
    if (found.size === 0) {
      return { ok: false, posts: [], error: "Não foi possível detectar postagens no HTML do perfil. O Instagram provavelmente bloqueou a leitura." };
    }
    const posts = Array.from(found).slice(0, 12).map((sc) => ({
      shortcode: sc,
      permalink: `https://www.instagram.com/p/${sc}/`,
    }));
    return { ok: true, posts };
  } catch (e) {
    return { ok: false, posts: [], error: `Erro de rede: ${e instanceof Error ? e.message : String(e)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Every action touches stored posts or fetches from Instagram on the store's
    // behalf: only admins (or the private scheduler credential) may call it.
    const authorization = await authorizeOperationalRequest(req.clone());
    if (authorization instanceof Response) {
      return new Response(await authorization.text(), { status: authorization.status, headers: corsHeaders });
    }
    const body = await req.json().catch(() => ({}));
    const action = body?.action || (body?.url ? "extract" : null);
    if (action === "scheduled-refresh" && authorization !== "cron") {
      return Response.json({ ok: false, error: "scheduler_only" }, { status: 403, headers: corsHeaders });
    }

    if (action === "extract") {
      const cls = classifyUrl(body.url || "");
      if (!cls.ok) {
        return Response.json(
          { ok: false, error: cls.reason, hint: "Formato esperado: https://www.instagram.com/p/SHORTCODE/" },
          { status: 400, headers: corsHeaders },
        );
      }
      const meta = await fetchPostMeta(cls.permalink!);
      if (typeof body.post_id === "string" && /^[0-9a-f-]{36}$/i.test(body.post_id)) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: post } = await supabase.from("instagram_posts").select("id").eq("id", body.post_id).maybeSingle();
        if (post) await logAttempt(supabase, post.id, body.source === "cron" ? "cron" : "manual", meta);
      }
      return Response.json(
        {
          ok: !!meta.image_url,
          image_url: meta.image_url,
          title: meta.title,
          permalink: cls.permalink,
          shortcode: cls.shortcode,
          extraction_status: meta.image_url ? "extracted" : "failed",
          extraction_error: meta.error,
          meta_used: meta.meta_used,
          timestamp: new Date().toISOString(),
        },
        { headers: corsHeaders },
      );
    }

    if (action === "profile") {
      // Server-chosen profile only: the store's own Instagram account.
      const r = await tryProfile("emporiolelecute");
      return Response.json(r, { headers: corsHeaders });
    }

    if (action === "bulk-refresh" || action === "scheduled-refresh") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const source = action === "scheduled-refresh" ? "cron" : "manual";
      const { data: posts, error } = await supabase
        .from("instagram_posts")
        .select("id, post_url, alt_text, shortcode")
        .not("post_url", "is", null);
      if (error) throw error;

      const results: any[] = [];
      for (const p of posts || []) {
        const cls = classifyUrl(p.post_url || "");
        if (!cls.ok) {
          await logAttempt(supabase, p.id, source, { image_url: null, title: null, error: cls.reason || "URL inválida", meta_used: null });
          results.push({ id: p.id, ok: false, error: cls.reason });
          continue;
        }
        const meta = await fetchPostMeta(cls.permalink!);
        const update: Record<string, unknown> = {
          shortcode: cls.shortcode,
          last_extracted_at: new Date().toISOString(),
          extraction_status: meta.image_url ? "extracted" : "failed",
          extraction_error: meta.error,
        };
        if (meta.image_url) update.image_url = meta.image_url;
        if (meta.title && (!p.alt_text || p.alt_text.startsWith("Empório"))) update.alt_text = meta.title.slice(0, 200);
        await supabase.from("instagram_posts").update(update).eq("id", p.id);
        await logAttempt(supabase, p.id, source, meta);
        results.push({ id: p.id, ok: !!meta.image_url, error: meta.error, meta_used: meta.meta_used });
        await new Promise((r) => setTimeout(r, 250));
      }
      const okCount = results.filter((r) => r.ok).length;
      try {
        await supabase.from("instagram_sync_history").insert({
          source,
          action: action === "scheduled-refresh" ? "scheduled-refresh" : "bulk-refresh",
          status: results.length === 0 ? "success" : (okCount > 0 ? "success" : "failed"),
          synced_count: okCount,
          selected_count: results.length,
          details: { results: results.slice(0, 50) },
        });
      } catch (_) { /* ignore */ }
      return Response.json(
        { ok: true, total: results.length, refreshed: okCount, failed: results.length - okCount, results },
        { headers: corsHeaders },
      );
    }

    return Response.json(
      { ok: false, error: "action inválida. Use extract | profile | bulk-refresh" },
      { status: 400, headers: corsHeaders },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
