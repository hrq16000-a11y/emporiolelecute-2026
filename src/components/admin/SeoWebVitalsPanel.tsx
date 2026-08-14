import { useState, useCallback, useEffect } from 'react';
import { Gauge, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Core Web Vitals reais (RUM) coletados por `src/lib/webVitals.ts` e
 * persistidos em `stale_bundle_logs` com o marcador `[web-vital]`.
 * Agrupa por tipo de página e calcula o p75 — a métrica que o Google usa.
 */

type MetricName = 'LCP' | 'CLS' | 'INP';
const METRICS: MetricName[] = ['LCP', 'CLS', 'INP'];

// Limites oficiais (bom / precisa melhorar) — LCP e INP em ms, CLS sem unidade.
const THRESHOLDS: Record<MetricName, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
};

const PAGE_TYPES: Array<{ label: string; test: (r: string) => boolean }> = [
  { label: 'Home', test: (r) => r === '/' },
  { label: 'Produto (PDP)', test: (r) => r.startsWith('/produto/') || r.startsWith('/produtos/') },
  { label: 'Catálogo', test: (r) => r === '/produtos' || r.startsWith('/loja') || r.startsWith('/buscar') },
  { label: 'Hub temático', test: (r) => r.startsWith('/tema/') },
  { label: 'Combinatória', test: (r) => r.startsWith('/segmento/') },
  { label: 'Kit', test: (r) => r.startsWith('/kit/') },
  { label: 'Coleção/Ocasião', test: (r) => r.startsWith('/colecao') || r.startsWith('/ocasi') },
  { label: 'Carrinho/Checkout', test: (r) => r.startsWith('/carrinho') || r.startsWith('/checkout') },
  { label: 'Institucional', test: () => true },
];

const classify = (route: string) => PAGE_TYPES.find((p) => p.test(route))!.label;

const fmt = (name: MetricName, v: number) =>
  name === 'CLS' ? v.toFixed(3) : `${Math.round(v)} ms`;

const rate = (name: MetricName, v: number): 'good' | 'ni' | 'poor' => {
  const [good, ni] = THRESHOLDS[name];
  return v <= good ? 'good' : v <= ni ? 'ni' : 'poor';
};

const RATE_CLASS: Record<'good' | 'ni' | 'poor', string> = {
  good: 'bg-primary/10 text-primary',
  ni: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  poor: 'bg-destructive/10 text-destructive',
};

const p75 = (values: number[]) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))];
};

interface Row {
  pageType: string;
  samples: number;
  metrics: Partial<Record<MetricName, number>>;
}

const SeoWebVitalsPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stale_bundle_logs')
        .select('route, message, stack, created_at')
        .ilike('message', '%[web-vital]%')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const buckets = new Map<string, { samples: number; values: Record<string, number[]> }>();
      for (const r of data ?? []) {
        let parsed: { name?: string; value?: number } = {};
        try {
          parsed = JSON.parse((r as { stack?: string }).stack || '{}');
        } catch { /* linha corrompida é ignorada */ }
        const name = parsed.name as MetricName | undefined;
        if (!name || !METRICS.includes(name) || typeof parsed.value !== 'number') continue;
        const key = classify((r as { route?: string }).route || '/');
        const b = buckets.get(key) ?? { samples: 0, values: {} };
        b.samples += 1;
        (b.values[name] ??= []).push(parsed.value);
        buckets.set(key, b);
      }

      const next: Row[] = [...buckets.entries()].map(([pageType, b]) => ({
        pageType,
        samples: b.samples,
        metrics: Object.fromEntries(
          METRICS.map((m) => [m, p75(b.values[m] ?? [])]).filter(([, v]) => v !== null),
        ) as Partial<Record<MetricName, number>>,
      }));
      next.sort((a, b) => b.samples - a.samples);
      setRows(next);
      setRanAt(new Date().toISOString());
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Falha ao ler Core Web Vitals',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  // Piores ofensores: pior rating primeiro, depois maior distância do limite "bom".
  const offenders = (rows ?? [])
    .flatMap((r) =>
      METRICS.filter((m) => r.metrics[m] !== undefined).map((m) => ({
        pageType: r.pageType,
        metric: m,
        value: r.metrics[m]!,
        ratio: r.metrics[m]! / THRESHOLDS[m][0],
      })),
    )
    .filter((o) => o.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5 text-primary" /> Core Web Vitals por tipo de página
          </CardTitle>
          <CardDescription>
            p75 de LCP, CLS e INP medidos em usuários reais (últimas 1.000 amostras).
            {ranAt && ` Atualizado às ${new Date(ranAt).toLocaleTimeString('pt-BR')}.`}
          </CardDescription>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="min-h-11 shrink-0">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Reexecutar medição
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !rows && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {rows && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há amostras de Core Web Vitals. Elas são coletadas automaticamente das
            visitas reais ao site publicado.
          </p>
        )}

        {offenders.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> Maiores vilões
            </p>
            <ul className="space-y-1 text-xs">
              {offenders.map((o) => (
                <li key={`${o.pageType}-${o.metric}`}>
                  <span className="font-medium">{o.pageType}</span> — {o.metric}{' '}
                  {fmt(o.metric, o.value)} (limite {fmt(o.metric, THRESHOLDS[o.metric][0])})
                </li>
              ))}
            </ul>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Tipo de página</th>
                  <th className="py-2 pr-3 font-medium">Amostras</th>
                  {METRICS.map((m) => (
                    <th key={m} className="py-2 pr-3 font-medium">{m} (p75)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.pageType} className="border-b last:border-0">
                    <td className="py-2 pr-3">{r.pageType}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.samples}</td>
                    {METRICS.map((m) => {
                      const v = r.metrics[m];
                      return (
                        <td key={m} className="py-2 pr-3">
                          {v === undefined ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Badge variant="outline" className={`border-0 ${RATE_CLASS[rate(m, v)]}`}>
                              {fmt(m, v)}
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoWebVitalsPanel;
