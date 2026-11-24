const statusLabels: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Pagamento confirmado',
  processing: 'Em produção',
  production: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export interface StatusEmailOrder {
  order_code: string;
  customer_email: string;
  customer_name: string;
  status: string;
  tracking_code: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
}

const safeTrackingUrl = (value: string | null): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
};

// Delivery fields are read from the saved order, never from the request body.
export const buildStatusEmailData = (order: StatusEmailOrder) => ({
  type: 'status_update' as const,
  orderCode: order.order_code,
  customerEmail: order.customer_email,
  customerName: order.customer_name,
  newStatus: order.status,
  statusLabel: statusLabels[order.status] ?? 'Status atualizado',
  trackingCode: order.tracking_code ?? undefined,
  trackingCarrier: order.tracking_carrier ?? undefined,
  trackingUrl: safeTrackingUrl(order.tracking_url),
});