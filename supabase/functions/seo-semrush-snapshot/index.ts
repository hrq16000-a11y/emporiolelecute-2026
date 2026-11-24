import { authorizeOperationalRequest } from '../_shared/operational-auth.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Semrush exports use TSV. Each call costs API units.
// Endpoints used:
//  - domain_ranks: Authority Score, organic keywords/traffic/cost
//  - backlinks_overview: backlinks total + referring domains
const SEMRUSH = 'https://api.semrush.com/'
const ANALYTICS = 'https://api.semrush.com/analytics/v1/'
const DOMAIN = 'emporiolelecute.com.br'
const DATABASE = 'br'

function parseTsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(';')
  return lines.slice(1).map((l) => {
    const cols = l.split(';')
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return obj
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authorization = await authorizeOperationalRequest(req);
  if (authorization instanceof Response) return authorization;


  const KEY = Deno.env.get('SEMRUSH_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!KEY) {
    return new Response(JSON.stringify({ error: 'SEMRUSH_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Domain ranks (organic overview)
    const ranksUrl = `${SEMRUSH}?type=domain_ranks&key=${KEY}&domain=${DOMAIN}&database=${DATABASE}&export_columns=Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac`
    const ranksResp = await fetch(ranksUrl)
    const ranksTxt = await ranksResp.text()
    const ranks = parseTsv(ranksTxt)[0] ?? {}

    // 2. Backlinks overview
    const blUrl = `${ANALYTICS}?type=backlinks_overview&key=${KEY}&target=${DOMAIN}&target_type=root_domain&export_columns=ascore,total,domains_num`
    const blResp = await fetch(blUrl)
    const blTxt = await blResp.text()
    const bl = parseTsv(blTxt)[0] ?? {}

    // 3. Top organic keywords (limit 10)
    const kwUrl = `${SEMRUSH}?type=domain_organic&key=${KEY}&domain=${DOMAIN}&database=${DATABASE}&display_limit=10&export_columns=Ph,Po,Nq,Cp,Co,Tr`
    const kwResp = await fetch(kwUrl)
    const kwTxt = await kwResp.text()
    const top = parseTsv(kwTxt)

    const snapshot = {
      source: 'semrush',
      domain: DOMAIN,
      organic_keywords: parseInt(ranks.Or ?? '0') || null,
      organic_traffic: parseInt(ranks.Ot ?? '0') || null,
      organic_cost: parseFloat(ranks.Oc ?? '0') || null,
      authority_score: parseInt(bl.ascore ?? '0') || null,
      backlinks_total: parseInt(bl.total ?? '0') || null,
      referring_domains: parseInt(bl.domains_num ?? '0') || null,
      top_keywords: top,
      raw: { ranks, backlinks: bl },
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data, error } = await supabase.from('seo_snapshots').insert(snapshot).select().single()
    if (error) throw error

    return new Response(JSON.stringify({ ok: true, snapshot: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
