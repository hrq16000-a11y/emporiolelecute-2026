// Verifica a flag store_settings.sitemap_dirty e, se positivo,
// chama submit-sitemap e limpa a flag. Roda via pg_cron a cada 15 min
// para fazer debounce de várias edições no admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: dirtyRow } = await supabase
      .from('store_settings').select('value, updated_at')
      .eq('key', 'sitemap_dirty').maybeSingle()

    const dirty = (dirtyRow?.value as { dirty?: boolean } | null)?.dirty === true
    let force = false
    if (req.method === 'POST') {
      try { const b = await req.json(); force = b?.force === true } catch { /* ignore */ }
    }

    if (!dirty && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: 'sitemap not dirty' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Debounce: só reenvia se passaram pelo menos 5 min desde o último submit
    const { data: lastSub } = await supabase
      .from('store_settings').select('value')
      .eq('key', 'last_sitemap_submission').maybeSingle()
    const lastTs = (lastSub?.value as { submitted_at?: string } | null)?.submitted_at
    if (!force && lastTs) {
      const diffMin = (Date.now() - new Date(lastTs).getTime()) / 60000
      if (diffMin < 5) {
        return new Response(JSON.stringify({ skipped: true, reason: `last submit ${Math.round(diffMin)}min ago` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Chama submit-sitemap
    const r = await fetch(`${supabaseUrl}/functions/v1/submit-sitemap`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'auto-resubmit' }),
    })
    const result = await r.json().catch(() => ({}))

    // Ping IndexNow (Bing/Yandex) com as URLs do sitemap — complementa o GSC.
    const INDEXNOW_KEY = '87296b506db34e8cb22cc31288f33f84'
    const ORIGIN = 'https://emporiolelecute.com.br'
    const indexnow = { sent: false, urls: 0, status: 0, error: null as string | null }
    try {
      const sm = await fetch(`${ORIGIN}/sitemap.xml`)
      const xml = await sm.text()
      const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => m[1])
        .filter((u) => u.startsWith(ORIGIN))
        .slice(0, 10000)
      if (urlList.length) {
        const ping = await fetch('https://api.indexnow.org/IndexNow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            host: 'emporiolelecute.com.br',
            key: INDEXNOW_KEY,
            keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`,
            urlList,
          }),
        })
        indexnow.status = ping.status
        indexnow.urls = urlList.length
        indexnow.sent = ping.ok || ping.status === 202
        if (!indexnow.sent) indexnow.error = await ping.text()
      }
    } catch (e) {
      indexnow.error = e instanceof Error ? e.message : String(e)
    }

    await supabase.from('store_settings').upsert({
      key: 'last_indexnow_ping',
      value: { ...indexnow, pinged_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

    await supabase.from('seo_submission_log').insert({
      channel: 'indexnow',
      status: indexnow.sent ? `success (${indexnow.status})` : `failed (${indexnow.status || 0})`,
      ok: indexnow.sent,
      url_count: indexnow.urls,
      target: 'emporiolelecute.com.br',
      detail: {
        key_location: `${ORIGIN}/${INDEXNOW_KEY}.txt`,
        error: indexnow.error ? String(indexnow.error).slice(0, 500) : null,
        triggered_by: force ? 'manual' : 'cron',
      },
    })


    if (r.ok) {
      // Limpa a flag
      await supabase.from('store_settings').upsert({
        key: 'sitemap_dirty',
        value: { dirty: false, cleared_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
    }

    return new Response(JSON.stringify({ resubmitted: r.ok, status: r.status, result, indexnow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('seo-sitemap-auto-resubmit error', error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
