// Scan periódico de vulnerabilidades das dependências (pós-deploy).
//
// Consulta a base pública OSV.dev (Open Source Vulnerabilities) com a lista de
// pacotes npm do projeto (`deps.json`, gerado a partir do package.json),
// registra o resultado em `security_scan_runs` e alerta o time por e-mail
// (Resend) em caso de achado crítico/alto ou regressão frente à última run.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { isLocalEnv, mockIntegration } from '../_shared/localEnv.ts';
import deps from './deps.json' with { type: 'json' };
import { hasHighRegression } from '../_shared/security-regression.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

type Severity = 'critical' | 'high' | 'moderate' | 'low';

interface Finding {
  package: string;
  version: string;
  id: string;
  summary: string;
  severity: Severity;
  url: string;
}

const cleanVersion = (raw: string) => raw.replace(/^[\^~>=<\s]*/, '').split(' ')[0];

/** Deriva severidade do CVSS v3 informado pelo OSV; fallback por palavra-chave. */
const severityOf = (vuln: Record<string, unknown>): Severity => {
  const sev = (vuln.severity as Array<{ type?: string; score?: string }> | undefined) ?? [];
  const cvss = sev.find((s) => (s.type ?? '').startsWith('CVSS'))?.score ?? '';
  const match = /\/AV:/.test(cvss) ? null : Number(cvss);
  if (match !== null && Number.isFinite(match)) {
    if (match >= 9) return 'critical';
    if (match >= 7) return 'high';
    if (match >= 4) return 'moderate';
    return 'low';
  }
  const db = (vuln.database_specific as { severity?: string } | undefined)?.severity ?? '';
  const norm = db.toLowerCase();
  if (norm.includes('critical')) return 'critical';
  if (norm.includes('high')) return 'high';
  if (norm.includes('moderate') || norm.includes('medium')) return 'moderate';
  return 'low';
};

async function queryOsv(packages: Array<[string, string]>): Promise<Finding[]> {
  const queries = packages.map(([name, version]) => ({
    package: { name, ecosystem: 'npm' },
    version,
  }));

  const res = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
  if (!res.ok) throw new Error(`OSV respondeu ${res.status}`);
  const body = (await res.json()) as { results?: Array<{ vulns?: Array<{ id: string }> }> };

  const ids = new Set<string>();
  const byId = new Map<string, { name: string; version: string }>();
  (body.results ?? []).forEach((result, i) => {
    for (const v of result.vulns ?? []) {
      ids.add(v.id);
      if (!byId.has(v.id)) byId.set(v.id, { name: packages[i][0], version: packages[i][1] });
    }
  });

  // Detalha cada vulnerabilidade para obter severidade e resumo.
  const findings: Finding[] = [];
  for (const id of [...ids].slice(0, 60)) {
    try {
      const detail = await fetch(`https://api.osv.dev/v1/vulns/${id}`);
      const vuln = detail.ok ? await detail.json() : {};
      const pkg = byId.get(id)!;
      findings.push({
        package: pkg.name,
        version: pkg.version,
        id,
        summary: String(vuln.summary ?? vuln.details ?? 'Sem descrição').slice(0, 400),
        severity: severityOf(vuln),
        url: `https://osv.dev/vulnerability/${id}`,
      });
    } catch {
      /* detalhe é best-effort */
    }
  }
  return findings;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const trigger = body.trigger === 'manual' ? 'manual' : 'cron';
  const packages = Object.entries(deps as Record<string, string>)
    .map(([name, range]) => [name, cleanVersion(range)] as [string, string])
    .filter(([, v]) => /^\d/.test(v));

  try {
    const findings = await queryOsv(packages);
    const count = (s: Severity) => findings.filter((f) => f.severity === s).length;

    const { data: last } = await admin
      .from('security_scan_runs')
      .select('total_findings, critical_count, high_count, findings')
      .eq('status', 'ok')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const critical = count('critical');
    const high = count('high');
    const highRegression = hasHighRegression(findings, last ? last.findings as Finding[] : null);
    const regression =
      !!last &&
      (highRegression || critical > (last.critical_count ?? 0) ||
        high > (last.high_count ?? 0) ||
        findings.length > (last.total_findings ?? 0));

    let alert = { sent: false, reason: 'sem motivo para alertar' };
    const { data: policy } = await admin.from('operational_settings').select('*').maybeSingle();
    const wantsAlert = (policy?.alert_high !== false && (critical > 0 || high > 0)) || (policy?.alert_regressions !== false && regression);
    if (wantsAlert && policy?.email_enabled) alert = { sent: false, reason: 'Domínio remetente não configurado; envio pendente' };
    if (wantsAlert && policy?.slack_enabled) alert.reason += '; Slack não conectado';

    const { data: run, error } = await admin
      .from('security_scan_runs')
      .insert({
        source: 'osv',
        trigger,
        status: 'ok',
        packages_scanned: packages.length,
        total_findings: findings.length,
        critical_count: critical,
        high_count: high,
        moderate_count: count('moderate'),
        low_count: count('low'),
        regression,
        high_regression: highRegression,
        alert_sent: alert.sent,
        alert_reason: alert.reason,
        findings,
      })
      .select('id')
      .single();
    if (error) throw error;

    return new Response(
      JSON.stringify({ run_id: run.id, findings: findings.length, critical, high, regression, alert }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'erro desconhecido';
    const { data: policy } = await admin.from('operational_settings').select('*').maybeSingle();
    await admin.from('security_scan_runs').insert({
      source: 'osv', trigger, status: 'error', packages_scanned: packages.length, error: message,
      alert_reason: policy?.alert_failures ? 'Falha registrada; entrega externa pendente de configuração' : 'Alerta de falhas desativado',
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
