import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { parseSitemapStatus } from '@/lib/sitemap-status';
import { Link } from 'react-router-dom';

const GlobalSitemapPanel = () => {
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{ count: number; at: string; xml: string } | null>(null);
  const published = useQuery({ queryKey: ['seo-global-public-sitemap'], queryFn: async () => {
    const response = await fetch(`/sitemap.xml?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Sitemap indisponível (HTTP ${response.status})`);
    return parseSitemapStatus(await response.text());
  }});
  const regenerate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sitemap', { body: { force: true, source: 'admin-seo-global' } });
      if (error) throw error;
      if (typeof data !== 'string') throw new Error('A geração não retornou XML válido.');
      const status = parseSitemapStatus(data);
      setGenerated({ count: status.count, at: new Date().toISOString(), xml: data });
      await published.refetch();
      toast.success('Sitemap regenerado. O arquivo público é atualizado na próxima publicação.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível regerar.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-t border-border pt-6">
    <h2 className="font-display text-2xl">Sitemap</h2>
    <dl className="grid gap-4 md:grid-cols-3"><div><dt className="text-muted-foreground">Arquivo público</dt><dd role="status">{published.isPending ? 'Consultando…' : published.error ? 'Indisponível' : 'Disponível'}</dd></div><div><dt className="text-muted-foreground">URLs publicadas</dt><dd>{published.data?.count ?? '—'}</dd></div><div><dt className="text-muted-foreground">Última geração nesta tela</dt><dd>{generated ? `${generated.count} URLs · ${new Date(generated.at).toLocaleString('pt-BR')}` : '—'}</dd></div></dl>
    {published.error && <p role="alert" className="text-destructive">{published.error.message}</p>}
    <p className="text-sm text-muted-foreground">Regerar produz o XML atualizado; o sitemap público acompanha a próxima publicação da loja. Enviar ao Google é uma ação separada.</p>
    <div className="flex flex-wrap gap-3"><Button onClick={regenerate} disabled={busy}><RefreshCw className={busy ? 'animate-spin' : ''} />Regerar agora</Button><Button variant="outline" onClick={() => published.refetch()} disabled={published.isFetching}>Atualizar status</Button><Button asChild variant="outline"><Link to="/admin/sitemap-status">Envios ao Google</Link></Button>{generated && <Button variant="outline" onClick={() => { const url = URL.createObjectURL(new Blob([generated.xml], { type: 'application/xml' })); const a = document.createElement('a'); a.href = url; a.download = 'sitemap.xml'; a.click(); URL.revokeObjectURL(url); }}><Download />Baixar XML gerado</Button>}</div>
  </section>;
};
export default GlobalSitemapPanel;