import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import AfterSalesRuleFields from '@/components/admin/AfterSalesRuleFields';
import { defaultAfterSalesRule, followupDueAt, canScheduleFollowup, type AfterSalesRule, type FollowupEvent } from '@/lib/after-sales';

const AdminBoutique = () => {
  const qc = useQueryClient();
  const [rule, setRule] = useState<AfterSalesRule>(defaultAfterSalesRule);
  const [story, setStory] = useState({ title: '', body: '', image_url: '', is_published: false });
  const [saving, setSaving] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [event, setEvent] = useState<FollowupEvent>('delivered');
  const [eventAt, setEventAt] = useState('');
  const [note, setNote] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['boutique-admin'], queryFn: async () => {
    const [rules, stories, follows] = await Promise.all([
      supabase.from('after_sales_rules').select('*').eq('scope_key', 'global').maybeSingle(),
      supabase.from('editorial_stories').select('*').eq('story_key', 'packaging').maybeSingle(),
      supabase.from('after_sales_followups').select('*, orders(order_code)').order('due_at').limit(50),
    ]);
    if (rules.error || stories.error || follows.error) throw rules.error || stories.error || follows.error;
    return { rule: rules.data, story: stories.data, follows: follows.data };
  }});
  useEffect(() => { if (data?.rule) setRule(data.rule as AfterSalesRule); if (data?.story) setStory({ ...data.story, image_url: data.story.image_url ?? '' }); }, [data]);
  const runSave = async (task: () => Promise<void>) => {
    setSaving(true);
    try { await task(); await qc.invalidateQueries({ queryKey: ['boutique-admin'] }); toast.success('Alterações salvas'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar'); }
    finally { setSaving(false); }
  };
  if (isLoading) return <Loader2 className="m-8 animate-spin text-primary" />;
  if (error) return <div role="alert" className="p-8">Não foi possível carregar. <Button onClick={() => qc.invalidateQueries({ queryKey: ['boutique-admin'] })}>Tentar novamente</Button></div>;
  return <div className="max-w-4xl p-4 md:p-8 space-y-6">
    <h1 className="font-display text-3xl">Ateliê e pós-venda</h1>
    <nav className="flex flex-wrap gap-4"><Button asChild variant="outline"><Link to="/admin/paginas">Como é feito e páginas</Link></Button><Button asChild variant="outline"><Link to="/admin/colecoes">Coleções em rascunho</Link></Button><Button asChild variant="outline"><Link to="/admin/pdp-sections">Seções da PDP</Link></Button></nav>
    <Tabs defaultValue="packaging"><TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="packaging">Embalagem</TabsTrigger><TabsTrigger value="rules">Pós-venda</TabsTrigger><TabsTrigger value="schedule">Agendamentos</TabsTrigger></TabsList>
      <TabsContent value="packaging" className="space-y-4 pt-5">
        <Label htmlFor="story-title">Título</Label><Input id="story-title" value={story.title} onChange={e => setStory({ ...story, title: e.target.value })} />
        <Label htmlFor="story-body">Texto em primeira pessoa</Label><Textarea id="story-body" rows={5} value={story.body} onChange={e => setStory({ ...story, body: e.target.value })} />
        <Label htmlFor="story-image">URL da foto real (opcional)</Label><Input id="story-image" type="url" value={story.image_url} onChange={e => setStory({ ...story, image_url: e.target.value })} />
        <div className="flex items-center gap-3"><Switch id="story-published" checked={story.is_published} onCheckedChange={is_published => setStory({ ...story, is_published })} /><Label htmlFor="story-published">Exibir na loja e PDP</Label></div>
        <Button disabled={saving} onClick={() => runSave(async () => {
          const { error } = await supabase.from('editorial_stories').upsert({ ...story, image_url: story.image_url || null, story_key: 'packaging' }); if (error) throw error;
          const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const { error: pageError } = await supabase.from('pages').update({ title: story.title, status: story.is_published ? 'published' : 'draft', content: `<h2>${escape(story.title)}</h2><p>${escape(story.body).replace(/\n/g, '<br>')}</p>${story.image_url ? `<img src="${escape(story.image_url)}" alt="Embalagem Empório LeleCute">` : ''}` }).eq('slug', 'embalagem-e-unboxing'); if (pageError) throw pageError;
          await qc.invalidateQueries({ queryKey: ['editorial-story'] }); await qc.invalidateQueries({ queryKey: ['page'] });
        })}><Save />Salvar embalagem</Button>
        <section className="border-t border-border pt-6"><h2 className="font-display text-2xl">{story.title}</h2><p className="mt-3 whitespace-pre-line text-muted-foreground">{story.body}</p></section>
      </TabsContent>
      <TabsContent value="rules" className="space-y-6 pt-5"><AfterSalesRuleFields value={rule} onChange={setRule} /><Button disabled={saving} onClick={() => runSave(async () => { followupDueAt(new Date().toISOString(), rule.delay_days); const { error } = await supabase.from('after_sales_rules').upsert({ ...rule, scope_key: 'global' }); if (error) throw error; })}><Save />Salvar regras gerais</Button></TabsContent>
      <TabsContent value="schedule" className="space-y-5 pt-5">
        <p className="text-muted-foreground">Envios estão bloqueados até configurar o remetente. Nenhum pedido antigo foi agendado automaticamente.</p>
        <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="order-code">Código do pedido</Label><Input id="order-code" value={orderCode} onChange={e => setOrderCode(e.target.value.toUpperCase())} /></div><div><Label htmlFor="event-at">Data real do evento</Label><Input id="event-at" type="datetime-local" value={eventAt} onChange={e => setEventAt(e.target.value)} /></div></div>
        <Label htmlFor="schedule-event">Evento confirmado</Label><select id="schedule-event" className="h-11 w-full rounded-md border border-input bg-background px-3" value={event} onChange={e => setEvent(e.target.value as FollowupEvent)}><option value="delivered">Chegada confirmada</option><option value="paid">Pagamento confirmado</option><option value="customer_confirmed">Confirmação do cliente</option></select>
        <Label htmlFor="schedule-note">Motivo / confirmação recebida</Label><Textarea id="schedule-note" value={note} onChange={e => setNote(e.target.value)} />
        <Button disabled={saving || !eventAt || !orderCode || !note.trim()} onClick={() => runSave(async () => {
          const { data: order, error } = await supabase.from('orders').select('id,status').eq('order_code', orderCode).single(); if (error) throw error;
          const { data: items, error: itemError } = await supabase.from('order_items').select('product_slug').eq('order_id', order.id); if (itemError) throw itemError;
          const slugs = (items ?? []).map(item => item.product_slug).filter((slug): slug is string => !!slug);
          const { data: products, error: productError } = await supabase.from('products').select('id').in('slug', slugs); if (productError) throw productError;
          const ids = (products ?? []).map(product => product.id);
          const { data: overrides, error: ruleError } = await supabase.from('after_sales_rules').select('*').in('scope_key', ids); if (ruleError) throw ruleError;
          const override = overrides?.[0];
          if ((overrides?.length ?? 0) > 1 && overrides?.some(candidate => candidate.trigger_event !== override?.trigger_event || candidate.delay_days !== override?.delay_days || candidate.enabled !== override?.enabled)) throw new Error('O pedido contém regras diferentes. Revise as regras dos produtos antes de agendar.');
          const effectiveRule = override ? override as AfterSalesRule : rule;
          if (!canScheduleFollowup(effectiveRule, event, order.status ?? '')) throw new Error('Ative a regra e selecione o marco correspondente. Pedidos cancelados não são elegíveis.');
          const occurred_at = new Date(eventAt).toISOString(); const { error: saveError } = await supabase.from('after_sales_followups').upsert({ order_id: order.id, event, occurred_at, due_at: followupDueAt(occurred_at, effectiveRule.delay_days), note, status: 'blocked' }, { onConflict: 'order_id,event' }); if (saveError) throw saveError;
        })}>Registrar / reagendar</Button>
        <ul className="divide-y divide-border">{data?.follows?.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><strong>{item.orders?.order_code}</strong><p className="text-sm text-muted-foreground">{new Date(item.due_at).toLocaleString('pt-BR')} · {item.status === 'blocked' ? 'Envio bloqueado: remetente pendente' : item.status === 'cancelled' ? 'Cancelado' : item.status}</p><p className="text-sm">{item.note}</p></div><Button variant="outline" disabled={saving || item.status === 'cancelled'} onClick={() => runSave(async () => { const { error } = await supabase.from('after_sales_followups').update({ status: 'cancelled' }).eq('id', item.id); if (error) throw error; })}>Cancelar</Button></li>)}</ul>
      </TabsContent>
    </Tabs>
  </div>;
};
export default AdminBoutique;