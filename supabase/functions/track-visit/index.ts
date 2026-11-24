// Optional browser analytics; every mutation requires the browser capability.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { ownsVisitorId } from '../_shared/visitor-capability.ts';

interface Payload {
  visitor_id: string;
  visitor_credential?: string;
  event: "init" | "pageview" | "heartbeat" | "consent" | "lead" | "session_end";
  lead_trigger?: string;
  device?: Record<string, unknown>;
  utm?: Record<string, string | null>;
  referrer?: string;
  landing_path?: string;
  path?: string;
  title?: string;
  product_slug?: string;
  from_path?: string;
  cta_id?: string;
  event_type?: string;
  session_id?: string;
  pageview_id?: string;
  delta_seconds?: number;
  scroll_depth?: number;
  // legado (mantido para compatibilidade): se vier, é tratado como delta=time_on_page
  time_on_page?: number;
  accepted?: boolean;
  categories?: Record<string, boolean>;
}

// Only these client-reported device columns may ever be written to visitors.
const ALLOWED_DEVICE_FIELDS = new Set([
  "screen_w", "screen_h", "viewport_w", "viewport_h", "pixel_ratio",
  "color_depth", "touch_support", "language", "languages", "timezone",
  "device_type", "device_brand", "device_model", "os_name", "os_version",
  "browser_name", "browser_version",
]);
const pickDevice = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([k, v]) => ALLOWED_DEVICE_FIELDS.has(k) && (v === null || ["string", "number", "boolean"].includes(typeof v) || Array.isArray(v)))
      .map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 200) : v]),
  );
};
// UUID syntax is not authorization; the credential must derive this exact id.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---- Detecção de bots/scrapers ----
const BOT_REGEX = /(bot|crawl|spider|slurp|bingbot|googlebot|amazonbot|gptbot|claudebot|perplexitybot|ahrefs|semrush|mj12bot|yandexbot|baiduspider|facebookexternalhit|twitterbot|whatsapp|telegram|headlesschrome|phantomjs|puppeteer|playwright|duckduckbot|applebot|petalbot|seznambot|chrome-lighthouse)/i;

function detectBot(ua: string): { isBot: boolean; name: string | null } {
  if (!ua) return { isBot: false, name: null };
  const m = ua.match(BOT_REGEX);
  if (!m) return { isBot: false, name: null };
  // Tenta extrair nome amigável: "Googlebot", "AmazonBot", "GPTBot", "Bingbot/2.0"...
  const named = ua.match(/([A-Za-z0-9_\-]+(?:bot|crawler|spider))/i);
  return { isBot: true, name: (named?.[1] || m[1] || "bot").toLowerCase() };
}

function getClientIP(req: Request): string | null {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip");
}

async function lookupIPGeo(ip: string | null): Promise<Record<string, unknown>> {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) return {};
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,timezone,isp,as`);
    const j = await r.json();
    if (j.status !== "success") return {};
    return {
      ip_country: j.country,
      ip_region: j.regionName,
      ip_city: j.city,
      ip_lat: j.lat,
      ip_lon: j.lon,
      ip_timezone: j.timezone,
      ip_isp: j.isp,
      ip_asn: j.as,
    };
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body?.visitor_id || typeof body.visitor_id !== "string" || !UUID_RE.test(body.visitor_id)) {
    return new Response(JSON.stringify({ error: "invalid_visitor_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!await ownsVisitorId(body.visitor_id, body.visitor_credential)) {
    return new Response(JSON.stringify({ error: 'visitor_authorization_required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!["init", "pageview", "heartbeat", "consent", "lead", "session_end"].includes(body.event)) {
    return new Response(JSON.stringify({ error: 'invalid_event' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ip = getClientIP(req);
  const ua = req.headers.get("user-agent") || "";
  const bot = detectBot(ua);

  try {
    // ---- Upsert do visitante (sempre, mesmo bot) ----
    const { data: existing } = await supabase
      .from("visitors")
      .select("visitor_id, is_bot, total_pageviews, user_agent")
      .eq("visitor_id", body.visitor_id)
      .maybeSingle();

    if (!existing) {
      const geo = bot.isBot ? {} : await lookupIPGeo(ip);
      const device = pickDevice(body.device);
      await supabase.from("visitors").insert({
        visitor_id: body.visitor_id,
        ip,
        user_agent: ua,
        is_bot: bot.isBot,
        bot_name: bot.name,
        lead_status: bot.isBot ? "bot" : "visitor",
        ...geo,
        ...device,
        first_referrer: body.referrer || null,
        first_landing_path: body.landing_path || body.path || null,
        utm_source: body.utm?.utm_source || null,
        utm_medium: body.utm?.utm_medium || null,
        utm_campaign: body.utm?.utm_campaign || null,
        utm_term: body.utm?.utm_term || null,
        utm_content: body.utm?.utm_content || null,
      });
    } else {
      // Auto-heal: reenviar device popula campos faltantes; last_seen sempre atualiza
      const device = pickDevice(body.device);
      const patch: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        ip,
        ...device,
      };
      if (existing.is_bot !== bot.isBot && bot.isBot) {
        patch.is_bot = true;
        patch.bot_name = bot.name;
        patch.lead_status = "bot";
      }
      await supabase.from("visitors").update(patch).eq("visitor_id", body.visitor_id);
    }

    // ---- BOT: registra consentimento (raro) mas ignora pageviews/heartbeats ----
    if (bot.isBot) {
      if (body.event === "consent") {
        await supabase.from("cookie_consents").insert({
          visitor_id: body.visitor_id,
          accepted: !!body.accepted,
          categories: body.categories || {},
          ip, user_agent: ua,
        });
      }
      return new Response(JSON.stringify({ ok: true, is_bot: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- CONSENT (humanos): apenas registra; NÃO bloqueia captura subsequente ----
    if (body.event === "consent") {
      await supabase.from("cookie_consents").insert({
        visitor_id: body.visitor_id,
        accepted: !!body.accepted,
        categories: body.categories || {},
        ip, user_agent: ua,
      });
      await supabase.from("visitors").update({
        consent_status: body.accepted ? "accepted" : "rejected",
        consent_at: new Date().toISOString(),
      }).eq("visitor_id", body.visitor_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- LEAD (server-side only; identity/contact fields are never accepted here) ----
    if (body.event === "lead") {
      const trigger = String(body.lead_trigger || "").replace(/[^a-z0-9_:-]/gi, "").slice(0, 60) || "unknown";
      const { error: leadErr } = await supabase.rpc("mark_visitor_as_lead", {
        _visitor_id: body.visitor_id,
        _trigger: trigger,
      });
      if (leadErr) console.error("mark_visitor_as_lead rpc error", leadErr.code);
    }

    // ---- PAGEVIEW (RPC atômica: insere com step_index e incrementa total) ----
    let pageviewId: string | null = null;
    if (body.event === "pageview" && body.path) {
      const { data: pvId, error: rpcErr } = await supabase.rpc("track_pageview", {
        _visitor_id: body.visitor_id,
        _session_id: body.session_id || null,
        _path: body.path,
        _title: body.title || null,
        _product_slug: body.product_slug || null,
        _referrer: body.referrer || null,
        _from_path: body.from_path || null,
        _cta_id: body.cta_id || null,
        _event_type: body.event_type || "pageview",
      });
      if (rpcErr) console.error("track_pageview rpc error", rpcErr);
      else pageviewId = pvId as unknown as string;
    }

    // ---- HEARTBEAT (RPC atômica: SOMA delta em pageview e em visitors.total_time_seconds) ----
    if (body.event === "heartbeat") {
      const delta = Math.max(0, Math.min(
        (body.delta_seconds ?? body.time_on_page ?? 0) | 0,
        3600,
      ));
      if (delta > 0) {
        const { error: hbErr } = await supabase.rpc("track_heartbeat", {
          _visitor_id: body.visitor_id,
          // Never accept a foreign pageview id; the RPC resolves this owner's latest.
          _pageview_id: null,
          _delta_seconds: delta,
          _scroll_depth: typeof body.scroll_depth === "number" ? body.scroll_depth | 0 : null,
        });
        if (hbErr) console.error("track_heartbeat rpc error", hbErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, pageview_id: pageviewId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-visit error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
