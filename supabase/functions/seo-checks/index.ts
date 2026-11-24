import { authorizeOperationalRequest } from '../_shared/operational-auth.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGIN = 'https://emporiolelecute.com.br'
const ROBOTS_UPSTREAM = `${Deno.env.get('SUPABASE_URL')}/functions/v1/robots-txt`

interface Check { name: string; ok: boolean; detail: string; severity: 'info'|'warn'|'error' }

const normalize = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n')

function buildDiff(a: string, b: string): string {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const out: string[] = []
  const max = Math.max(aLines.length, bLines.length)
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      if (aLines[i] !== undefined) out.push(`- ${aLines[i]}`)
      if (bLines[i] !== undefined) out.push(`+ ${bLines[i]}`)
    }
  }
  return out.slice(0, 30).join(' | ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authorization = await authorizeOperationalRequest(req);
  if (authorization instanceof Response) return authorization;


  let source = 'manual'
  let test = false
  try {
    const body = await req.json()
    if (body?.source) source = String(body.source)
    if (body?.test) test = true
  } catch { /* no body */ }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // --- TEST MODE: dispara um alerta sintético para validar canais sem persistir nem rodar checks ---
  if (test) {
    const { data: cfg } = await supabase.from('store_settings').select('value').eq('key', 'seo_alerts_config').maybeSingle()
    const config = (cfg?.value ?? {}) as { email?: string; webhook_url?: string; enabled?: boolean; severities?: string[] }
    const ran_at = new Date().toISOString()
    const fake = [{ name: 'test_alert', ok: false, severity: 'error', detail: 'Disparo manual de teste a partir do Admin SEO Dashboard.' }]
    const result = { email_sent: false, webhook_sent: false, error: null as string | null }
    try {
      const RESEND = Deno.env.get('RESEND_API_KEY')
      if (config.email && RESEND) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
          body: JSON.stringify({
            from: 'SEO Alerts <onboarding@resend.dev>',
            to: [config.email],
            subject: '[TESTE] Alerta SEO — disparo manual',
            html: `<h2>✅ Teste de alerta</h2><p>Se você recebeu, a configuração de e-mail está funcionando.</p><p>Run: ${ran_at}</p>`,
          }),
        })
        if (!r.ok) result.error = `Resend: ${r.status} ${await r.text()}`
        else result.email_sent = true
      }
      if (config.webhook_url) {
        const r = await fetch(config.webhook_url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, ran_at, summary: { errors: 1, warnings: 0 }, failed_checks: fake }),
        })
        if (!r.ok) result.error = (result.error ?? '') + ` Webhook: ${r.status}`
        else result.webhook_sent = true
      }
    } catch (e) { result.error = String(e instanceof Error ? e.message : e) }
    return new Response(JSON.stringify({ test: true, ...result, ran_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const checks: Check[] = []

  // 1. Sitemap
  try {
    const r = await fetch(`${ORIGIN}/sitemap.xml`)
    const txt = await r.text()
    const ok = r.ok && txt.includes('<urlset')
    checks.push({ name: 'sitemap_reachable', ok, severity: ok ? 'info' : 'error',
      detail: ok ? `HTTP ${r.status}, ${txt.length} bytes` : `HTTP ${r.status}` })
    const urls = [...txt.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    const offDomain = urls.filter(u => !u.startsWith(ORIGIN))
    const supabaseLeak = urls.filter(u => /supabase|lovable\.app/.test(u))
    checks.push({ name: 'sitemap_canonical_domain', ok: offDomain.length === 0,
      severity: offDomain.length === 0 ? 'info' : 'error',
      detail: `${urls.length} URLs total, ${offDomain.length} fora do domínio` })
    checks.push({ name: 'sitemap_no_internal_leaks', ok: supabaseLeak.length === 0,
      severity: supabaseLeak.length === 0 ? 'info' : 'error',
      detail: supabaseLeak.length ? `Encontrado: ${supabaseLeak.slice(0,3).join(', ')}` : 'Nenhum link Supabase/Lovable' })
  } catch (e) {
    checks.push({ name: 'sitemap_reachable', ok: false, severity: 'error', detail: String(e) })
  }

  // 2. robots.txt (público)
  let publicRobots = ''
  try {
    const r = await fetch(`${ORIGIN}/robots.txt`)
    publicRobots = await r.text()
    checks.push({ name: 'robots_reachable', ok: r.ok, severity: r.ok ? 'info' : 'error', detail: `HTTP ${r.status} · x-robots-source=${r.headers.get('x-robots-source') ?? '—'}` })
    const hasSitemap = /Sitemap:\s*https?:\/\//i.test(publicRobots)
    checks.push({ name: 'robots_has_sitemap', ok: hasSitemap, severity: hasSitemap ? 'info' : 'warn',
      detail: hasSitemap ? 'Diretiva Sitemap: presente' : 'Falta diretiva Sitemap:' })
  } catch (e) {
    checks.push({ name: 'robots_reachable', ok: false, severity: 'error', detail: String(e) })
  }

  // 2b. robots.txt: público vs origem (Worker proxy)
  try {
    const r = await fetch(ROBOTS_UPSTREAM)
    const upstream = await r.text()
    const a = normalize(publicRobots)
    const b = normalize(upstream)
    const matches = a === b
    checks.push({
      name: 'robots_matches_origin',
      ok: matches,
      severity: matches ? 'info' : 'warn',
      detail: matches ? 'Worker está sincronizado com a origem' : `Diff: ${buildDiff(a, b)}`,
    })
  } catch (e) {
    checks.push({ name: 'robots_matches_origin', ok: false, severity: 'warn', detail: String(e) })
  }

  // 3. Canonical da home
  try {
    const r = await fetch(`${ORIGIN}/`)
    const html = await r.text()
    const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    const canonical = m?.[1] ?? ''
    const ok = canonical.startsWith(ORIGIN)
    checks.push({ name: 'home_canonical', ok, severity: ok ? 'info' : 'error', detail: canonical || 'Não encontrado' })
  } catch (e) {
    checks.push({ name: 'home_canonical', ok: false, severity: 'error', detail: String(e) })
  }

  // 4. Redirects
  try {
    const { data } = await supabase.from('redirects').select('from_path,to_path,is_active').eq('is_active', true)
    const cycles = (data ?? []).filter(r => r.from_path === r.to_path)
    checks.push({ name: 'redirects_no_self_loops', ok: cycles.length === 0,
      severity: cycles.length === 0 ? 'info' : 'error',
      detail: `${data?.length ?? 0} redirects ativos, ${cycles.length} self-loops` })
  } catch (e) {
    checks.push({ name: 'redirects_no_self_loops', ok: false, severity: 'warn', detail: String(e) })
  }

  // 5. Último submit GSC
  try {
    const { data } = await supabase.from('store_settings').select('value').eq('key', 'last_sitemap_submission').maybeSingle()
    const v = data?.value as { submitted_at?: string; status?: string } | null
    const ok = v?.status === 'success'
    checks.push({ name: 'gsc_last_submission', ok: !!ok, severity: ok ? 'info' : 'warn',
      detail: v ? `${v.status} @ ${v.submitted_at}` : 'Nenhum envio registrado' })
  } catch (e) {
    checks.push({ name: 'gsc_last_submission', ok: false, severity: 'warn', detail: String(e) })
  }

  const summary = {
    total: checks.length,
    passed: checks.filter(c => c.ok).length,
    errors: checks.filter(c => !c.ok && c.severity === 'error').length,
    warnings: checks.filter(c => !c.ok && c.severity === 'warn').length,
  }
  const ran_at = new Date().toISOString()

  const { data: inserted } = await supabase.from('seo_check_runs').insert({
    source, total: summary.total, passed: summary.passed, errors: summary.errors,
    warnings: summary.warnings, checks: checks as unknown as Record<string, unknown>,
  }).select('id').single()

  // Alerts: respeitar severidades configuradas
  let alert_sent = false
  let alert_error: string | null = null
  try {
    const { data: cfg } = await supabase.from('store_settings').select('value').eq('key', 'seo_alerts_config').maybeSingle()
    const config = (cfg?.value ?? {}) as { email?: string; webhook_url?: string; enabled?: boolean; severities?: string[] }
    const sevs = config.severities && config.severities.length ? config.severities : ['error']
    const failed = checks.filter(c => !c.ok && sevs.includes(c.severity))
    if (config.enabled !== false && failed.length > 0) {
      const RESEND = Deno.env.get('RESEND_API_KEY')
      if (config.email && RESEND) {
        const html = `<h2>⚠️ Alerta SEO — ${failed.length} ocorrência(s) [${sevs.join('/')}]</h2>
          <p>Run: ${ran_at}</p>
          <ul>${failed.map(c => `<li><strong>[${c.severity}] ${c.name}</strong>: ${c.detail}</li>`).join('')}</ul>
          <p><a href="${ORIGIN}/admin/seo-dashboard">Abrir SEO Dashboard</a></p>`
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
          body: JSON.stringify({
            from: 'SEO Alerts <onboarding@resend.dev>',
            to: [config.email],
            subject: `[SEO] ${failed.length} ${failed.length === 1 ? 'ocorrência' : 'ocorrências'} em emporiolelecute.com.br`,
            html,
          }),
        })
        if (!r.ok) alert_error = `Resend: ${r.status} ${await r.text()}`
        else alert_sent = true
      }
      if (config.webhook_url) {
        const r = await fetch(config.webhook_url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ran_at, summary, severities: sevs, failed_checks: failed, dashboard: `${ORIGIN}/admin/seo-dashboard` }),
        })
        if (!r.ok) alert_error = (alert_error ?? '') + ` Webhook: ${r.status}`
        else alert_sent = true
      }
    }
  } catch (e) {
    alert_error = String(e instanceof Error ? e.message : e)
  }
  if (inserted?.id && (alert_sent || alert_error)) {
    await supabase.from('seo_check_runs').update({ alert_sent, alert_error }).eq('id', inserted.id)
  }

  return new Response(JSON.stringify({ summary, checks, ran_at, run_id: inserted?.id, alert_sent, alert_error }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
