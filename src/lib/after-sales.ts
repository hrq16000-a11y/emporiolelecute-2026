export type FollowupEvent = 'paid' | 'customer_confirmed' | 'delivered';
export interface AfterSalesRule {
  enabled: boolean;
  trigger_event: FollowupEvent;
  delay_days: number;
  subject: string;
  message: string;
  repurchase_enabled: boolean;
  repurchase_text: string;
}
export const defaultAfterSalesRule: AfterSalesRule = {
  enabled: false, trigger_event: 'delivered', delay_days: 3,
  subject: 'Seu pedido chegou bem? — Empório LeleCute',
  message: 'Olá, {nome}! Seu pedido {pedido} chegou bem? Responda e me conte como foi receber sua encomenda.',
  repurchase_enabled: false, repurchase_text: '',
};
export const followupDueAt = (eventAt: string, days: number): string => {
  const time = Date.parse(eventAt);
  if (!Number.isFinite(time) || !Number.isInteger(days) || days < 1 || days > 365) throw new Error('invalid_schedule');
  return new Date(time + days * 86400000).toISOString();
};
export const canScheduleFollowup = (rule: AfterSalesRule, event: FollowupEvent, status: string) =>
  rule.enabled && rule.trigger_event === event && status !== 'cancelled';
export const followupMessageFor = (event: FollowupEvent) => event === 'delivered'
  ? defaultAfterSalesRule.message
  : event === 'paid' ? 'Olá, {nome}! O pagamento do pedido {pedido} foi confirmado. Estou por aqui se precisar conversar sobre sua encomenda.'
  : 'Olá, {nome}! Obrigada por confirmar os detalhes do pedido {pedido}. Se precisar de algo, pode falar comigo.';