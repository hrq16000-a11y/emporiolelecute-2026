import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSEOConfig } from '@/hooks/useStoreSettings';
import { useRobotsConfig, useUpdateRobotsConfig, buildRobotsTxt, type RobotsConfig } from '@/hooks/useRobotsConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import GlobalSitemapPanel from '@/components/admin/GlobalSitemapPanel';

const fields = [
  ['site_title', 'Título padrão'], ['site_description', 'Descrição padrão'], ['site_keywords', 'Palavras-chave'],
  ['og_image', 'Imagem social (URL HTTPS)'], ['twitter_handle', 'Perfil no X / Twitter'],
  ['google_verification', 'Verificação Google'], ['bing_verification', 'Verificação Bing'], ['facebook_app_id', 'ID do Facebook'],
] as const;
const AdminSeoGlobal = () => {
  const qc = useQueryClient();
  const defaults = useSEOConfig();
  const config = useQuery({ queryKey: ['seo-global-config'], queryFn: async () => {
    const { data, error } = await supabase.from('store_settings').select('value').eq('key', 'seo_config').maybeSingle();
    if (error) throw error;
    return data?.value && typeof data.value === 'object' && !Array.isArray(data.value) ? data.value : {};
  }});
  const robots = useRobotsConfig();
  const updateRobots = useUpdateRobotsConfig();
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [robotForm, setRobotForm] = useState<RobotsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (config.data && defaults.data && !meta) setMeta({ ...defaults.data, ...config.data }); }, [config.data, defaults.data, meta]);
  useEffect(() => { if (robots.data && !robotForm) setRobotForm(robots.data); }, [robots.data, robotForm]);
  if (config.error || robots.error) return <div role="alert">Não foi possível carregar o SEO. <Button onClick={() => { config.refetch(); robots.refetch(); }}>Tentar novamente</Button></div>;
  if (!meta || !robotForm) return <Loader2 aria-label="Carregando SEO" className="animate-spin text-primary" />;
  const saveMeta = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('store_settings').upsert({ key: 'seo_config', value: JSON.parse(JSON.stringify(meta)), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['seo_config'] }); await config.refetch(); toast.success('Meta tags salvas');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  const patchRobots = (patch: Partial<RobotsConfig>) => setRobotForm({ ...robotForm, ...patch });
  return <div className="max-w-5xl space-y-8">
    <h1 className="font-display text-3xl">SEO global</h1>
    <section className="space-y-4"><h2 className="font-display text-2xl">Meta tags raiz</h2>
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([key, label]) => <div key={key}><Label htmlFor={`global-${key}`}>{label}</Label>{key === 'site_description' ? <Textarea id={`global-${key}`} value={String(meta[key] ?? '')} onChange={e => setMeta({ ...meta, [key]: e.target.value })} /> : <Input id={`global-${key}`} value={String(meta[key] ?? '')} onChange={e => setMeta({ ...meta, [key]: e.target.value })} />}</div>)}</div>
      <Button onClick={saveMeta} disabled={saving}><Save />Salvar meta tags</Button>
    </section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="font-display text-2xl">Robots</h2>
      <div className="flex items-center gap-3"><Switch id="global-indexing" checked={robotForm.allow_indexing} onCheckedChange={allow_indexing => patchRobots({ allow_indexing })} /><Label htmlFor="global-indexing">Permitir indexação</Label></div>
      {!robotForm.allow_indexing && <p role="alert" className="text-destructive">Todo o site será bloqueado para rastreamento na configuração dinâmica.</p>}
      <Label htmlFor="global-sitemap-url">URL do sitemap</Label><Input id="global-sitemap-url" value={robotForm.sitemap_url} onChange={e => patchRobots({ sitemap_url: e.target.value })} />
      <div className="grid gap-4 md:grid-cols-2">{([['disallow_paths', 'Caminhos bloqueados'], ['disallow_query_params', 'Parâmetros bloqueados'], ['blocked_category_slugs', 'Categorias bloqueadas']] as const).map(([key,label]) => <div key={key}><Label htmlFor={`global-${key}`}>{label}</Label><Textarea id={`global-${key}`} value={robotForm[key].join('\n')} onChange={e => patchRobots({ [key]: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} /></div>)}</div>
      <Label htmlFor="global-directives">Diretivas adicionais</Label><Textarea id="global-directives" value={robotForm.custom_directives} onChange={e => patchRobots({ custom_directives: e.target.value })} />
      <details><summary className="cursor-pointer">Prévia das diretivas</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap break-words bg-muted p-4 text-xs">{buildRobotsTxt(robotForm)}</pre></details>
      <p className="text-sm text-muted-foreground">Salvar atualiza as diretivas dinâmicas. O robots.txt público pode permanecer estático até sincronização da hospedagem.</p>
      <Button disabled={updateRobots.isPending} onClick={async () => { if (!robotForm.allow_indexing && !window.confirm('Bloquear o rastreamento de toda a loja?')) return; try { await updateRobots.mutateAsync(robotForm); toast.success('Diretivas robots salvas'); } catch { toast.error('Não foi possível salvar robots.'); } }}><Save />Salvar robots</Button>
    </section>
    <GlobalSitemapPanel />
  </div>;
};
export default AdminSeoGlobal;