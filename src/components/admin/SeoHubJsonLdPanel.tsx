import { useState } from 'react';
import { Network, Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Check { field: string; ok: boolean; detail: string; severity: 'error' | 'warn' }
interface PageReport {
  kind: 'theme_hub' | 'combination_page';
  path: string;
  url: string;
  ok: boolean;
  source: 'prerender' | 'live';
  types: string[];
  checks: Check[];
  duration_ms: number;
}
interface Payload {
  ran_at: string;
  ok: boolean;
  summary: { pages: number; valid: number; invalid: number; theme_hubs: number; combination_pages: number };
  pages: PageReport[];
}

const KIND_LABEL: Record<PageReport['kind'], string> = {
  theme_hub: 'Hub temático',
  combination_page: 'Página combinatória',
};

/**
 * Valida o JSON-LD (Organization, BreadcrumbList, CollectionPage/ItemList e
 * Product) renderizado para robôs em cada theme_hub e combination_page.
 */
const SeoHubJsonLdPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Payload | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('seo-jsonld-hubs', {
        body: { limit: 12 },
      });
      if (error) throw error;
      const payload = res as Payload;
      setData(payload);
      toast({
        title: payload.ok ? 'JSON-LD dos hubs íntegro' : 'Inconsistências no JSON-LD dos hubs',
        description: `${payload.summary.valid}/${payload.summary.pages} URLs válidas`,
        variant: payload.ok ? 'default' : 'destructive',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Falha ao auditar hubs',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5 text-primary" /> JSON-LD de hubs e combinações
          </CardTitle>
          <CardDescription>
            Confere Organization, BreadcrumbList, CollectionPage/ItemList e Product no HTML servido
            a robôs de cada <code>/tema/:slug</code> e página combinatória.
          </CardDescription>
        </div>
        <Button onClick={run} disabled={loading} variant="outline" className="min-h-11 shrink-0">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
          Auditar hubs
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data && !loading && (
          <p className="text-sm text-muted-foreground">Nenhuma auditoria executada nesta sessão.</p>
        )}
        {loading && <p className="text-sm text-muted-foreground">Lendo o HTML renderizado de cada URL…</p>}

        {data && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant={data.ok ? 'secondary' : 'destructive'}>
                {data.summary.valid}/{data.summary.pages} URLs válidas
              </Badge>
              <Badge variant="outline">{data.summary.theme_hubs} hubs</Badge>
              <Badge variant="outline">{data.summary.combination_pages} combinações</Badge>
            </div>

            {data.ok ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Schema consistente</AlertTitle>
                <AlertDescription>
                  Todas as URLs auditadas expõem Organization e BreadcrumbList válidos.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{data.summary.invalid} URL(s) com JSON-LD incompleto</AlertTitle>
                <AlertDescription>
                  Corrija os campos abaixo antes de reenviar sitemap ou IndexNow.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {data.pages.map((p) => (
                <div key={p.path} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium break-all">{p.path}</span>
                    <Badge variant="outline" className="text-[10px]">{KIND_LABEL[p.kind]}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{p.source}</Badge>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="mt-2 space-y-1">
                    {p.checks.filter((c) => !c.ok).map((c) => (
                      <p
                        key={c.field}
                        className={`flex items-start gap-1 text-xs ${
                          c.severity === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <span className="font-medium">{c.field}</span>: {c.detail}
                        </span>
                      </p>
                    ))}
                    {p.ok && (
                      <p className="text-xs text-muted-foreground">
                        {p.types.join(' · ') || 'sem tipos'} — {p.duration_ms}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoHubJsonLdPanel;
