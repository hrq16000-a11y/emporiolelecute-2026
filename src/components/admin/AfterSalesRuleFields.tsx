import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { followupMessageFor, type AfterSalesRule, type FollowupEvent } from '@/lib/after-sales';

const AfterSalesRuleFields = ({ value, onChange }: { value: AfterSalesRule; onChange: (rule: AfterSalesRule) => void }) => (
  <div className="space-y-5">
    <div className="flex items-center gap-3"><Switch id="followup-enabled" checked={value.enabled} onCheckedChange={enabled => onChange({ ...value, enabled })} /><Label htmlFor="followup-enabled">Permitir agendamento de acompanhamento</Label></div>
    <div className="grid gap-4 md:grid-cols-2">
      <div><Label>Contar a partir de</Label><Select value={value.trigger_event} onValueChange={event => onChange({ ...value, trigger_event: event as FollowupEvent, message: followupMessageFor(event as FollowupEvent), subject: event === 'delivered' ? 'Seu pedido chegou bem? — Empório LeleCute' : 'Sobre seu pedido — Empório LeleCute' })}><SelectTrigger aria-label="Marco do pós-venda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Pagamento confirmado</SelectItem><SelectItem value="customer_confirmed">Confirmação manual do cliente</SelectItem><SelectItem value="delivered">Chegada confirmada</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor="followup-days">Dias após o evento</Label><Input id="followup-days" type="number" min={1} max={365} value={value.delay_days} onChange={e => onChange({ ...value, delay_days: Number(e.target.value) })} /></div>
    </div>
    <div><Label htmlFor="followup-subject">Assunto</Label><Input id="followup-subject" value={value.subject} onChange={e => onChange({ ...value, subject: e.target.value })} /></div>
    <div><Label htmlFor="followup-message">Mensagem de acompanhamento</Label><Textarea id="followup-message" rows={4} value={value.message} onChange={e => onChange({ ...value, message: e.target.value })} /></div>
    <div className="flex items-center gap-3"><Switch id="followup-repurchase" checked={value.repurchase_enabled} onCheckedChange={repurchase_enabled => onChange({ ...value, repurchase_enabled })} /><Label htmlFor="followup-repurchase">Preparar sugestão de recompra</Label></div>
    {value.repurchase_enabled && <div><Label htmlFor="followup-repurchase-text">Texto de recompra (marketing separado)</Label><Textarea id="followup-repurchase-text" value={value.repurchase_text} onChange={e => onChange({ ...value, repurchase_text: e.target.value })} /></div>}
    <p className="text-sm text-muted-foreground">Envio aguarda domínio remetente configurado. Recompra por email requer serviço de marketing e consentimento.</p>
    <div className="border-l-2 border-primary/30 pl-4"><p className="font-display text-lg">{value.subject}</p><p className="mt-2 whitespace-pre-line text-muted-foreground">{value.message.split('{nome}').join('Cliente').split('{pedido}').join('LC123456')}</p></div>
  </div>
);
export default AfterSalesRuleFields;