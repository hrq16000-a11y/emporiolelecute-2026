// telemetry-alert-monitor
// Runs every 15 min via pg_cron. Detects error spikes in stale_bundle_logs
// (excluding [web-vital] entries) over the last 15-minute window. If the count
// exceeds THRESHOLD and we haven't alerted within COOLDOWN_MINUTES, sends a
// batched e-mail to all admins via Resend (Lovable connector gateway).

import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeOperationalRequest } from "../_shared/operational-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Empório LeleCute <onboarding@resend.dev>";
const WINDOW_MINUTES = 15;
const THRESHOLD = 10; // errors per window
const COOLDOWN_MINUTES = 60;
const MAX_SAMPLES = 5;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Scheduler (private worker credential) or a verified admin only.
  const authorization = await authorizeOperationalRequest(req);
  if (authorization instanceof Response) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: authorization.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  // Count errors (exclude web-vitals which are perf samples, not errors)
  const { data: rows, error: qErr } = await admin
    .from("stale_bundle_logs")
    .select("id, occurred_at, route, message")
    .gte("occurred_at", since)
    .not("message", "ilike", "%[web-vital]%")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const count = rows?.length ?? 0;
  const result: Record<string, unknown> = { window_minutes: WINDOW_MINUTES, count, threshold: THRESHOLD };

  if (count < THRESHOLD) {
    await admin
      .from("telemetry_alert_state")
      .update({ last_count: count, updated_at: new Date().toISOString() })
      .eq("id", "error_spike");
    return new Response(JSON.stringify({ ...result, action: "below_threshold" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Cooldown check
  const { data: state } = await admin
    .from("telemetry_alert_state")
    .select("last_alert_at")
    .eq("id", "error_spike")
    .maybeSingle();

  if (state?.last_alert_at) {
    const ageMin = (Date.now() - new Date(state.last_alert_at).getTime()) / 60_000;
    if (ageMin < COOLDOWN_MINUTES) {
      return new Response(JSON.stringify({ ...result, action: "cooldown", cooldown_remaining_min: Math.ceil(COOLDOWN_MINUTES - ageMin) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return new Response(JSON.stringify({ ...result, action: "skipped_no_resend" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get admin recipients via auth.admin (service role)
  let recipients: string[] = [];
  try {
    const { data: roleRows } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (roleRows ?? []).map((r: { user_id: string }) => r.user_id);
    for (const uid of ids) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) recipients.push(u.user.email);
    }
  } catch (_) { /* fall through */ }

  if (recipients.length === 0) {
    recipients = ["emporiolelecute@gmail.com"];
  }

  // Build sample list (top distinct messages)
  const samples = (rows ?? []).slice(0, MAX_SAMPLES);
  const sampleHtml = samples
    .map(
      (r) => `<li><code style="font-size:12px">${escapeHtml((r.message ?? "").slice(0, 200))}</code>
        <div style="color:#666;font-size:11px">${escapeHtml(r.route ?? "")} — ${escapeHtml(r.occurred_at ?? "")}</div></li>`,
    )
    .join("");

  const reviewUrl = "https://emporiolelecute.com.br/admin/telemetria";
  const subject = `[ALERTA] Pico de erros na loja: ${count} eventos em ${WINDOW_MINUTES} min`;
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">Pico de erros detectado</h2>
      <p style="margin:0 0 8px">Foram registrados <strong>${count} erros</strong> nos últimos ${WINDOW_MINUTES} minutos (limite: ${THRESHOLD}).</p>
      <p style="margin:16px 0 6px;font-weight:600">Amostras recentes:</p>
      <ul style="margin:0 0 16px 18px;padding:0">${sampleHtml || "<li>—</li>"}</ul>
      <p style="margin:20px 0">
        <a href="${reviewUrl}" style="background:#e85d3a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">
          Abrir Telemetria
        </a>
      </p>
      <p style="font-size:12px;color:#666;margin-top:24px">Próximo alerta apenas após ${COOLDOWN_MINUTES} min de cooldown.</p>
    </div>
  `;

  const batch = recipients.map((to) => ({ from: FROM_ADDRESS, to: [to], subject, html }));
  const sendRes = await fetch(`${RESEND_GATEWAY}/emails/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(batch),
  });

  const sendOk = sendRes.ok;
  const sendBody = await sendRes.text().catch(() => "");

  if (sendOk) {
    await admin
      .from("telemetry_alert_state")
      .update({ last_alert_at: new Date().toISOString(), last_count: count, updated_at: new Date().toISOString() })
      .eq("id", "error_spike");
  }

  return new Response(
    JSON.stringify({ ...result, action: sendOk ? "alerted" : "send_failed", recipients: recipients.length, error: sendOk ? null : sendBody.slice(0, 300) }),
    { status: sendOk ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
