// Notification preferences require a confirmed matching account before order lookup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^[A-Z0-9]{4,20}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = String(body.action || "");

  if (action === "config") {
    return json({ vapid_public_key: Deno.env.get("VAPID_PUBLIC_KEY") || null });
  }

  const backendUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!backendUrl || !serviceKey) return json({ error: "service_unavailable" }, 503);
  const admin = createClient(backendUrl, serviceKey);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "sign_in_required" }, 401);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const authUser = authData?.user;
  if (authError || !authUser?.email_confirmed_at || !authUser.email) {
    return json({ error: "sign_in_required" }, 401);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const orderCode = String(body.order_code || "").trim().toUpperCase();

  if (authUser.email.trim().toLowerCase() !== email) return json({ error: "not_authorized" }, 403);

  if (!EMAIL_RE.test(email) || email.length > 160) return json({ error: "invalid_email" }, 400);
  if (!CODE_RE.test(orderCode)) return json({ error: "invalid_order_code" }, 400);

  // Query only the confirmed caller's own orders; failures never distinguish third-party orders.
  const { data: order } = await admin
    .from("orders")
    .select("id, order_code, customer_email")
    .eq("order_code", orderCode)
    .ilike("customer_email", email.replace(/[%_\\]/g, match => `\\${match}`))
    .maybeSingle();

  if (!order || String(order.customer_email || "").trim().toLowerCase() !== email) {
    return json({ error: "not_authorized" }, 403);
  }

  const loadState = async () => {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, push_enabled, updated_at")
      .eq("email", email)
      .maybeSingle();
    const { count } = await admin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    return {
      email_enabled: prefs?.email_enabled ?? true,
      push_enabled: prefs?.push_enabled ?? false,
      devices: count ?? 0,
      updated_at: prefs?.updated_at ?? null,
    };
  };

  try {
    if (action === "get") return json(await loadState());

    if (action === "save") {
      const emailEnabled = body.email_enabled !== false;
      const pushEnabled = body.push_enabled === true;
      const { error } = await admin
        .from("notification_preferences")
        .upsert({ email: email, email_enabled: emailEnabled, push_enabled: pushEnabled }, { onConflict: "email" });
      if (error) throw error;
      if (!pushEnabled) {
        await admin.from("push_subscriptions").delete().eq("email", email);
      }
      return json(await loadState());
    }

    if (action === "subscribe") {
      const sub = body.subscription as
        | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
        | undefined;
      const endpoint = String(sub?.endpoint || "");
      const p256dh = String(sub?.keys?.p256dh || "");
      const auth = String(sub?.keys?.auth || "");
      if (!/^https:\/\//.test(endpoint) || endpoint.length > 800 || !p256dh || !auth) {
        return json({ error: "invalid_subscription" }, 400);
      }
      // Insert only if unclaimed; conflicting endpoints never transfer email ownership.
      const { error: insertError } = await admin.from("push_subscriptions").upsert(
        {
          email,
          endpoint,
          p256dh,
          auth,
          user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
        },
        { onConflict: "endpoint", ignoreDuplicates: true },
      );
      if (insertError) throw insertError;
      // Owner-scoped update remains safe even if another request claimed the endpoint first.
      const { data: owned, error } = await admin.from("push_subscriptions")
        .update({ p256dh, auth, user_agent: (req.headers.get("user-agent") || "").slice(0, 300) })
        .eq("endpoint", endpoint).eq("email", email).select("id").maybeSingle();
      if (error) throw error;
      if (!owned) return json({ error: "not_authorized" }, 403);
      await admin
        .from("notification_preferences")
        .upsert({ email, push_enabled: true }, { onConflict: "email" });
      return json(await loadState());
    }

    if (action === "unsubscribe") {
      const endpoint = String(body.endpoint || "");
      if (endpoint) {
        await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("email", email);
      } else {
        await admin.from("push_subscriptions").delete().eq("email", email);
      }
      await admin
        .from("notification_preferences")
        .upsert({ email, push_enabled: false }, { onConflict: "email" });
      return json(await loadState());
    }

    return json({ error: "unknown_action" }, 400);
  } catch {
    console.error("[notification-prefs] operation failed");
    return json({ error: "internal_error" }, 500);
  }
});
