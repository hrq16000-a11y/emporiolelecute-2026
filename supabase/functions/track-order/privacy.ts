export const privateOrderFields = [
  'customer_name', 'customer_email', 'customer_phone', 'address_cep',
  'address_street', 'address_number', 'address_complement',
  'address_neighborhood', 'address_city', 'address_state', 'notes',
] as const;

const publicOrderFields = [
  'order_code', 'shipping_method', 'shipping_company', 'shipping_days',
  'status', 'created_at', 'updated_at',
  'shipping_price', 'subtotal', 'total',
  'tracking_code', 'tracking_carrier', 'tracking_url', 'shipped_at', 'payment_status',
] as const;

export const mayReadOrderDetails = (identity: { email?: string; email_confirmed_at?: string } | null, orderEmail: unknown, isAdmin: boolean): boolean => {
  if (!identity) return false;
  if (isAdmin) return true;
  return Boolean(identity.email_confirmed_at && identity.email && typeof orderEmail === 'string'
    && identity.email.trim().toLowerCase() === orderEmail.trim().toLowerCase());
};

export const trackingResponse = (order: Record<string, unknown>, items: Record<string, unknown>[], privateAccess: boolean) => {
  const fields = privateAccess ? [...publicOrderFields, ...privateOrderFields, 'id'] : publicOrderFields;
  return {
    order: Object.fromEntries(fields.map(key => [key, order[key] ?? null])),
    items: privateAccess ? items.map(item => Object.fromEntries([
      'id', 'product_name', 'product_slug', 'product_image', 'quantity', 'unit_price',
      ...(privateAccess ? ['personalization'] : []),
    ].map(key => [key, item[key] ?? null]))) : [],
  };
};