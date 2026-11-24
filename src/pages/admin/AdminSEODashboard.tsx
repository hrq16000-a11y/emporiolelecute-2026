import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ExternalLink, Download, Bell, Send, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RobotsAndSitemapPanel from '@/components/admin/RobotsAndSitemapPanel';
import SEOIndexationPanel from '@/components/admin/SEOIndexationPanel';
import { toCsv } from '@/lib/seoExport';

type CheckRun = { id: string; ran_at: string; source: string; total: number; passed: number; errors: number; warnings: number; checks: Array<{ name: string; ok: boolean; detail: string; severity: string }>; alert_sent: boolean };

function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) { toast.error('Nada para exportar'); return; }
  const csv = toCsv(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type Snapshot = {
  id: string;
  source: string;
  captured_at: string;
  organic_keywords: number | null;
  organic_traffic: number | null;
  authority_score: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  top_keywords: Array<Record<string, string>>;
};

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
type GscData = {
  totals: { clicks: number; impressions: number; avg_position: number; row_count: number };
  rows: GscRow[];
  period: { start: string; end: string; days: number };
};

type Check = { name: string; ok: boolean; detail: string; severity: 'info'|'warn'|'error' };

const fmtNum = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('pt-BR');
const fmtPos = (n: number | null | undefined) => n == null ? '—' : n.toFixed(1);

export default function AdminSEODashboard() {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [history, setHistory] = useState<Array<{ ran_at: string; status: string; entries: number | null }>>([]);
  const [lastSubmission, setLastSubmission] = useState<{ submitted_at?: string; status?: string; details?: unknown } | null>(null);
  const [gsc, setGsc] = useState<GscData | null>(null);
  const [checks, setChecks] = useState<{ summary: { total: number; passed: number; errors: number; warnings: number }; checks: Check[]; ran_at: string } | null>(null);
  const [loadingSemrush, setLoadingSemrush] = useState(false);
  const [loadingGsc, setLoadingGsc] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [runs, setRuns] = useState<CheckRun[]>([]);
  const [alertCfg, setAlertCfg] = useState<{ email: string; webhook_url: string; enabled: boolean; severities: string[] }>({ email: '', webhook_url: '', enabled: true, severities: ['error'] });
  const [savingCfg, setSavingCfg] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  // Filtros do histórico
  const [filterSource, setFilterSource] = useState<'all'|'cron'|'manual'|'cron-daily'>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const loadSnapshots = useCallback(async () => {
    const { data } = await supabase.from('seo_snapshots')
      .select('*').eq('source', 'semrush').order('captured_at', { ascending: false }).limit(20);
    setSnaps((data ?? []) as Snapshot[]);
  }, []);

  const loadHistory = useCallback(async () => {
    // Tenta carregar histórico do sitemap se a tabela existir
    try {
      const { data } = await supabase.from('sitemap_monitor_history' as never).select('*').order('ran_at', { ascending: false }).limit(15) as unknown as { data: Array<{ ran_at: string; status: string; entries: number | null }> | null };
      setHistory(data ?? []);
    } catch { setHistory([]); }
    const { data: settings } = await supabase.from('store_settings').select('value').eq('key', 'last_sitemap_submission').maybeSingle();
    setLastSubmission((settings?.value as { submitted_at?: string; status?: string; details?: unknown } | null) ?? null);
  }, []);

  useEffect(() => { loadSnapshots(); loadHistory(); }, [loadSnapshots, loadHistory]);

  const runSemrush = async () => {
    setLoadingSemrush(true);
    try {
      const { error } = await supabase.functions.invoke('seo-semrush-snapshot');
      if (error) throw error;
      toast.success('Snapshot Semrush capturado');
      await loadSnapshots();
    } catch (e) {
      toast.error('Falha no snapshot Semrush', { description: String(e instanceof Error ? e.message : e) });
    } finally { setLoadingSemrush(false); }
  };

  const loadGsc = async (days = 28, dim: 'query'|'page' = 'query') => {
    setLoadingGsc(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-gsc-analytics', { body: { days, dim } });
      if (error) throw error;
      setGsc(data as GscData);
    } catch (e) {
      toast.error('Falha ao carregar GSC', { description: String(e instanceof Error ? e.message : e) });
    } finally { setLoadingGsc(false); }
  };

  const runChecks = async () => {
    setLoadingChecks(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-checks', { body: { source: 'manual' } });
      if (error) throw error;
      setChecks(data as never);
      // refresh runs history after each manual run
      const { data: rs } = await supabase.from('seo_check_runs').select('*').order('ran_at', { ascending: false }).limit(30);
      setRuns((rs ?? []) as unknown as CheckRun[]);
    } catch (e) {
      toast.error('Falha nos checks', { description: String(e instanceof Error ? e.message : e) });
    } finally { setLoadingChecks(false); }
  };

  const loadRuns = useCallback(async () => {
    const { data } = await supabase.from('seo_check_runs').select('*').order('ran_at', { ascending: false }).limit(30);
    setRuns((data ?? []) as unknown as CheckRun[]);
  }, []);

  const loadAlertCfg = useCallback(async () => {
    const { data } = await supabase.from('store_settings').select('value').eq('key', 'seo_alerts_config').maybeSingle();
    if (data?.value) setAlertCfg({ email: '', webhook_url: '', enabled: true, severities: ['error'], ...(data.value as object) });
  }, []);

  const sendTestAlert = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-checks', { body: { test: true } });
      if (error) throw error;
      const r = data as { email_sent?: boolean; webhook_sent?: boolean; error?: string | null };
      if (r.error) toast.error('Falha no teste', { description: r.error });
      else toast.success(`Teste enviado · email: ${r.email_sent ? 'ok' : '—'} · webhook: ${r.webhook_sent ? 'ok' : '—'}`);
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
    finally { setSendingTest(false); }
  };

  const saveAlertCfg = async () => {
    setSavingCfg(true);
    try {
      const { data: existing } = await supabase.from('store_settings').select('id').eq('key', 'seo_alerts_config').maybeSingle();
      if (existing) await supabase.from('store_settings').update({ value: alertCfg }).eq('id', existing.id);
      else await supabase.from('store_settings').insert({ key: 'seo_alerts_config', value: alertCfg });
      toast.success('Configuração salva');
    } catch (e) { toast.error(String(e instanceof Error ? e.message : e)); }
    finally { setSavingCfg(false); }
  };

  useEffect(() => { loadGsc(28, 'query'); runChecks(); loadRuns(); loadAlertCfg(); }, [loadRuns, loadAlertCfg]);

  // Diff between two most recent runs
  const lastRun = runs[0];
  const prevRun = runs[1];
  const diff = lastRun && prevRun ? lastRun.checks.map(c => {
    const old = prevRun.checks.find(x => x.name === c.name);
    if (!old) return { name: c.name, change: 'novo', from: '—', to: c.detail, ok: c.ok };
    if (old.ok === c.ok && old.detail === c.detail) return null;
    return { name: c.name, change: old.ok && !c.ok ? 'regrediu' : (!old.ok && c.ok ? 'corrigido' : 'alterado'), from: old.detail, to: c.detail, ok: c.ok };
  }).filter(Boolean) as Array<{ name: string; change: string; from: string; to: string; ok: boolean }> : [];

  const exportSemrushCsv = () => downloadCSV('seo-semrush-snapshots.csv', snaps.map(s => ({
    captured_at: s.captured_at, authority: s.authority_score, backlinks: s.backlinks_total,
    referring_domains: s.referring_domains, keywords: s.organic_keywords, traffic: s.organic_traffic,
  })));
  const exportGscCsv = () => downloadCSV('seo-gsc.csv', (gsc?.rows ?? []).map(r => ({
    query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  })));
  const exportRunsCsv = () => downloadCSV('seo-check-runs.csv', runs.map(r => ({
    ran_at: r.ran_at, source: r.source, total: r.total, passed: r.passed, errors: r.errors, warnings: r.warnings, alert_sent: r.alert_sent,
  })));
  const exportPdf = () => window.print();

  const trendData = [...snaps].reverse().map(s => ({
    date: format(new Date(s.captured_at), 'dd/MM'),
    backlinks: s.backlinks_total ?? 0,
    keywords: s.organic_keywords ?? 0,
    traffic: s.organic_traffic ?? 0,
    refDomains: s.referring_domains ?? 0,
    authority: s.authority_score ?? 0,
  }));

  const last = snaps[0];
  const prev = snaps[1];
  const delta = (cur?: number | null, old?: number | null) => {
    if (cur == null || old == null || old === 0) return null;
    return ((cur - old) / old) * 100;
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard SEO</h1>
          <p className="text-sm text-muted-foreground">Monitoramento agregado: Google Search Console, Semrush e checks de saúde técnica.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={exportSemrushCsv}><Download className="h-4 w-4 mr-1"/>CSV Semrush</Button>
          <Button size="sm" variant="outline" onClick={exportGscCsv}><Download className="h-4 w-4 mr-1"/>CSV GSC</Button>
          <Button size="sm" variant="outline" onClick={exportRunsCsv}><Download className="h-4 w-4 mr-1"/>CSV Checks</Button>
          <Button size="sm" variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-1"/>PDF (imprimir)</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="indexation">Indexação</TabsTrigger>
          <TabsTrigger value="gsc">Google Search Console</TabsTrigger>
          <TabsTrigger value="semrush">Semrush (Backlinks/Keywords)</TabsTrigger>
          <TabsTrigger value="checks">Checks pré-deploy</TabsTrigger>
        </TabsList>

        <TabsContent value="indexation" className="space-y-4">
          <SEOIndexationPanel />
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <RobotsAndSitemapPanel />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Último envio do sitemap</CardTitle></CardHeader>
              <CardContent>
                {lastSubmission ? (
                  <>
                    <Badge variant={lastSubmission.status === 'success' ? 'default' : 'destructive'}>
                      {lastSubmission.status ?? 'desconhecido'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{lastSubmission.submitted_at ? format(new Date(lastSubmission.submitted_at), "dd/MM/yyyy HH:mm") : '—'}</p>
                  </>
                ) : <p className="text-sm text-muted-foreground">Nenhum envio registrado.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Cliques (últimos 28d)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtNum(gsc?.totals.clicks)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtNum(gsc?.totals.impressions)} impressões</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Posição média / Backlinks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtPos(gsc?.totals.avg_position)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtNum(last?.backlinks_total)} backlinks · {fmtNum(last?.referring_domains)} domínios</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Histórico do sitemap</CardTitle></CardHeader>
            <CardContent>
              {history.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Entradas</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {history.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>{format(new Date(h.ran_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell><Badge variant={h.status === 'success' ? 'default' : 'destructive'}>{h.status}</Badge></TableCell>
                        <TableCell>{h.entries ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-muted-foreground">Sem histórico de execuções automáticas.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSC */}
        <TabsContent value="gsc" className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => loadGsc(7, 'query')} disabled={loadingGsc}>7 dias</Button>
            <Button size="sm" variant="outline" onClick={() => loadGsc(28, 'query')} disabled={loadingGsc}>28 dias</Button>
            <Button size="sm" variant="outline" onClick={() => loadGsc(90, 'query')} disabled={loadingGsc}>90 dias</Button>
            <Button size="sm" onClick={() => loadGsc(28, 'query')} disabled={loadingGsc}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingGsc ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>
          {loadingGsc ? <Skeleton className="h-72" /> : gsc ? (
            <Card>
              <CardHeader>
                <CardTitle>Top palavras-chave</CardTitle>
                <CardDescription>{gsc.period.start} → {gsc.period.end} · {gsc.totals.row_count} consultas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Consulta</TableHead><TableHead>Cliques</TableHead><TableHead>Impressões</TableHead><TableHead>CTR</TableHead><TableHead>Posição</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {gsc.rows.slice(0, 30).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.keys[0]}</TableCell>
                        <TableCell>{r.clicks}</TableCell>
                        <TableCell>{r.impressions}</TableCell>
                        <TableCell>{(r.ctr * 100).toFixed(1)}%</TableCell>
                        <TableCell>{r.position.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>}
        </TabsContent>

        {/* SEMRUSH */}
        <TabsContent value="semrush" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={runSemrush} disabled={loadingSemrush}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingSemrush ? 'animate-spin' : ''}`} />
              Capturar snapshot agora
            </Button>
            <p className="text-xs text-muted-foreground">Cron semanal automático: domingos às 03:00 UTC.</p>
          </div>

          {last && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Backlinks', cur: last.backlinks_total, old: prev?.backlinks_total },
                { label: 'Domínios ref.', cur: last.referring_domains, old: prev?.referring_domains },
                { label: 'Autoridade', cur: last.authority_score, old: prev?.authority_score },
                { label: 'Keywords', cur: last.organic_keywords, old: prev?.organic_keywords },
                { label: 'Tráfego est.', cur: last.organic_traffic, old: prev?.organic_traffic },
              ].map(m => {
                const d = delta(m.cur, m.old);
                return (
                  <Card key={m.label}>
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{fmtNum(m.cur)}</p>
                      {d !== null && (
                        <p className={`text-xs flex items-center gap-1 ${d >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {d >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
                          {d.toFixed(1)}% vs anterior
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {trendData.length >= 2 && (
            <Card>
              <CardHeader><CardTitle>Tendências</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="backlinks" stroke="hsl(var(--primary))" />
                    <Line type="monotone" dataKey="refDomains" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="keywords" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {last?.top_keywords?.length ? (
            <Card>
              <CardHeader><CardTitle>Top keywords (snapshot mais recente)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Termo</TableHead><TableHead>Pos</TableHead><TableHead>Vol</TableHead><TableHead>Tráfego%</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {last.top_keywords.map((k, i) => (
                      <TableRow key={i}>
                        <TableCell>{k.Ph}</TableCell>
                        <TableCell>{k.Po}</TableCell>
                        <TableCell>{k.Nq}</TableCell>
                        <TableCell>{k.Tr}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* CHECKS */}
        <TabsContent value="checks" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={runChecks} disabled={loadingChecks}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingChecks ? 'animate-spin' : ''}`}/>Rodar checks
            </Button>
            <a href="/sitemap-check" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1"/>Verificação pública</Button>
            </a>
            {checks && (
              <span className="text-xs text-muted-foreground ml-2">
                {checks.summary.passed}/{checks.summary.total} ok · {checks.summary.errors} erros · {checks.summary.warnings} avisos
              </span>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4"/>Alertas em falhas</CardTitle>
              <CardDescription>Receba notificação quando algum check de severidade <strong>error</strong> falhar (cron diário 04:00 UTC).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="alert-email">E-mail</Label>
                <Input id="alert-email" type="email" placeholder="voce@exemplo.com" value={alertCfg.email}
                  onChange={(e) => setAlertCfg(a => ({ ...a, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alert-webhook">Webhook URL (opcional)</Label>
                <Input id="alert-webhook" placeholder="https://hooks.slack.com/..." value={alertCfg.webhook_url}
                  onChange={(e) => setAlertCfg(a => ({ ...a, webhook_url: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Severidades que disparam alerta</Label>
                <div className="flex flex-wrap gap-4">
                  {(['error','warn'] as const).map(sev => {
                    const checked = alertCfg.severities.includes(sev);
                    return (
                      <label key={sev} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          setAlertCfg(a => ({
                            ...a,
                            severities: v ? Array.from(new Set([...a.severities, sev])) : a.severities.filter(s => s !== sev),
                          }));
                        }} />
                        <Badge variant={sev === 'error' ? 'destructive' : 'secondary'}>{sev}</Badge>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Pelo menos uma severidade deve estar marcada para receber notificações.</p>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Switch id="alert-on" checked={alertCfg.enabled} onCheckedChange={(v) => setAlertCfg(a => ({ ...a, enabled: v }))} />
                <Label htmlFor="alert-on">Alertas ativos</Label>
                <Button size="sm" variant="outline" className="ml-auto" onClick={sendTestAlert} disabled={sendingTest || (!alertCfg.email && !alertCfg.webhook_url)}>
                  <Send className={`h-4 w-4 mr-1 ${sendingTest ? 'animate-pulse' : ''}`}/>{sendingTest ? 'Enviando...' : 'Enviar teste'}
                </Button>
                <Button size="sm" onClick={saveAlertCfg} disabled={savingCfg}>{savingCfg ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </CardContent>
          </Card>

          {checks && (
            <Card>
              <CardHeader><CardTitle className="text-base">Última execução</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Check</TableHead><TableHead>Status</TableHead><TableHead>Detalhe</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {checks.checks.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{c.name}</TableCell>
                        <TableCell>{c.ok
                          ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3"/>OK</Badge>
                          : <Badge variant={c.severity === 'error' ? 'destructive' : 'secondary'} className="gap-1"><AlertTriangle className="h-3 w-3"/>{c.severity}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {diff.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diff vs execução anterior</CardTitle>
                <CardDescription>{prevRun && format(new Date(prevRun.ran_at), "dd/MM HH:mm")} → {lastRun && format(new Date(lastRun.ran_at), "dd/MM HH:mm")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Check</TableHead><TableHead>Mudança</TableHead><TableHead>Antes</TableHead><TableHead>Agora</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {diff.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{d.name}</TableCell>
                        <TableCell><Badge variant={d.change === 'corrigido' ? 'default' : d.change === 'regrediu' ? 'destructive' : 'secondary'}>{d.change}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.from}</TableCell>
                        <TableCell className="text-xs">{d.to}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(() => {
            const filtered = runs.filter(r => {
              if (filterSource !== 'all' && r.source !== filterSource) return false;
              const t = new Date(r.ran_at).getTime();
              if (filterFrom && t < new Date(filterFrom).getTime()) return false;
              if (filterTo && t > new Date(filterTo).getTime() + 86_400_000) return false;
              return true;
            });
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages - 1);
            const slice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4"/>Histórico de execuções</CardTitle>
                  <CardDescription>{filtered.length} de {runs.length} execuções (cron diário + manuais)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Origem</Label>
                      <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value as typeof filterSource); setPage(0); }}
                        className="h-9 rounded-md border bg-background px-2 text-sm">
                        <option value="all">Todas</option>
                        <option value="cron">cron</option>
                        <option value="cron-daily">cron-daily</option>
                        <option value="manual">manual</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">De</Label>
                      <Input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }} className="h-9 w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Até</Label>
                      <Input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0); }} className="h-9 w-40" />
                    </div>
                    {(filterSource !== 'all' || filterFrom || filterTo) && (
                      <Button size="sm" variant="ghost" onClick={() => { setFilterSource('all'); setFilterFrom(''); setFilterTo(''); setPage(0); }}>Limpar</Button>
                    )}
                  </div>

                  {slice.length ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>OK/Total</TableHead><TableHead>Erros</TableHead><TableHead>Avisos</TableHead><TableHead>Alerta</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {slice.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{format(new Date(r.ran_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                            <TableCell>{r.passed}/{r.total}</TableCell>
                            <TableCell>{r.errors > 0 ? <Badge variant="destructive">{r.errors}</Badge> : r.errors}</TableCell>
                            <TableCell>{r.warnings}</TableCell>
                            <TableCell>{r.alert_sent ? <Badge variant="default">enviado</Badge> : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="text-sm text-muted-foreground">Nenhum registro para os filtros atuais.</p>}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Página {safePage + 1} de {totalPages}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
                        <Button size="sm" variant="outline" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
