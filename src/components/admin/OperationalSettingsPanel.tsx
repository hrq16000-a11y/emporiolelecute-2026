import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const defaults = { id: true, email_enabled: false, alert_email: '', slack_enabled: false, slack_channel: '', alert_failures: true, alert_regressions: true, alert_high: true, block_catalog: true, retention_days: 0 };
export const OperationalSettingsPanel = ({ retentionOnly = false }: { retentionOnly?: boolean }) => {
  const [form, setForm] = useState(defaults); const [saving,setSaving] = useState(false);
  const query = useQuery({ queryKey:['operational-settings'], queryFn: async () => { const {data,error} = await supabase.from('operational_settings').select('*').maybeSingle(); if(error) throw error; return data ?? defaults; }});
  const gate = useQuery({ queryKey:['catalog-security-status'], enabled: !retentionOnly, refetchInterval: 10000, queryFn: async () => { const {data,error}=await supabase.rpc('catalog_security_status'); if(error) throw error; return data as {blocked:boolean;scan_id:string|null;approved:boolean}; }});
  const [reason,setReason]=useState('');
  useEffect(()=>{if(query.data) setForm(query.data);},[query.data]);
  if(query.isPending) return <p>Carregando configurações…</p>;
  if(query.error) return <p role="alert">Não foi possível carregar as configurações.</p>;
  return <section className="space-y-4 border-t border-border pt-6"><h2 className="font-display text-xl">{retentionOnly ? 'Retenção do histórico' : 'Alertas e aprovação do catálogo'}</h2>
    {!retentionOnly && <>
      {(['email_enabled','slack_enabled','alert_failures','alert_regressions','alert_high','block_catalog'] as const).map((key,index)=><div key={key} className="flex items-center gap-3"><Switch id={key} checked={form[key]} onCheckedChange={v=>setForm({...form,[key]:v})}/><Label htmlFor={key}>{['Destino e-mail','Destino Slack','Alertar falhas de execução','Alertar regressões','Alertar achados altos/críticos','Bloquear catálogo em regressões altas/críticas'][index]}</Label></div>)}
      <Label htmlFor="security-email">E-mail de destino</Label><Input id="security-email" type="email" value={form.alert_email} onChange={e=>setForm({...form,alert_email:e.target.value})}/>
      <Label htmlFor="security-slack">Canal Slack</Label><Input id="security-slack" value={form.slack_channel} onChange={e=>setForm({...form,slack_channel:e.target.value})}/>
      <p className="text-sm text-muted-foreground">Entrega externa pendente: configure o domínio remetente e conecte Slack. As regras ficam salvas, sem envio simulado.</p>
      <p role={gate.error ? 'alert' : 'status'}>Catálogo: {gate.error ? 'Não foi possível verificar o bloqueio. Tente novamente.' : gate.data?.blocked ? 'Bloqueado por regressão de segurança' : gate.isPending ? 'Consultando…' : 'Sem bloqueio de regressão'}</p>
      {gate.data?.blocked && <><Label htmlFor="approval-reason">Justificativa da aprovação deste scan</Label><Input id="approval-reason" value={reason} onChange={e=>setReason(e.target.value)}/><Button disabled={reason.trim().length<10 || saving} onClick={async()=>{ const id=gate.data?.scan_id;if(!id)return;setSaving(true);try{const {error}=await supabase.rpc('approve_catalog_security',{_scan_id:id,_reason:reason});if(error)throw error;await gate.refetch();toast.success('Exceção aprovada para este scan');}catch{toast.error('Não foi possível aprovar');}finally{setSaving(false);}}}>Aprovar exceção para este scan</Button></>}
    </>}
    {retentionOnly && <><Label htmlFor="retention-days">Dias de retenção (0 = manter tudo)</Label><Input id="retention-days" type="number" min={0} max={3650} value={form.retention_days} onChange={e=>setForm({...form,retention_days:Number(e.target.value)})}/><p className="text-sm text-muted-foreground">Limpeza diária dos relatórios Lighthouse mais antigos. Exporte antes de reduzir o período. Métricas de visitantes não são removidas.</p></>}
    <Button disabled={saving} onClick={async()=>{if(!Number.isInteger(form.retention_days)||form.retention_days<0||form.retention_days>3650){toast.error('Retenção inválida');return;}if(retentionOnly&&form.retention_days>0&&!window.confirm('Relatórios anteriores ao período serão removidos diariamente. Continuar?'))return;setSaving(true);try{const payload=retentionOnly?{id:true,retention_days:form.retention_days}:{id:true,email_enabled:form.email_enabled,alert_email:form.alert_email,slack_enabled:form.slack_enabled,slack_channel:form.slack_channel,alert_failures:form.alert_failures,alert_regressions:form.alert_regressions,alert_high:form.alert_high,block_catalog:form.block_catalog};const {error}=await supabase.from('operational_settings').upsert(payload);if(error)throw error;await query.refetch();if(!retentionOnly)await gate.refetch();toast.success('Configurações operacionais salvas');}catch{toast.error('Não foi possível salvar');}finally{setSaving(false);}}}>Salvar configurações</Button>
  </section>;
};