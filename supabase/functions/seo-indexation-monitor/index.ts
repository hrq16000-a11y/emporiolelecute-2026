// Monitora indexação cruzando URLs do sitemap com a Search Analytics API
// (dimensão: page) + HTTP status check de cada URL. Salva snapshot em
// seo_url_status. Alerta por e-mail quando aparece nova URL com problema
// (404/5xx, noindex, ou ausente do GSC há 90 dias).
//
// Observação: a URL Inspection API não está disponível via gateway, então
// usamos a Search Analytics (que retorna URLs com impressões) como sinal de
// indexação e o HTTP status do servidor como sinal de saúde da página.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authorizeOperationalRequest } from '../_shared/operational-auth.ts'
import { parseIndexationRequest, safeIndexationUrl } from './policy.ts'

const GSC_GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console/webmasters/v3'

interface UrlCheck {
  url: string
  http_status: number | null
  has_noindex: boolean
  found_in_gsc: boolean
  gsc_clicks: number
  gsc_impressions: number
  error?: string
}

function deriveCoverage(c: UrlCheck): { coverage: string; verdict: string; issue: boolean } {
  if (c.error) return { coverage: 'fetch_error', verdict: 'FAIL', issue: true }
  if (c.http_status == null) return { coverage: 'unknown', verdict: 'NEUTRAL', issue: true }
  if (c.http_status >= 500) return { coverage: `server_error_${c.http_status}`, verdict: 'FAIL', issue: true }
  if (c.http_status === 404) return { coverage: 'not_found_404', verdict: 'FAIL', issue: true }
  if (c.http_status >= 400) return { coverage: `client_error_${c.http_status}`, verdict: 'FAIL', issue: true }
  if (c.http_status >= 300) return { coverage: `redirect_${c.http_status}`, verdict: 'NEUTRAL', issue: false }
  if (c.has_noindex) return { coverage: 'excluded_noindex', verdict: 'FAIL', issue: true }
  if (c.found_in_gsc) return { coverage: 'submitted_and_indexed', verdict: 'PASS', issue: false }
  return { coverage: 'discovered_not_indexed', verdict: 'NEUTRAL', issue: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authorization = await authorizeOperationalRequest(req);
    if (authorization instanceof Response) return authorization;
    let body: unknown;
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const input = parseIndexationRequest(body);
    if (!input) return new Response(JSON.stringify({ error: 'Only store HTTPS URLs and limits from 1 to 200 are allowed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const GSC_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')
    if (!GSC_KEY) throw new Error('GOOGLE_SEARCH_CONSOLE_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: seoData } = await supabase
      .from('store_settings').select('value').eq('key', 'seo_config').maybeSingle()
    const seoConfig = (seoData?.value ?? {}) as { canonical_url?: string; gsc_property?: string; sitemap_notification_email?: string }
    const configuredSite = safeIndexationUrl(seoConfig.canonical_url || 'https://emporiolelecute.com.br');
    if (!configuredSite) throw new Error('Store URL is not allowed');
    const siteUrl = new URL(configuredSite).origin
    const property = seoConfig.gsc_property || `sc-domain:${siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

    let urls: string[] = input.urls
    const limit = input.limit

    if (urls.length === 0) {
      const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'EmporioLeleCute-IndexMonitor' } })
      if (!sitemapRes.ok) throw new Error('Could not load store sitemap');
      const xml = await sitemapRes.text()
      urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
        .map(m => safeIndexationUrl(m[1].replace(/&amp;/g, '&')))
        .filter((url): url is string => url !== null)
    }

    // 1) Search Analytics: páginas com impressões nos últimos 90 dias
    const end = new Date()
    const start = new Date(end); start.setDate(start.getDate() - 90)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const gscPagesMap = new Map<string, { clicks: number; impressions: number }>()
    try {
      const r = await fetch(
        `${GSC_GATEWAY}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GSC_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: fmt(start), endDate: fmt(end),
            dimensions: ['page'], rowLimit: 25000, dataState: 'all',
          }),
        }
      )
      if (r.ok) {
        const data = await r.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number }> }
        for (const row of data.rows ?? []) {
          gscPagesMap.set(row.keys[0], { clicks: row.clicks, impressions: row.impressions })
        }
      } else {
        console.warn('GSC searchAnalytics failed', r.status, (await r.text()).slice(0, 200))
      }
    } catch (e) { console.warn('GSC searchAnalytics error', e) }

    // 2) Prioriza URLs ainda não checadas hoje
    const { data: recentRows } = await supabase
      .from('seo_url_status')
      .select('url')
      .gte('checked_at', new Date(Date.now() - 22 * 3600 * 1000).toISOString())
    const checkedToday = new Set((recentRows ?? []).map(r => r.url))
    const toInspect = urls.filter(u => !checkedToday.has(u)).slice(0, limit)

    // 3) HTTP check + noindex check em paralelo (limite de 6)
    async function check(url: string): Promise<UrlCheck> {
      try {
        const safeUrl = safeIndexationUrl(url);
        if (!safeUrl) throw new Error('Store URL is not allowed');
        const r = await fetch(safeUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmporioLeleCuteSEO/1.0)' },
        })
        let html = ''
        if (r.status === 200) {
          try { html = (await r.text()).slice(0, 8000) } catch { /* ignore */ }
        } else { try { await r.text() } catch { /* ignore */ } }
        const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
        const gsc = gscPagesMap.get(url) ?? gscPagesMap.get(url + '/') ?? { clicks: 0, impressions: 0 }
        return {
          url,
          http_status: r.status,
          has_noindex: noindex,
          found_in_gsc: gscPagesMap.has(url) || gscPagesMap.has(url + '/'),
          gsc_clicks: gsc.clicks,
          gsc_impressions: gsc.impressions,
        }
      } catch (e) {
        return {
          url, http_status: null, has_noindex: false, found_in_gsc: false,
          gsc_clicks: 0, gsc_impressions: 0,
          error: e instanceof Error ? e.message : 'fetch_failed',
        }
      }
    }

    const results: UrlCheck[] = []
    const CONCURRENCY = 6
    for (let i = 0; i < toInspect.length; i += CONCURRENCY) {
      const batch = toInspect.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.all(batch.map(check))
      results.push(...batchResults)
    }

    // 4) Persistência + detecção de novos alertas
    const newIssues: Array<{ url: string; coverage: string }> = []
    for (const r of results) {
      const { coverage, verdict, issue } = deriveCoverage(r)
      let alreadyAlerted = false
      if (issue) {
        const { data: prev } = await supabase
          .from('seo_url_status')
          .select('alerted, coverage_state')
          .eq('url', r.url)
          .gte('checked_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
          .order('checked_at', { ascending: false })
          .limit(1)
        if (prev && prev[0]?.alerted && prev[0].coverage_state === coverage) alreadyAlerted = true
      }

      const { error: insErr } = await supabase.from('seo_url_status').insert({
        url: r.url,
        coverage_state: coverage,
        indexing_state: r.found_in_gsc ? 'indexed' : 'not_indexed',
        verdict,
        last_crawl_time: null,
        page_fetch_state: r.http_status ? `HTTP_${r.http_status}` : null,
        robots_txt_state: r.has_noindex ? 'noindex' : 'allowed',
        google_canonical: null,
        user_canonical: null,
        referring_urls: null,
        raw: {
          http_status: r.http_status,
          has_noindex: r.has_noindex,
          found_in_gsc: r.found_in_gsc,
          gsc_clicks: r.gsc_clicks,
          gsc_impressions: r.gsc_impressions,
          error: r.error,
        },
        has_issue: issue,
        alerted: issue && !alreadyAlerted,
      })
      if (insErr) console.error('insert seo_url_status', insErr)
      if (issue && !alreadyAlerted) newIssues.push({ url: r.url, coverage })
    }

    // 5) Email alerta
    const notificationEmail = seoConfig.sitemap_notification_email || 'emporiolelecute@gmail.com'
    if (newIssues.length > 0) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        try {
          const list = newIssues.slice(0, 25).map(r =>
            `<li><strong>${r.coverage}</strong> — <a href="${escapeHtml(r.url)}">${escapeHtml(r.url)}</a></li>`
          ).join('')
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: 'Empório LeleCute <noreply@emporiolelecute.com.br>',
              to: [notificationEmail],
              subject: `[SEO] ${newIssues.length} URL(s) com problema de indexação`,
              html: `<div style="font-family:sans-serif;max-width:640px;margin:0 auto">
                <h2 style="color:#F87C6D">Alertas de indexação</h2>
                <p>Foram detectadas <strong>${newIssues.length}</strong> URL(s) com novos problemas:</p>
                <ul>${list}</ul>
                <p>Acesse o painel admin → SEO → Indexação para detalhes.</p>
              </div>`,
            }),
          })
        } catch (e) { console.error('alert email error', e) }
      }
    }

    return new Response(JSON.stringify({
      checked: toInspect.length,
      total_in_sitemap: urls.length,
      indexed_in_gsc: gscPagesMap.size,
      issues: results.filter(r => deriveCoverage(r).issue).length,
      new_alerts: newIssues.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('seo-indexation-monitor error', error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
