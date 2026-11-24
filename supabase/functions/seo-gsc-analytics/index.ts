import { authorizeOperationalRequest } from '../_shared/operational-auth.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console'
const SITE_URL = 'sc-domain:emporiolelecute.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authorization = await authorizeOperationalRequest(req);
  if (authorization instanceof Response) return authorization;


  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const GSC_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY')
  if (!LOVABLE_API_KEY || !GSC_KEY) {
    return new Response(JSON.stringify({ error: 'Missing GSC connector credentials' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    let days = parseInt(url.searchParams.get('days') ?? '0')
    let dim = url.searchParams.get('dim') as 'query' | 'page' | 'date' | null
    if (req.method === 'POST') {
      try { const b = await req.json(); days = b.days ?? days; dim = b.dim ?? dim } catch { /* ignore */ }
    }
    days = Math.min(days || 28, 90)
    dim = (dim ?? 'query') as 'query' | 'page' | 'date'
    const end = new Date()
    const start = new Date(end); start.setDate(start.getDate() - days)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    const body = {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: [dim],
      rowLimit: 50,
      dataState: 'all',
    }
    const r = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GSC_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await r.json()
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'GSC error', status: r.status, details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = (data.rows ?? []) as Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>
    const totals = rows.reduce(
      (acc, r) => ({
        clicks: acc.clicks + (r.clicks ?? 0),
        impressions: acc.impressions + (r.impressions ?? 0),
        position: acc.position + (r.position ?? 0),
      }),
      { clicks: 0, impressions: 0, position: 0 }
    )
    const avgPosition = rows.length ? +(totals.position / rows.length).toFixed(2) : null

    return new Response(JSON.stringify({
      period: { start: fmt(start), end: fmt(end), days },
      dimension: dim,
      totals: { ...totals, avg_position: avgPosition, row_count: rows.length },
      rows,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
