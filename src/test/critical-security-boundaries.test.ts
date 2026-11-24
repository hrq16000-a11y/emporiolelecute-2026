import { describe, expect, it } from 'vitest';
import { buildStatusEmailData } from '../../supabase/functions/_shared/order-status-email';
import { parseIndexationRequest, safeIndexationUrl } from '../../supabase/functions/seo-indexation-monitor/policy';

describe('Indexation outbound boundary', () => {
  it('allows only HTTPS store origins, not private services or lookalike hosts', () => {
    expect(safeIndexationUrl('https://emporiolelecute.com.br/produto/teste')).toBe('https://emporiolelecute.com.br/produto/teste');
    for (const url of [
      'http://127.0.0.1', 'https://localhost', 'http://169.254.169.254/latest/meta-data',
      'https://[::1]', 'https://10.0.0.1', 'file:///etc/passwd',
      'https://emporiolelecute.com.br.evil.test', 'https://emporiolelecute.com.br@evil.test',
      'https://evil.test@emporiolelecute.com.br', 'https://emporiolelecute.com.br:8443',
      'https://emporiolelecute.com.br\\@evil.test',
    ]) expect(safeIndexationUrl(url)).toBeNull();
  });

  it('rejects a whole mixed URL batch and bounds work at 200 integer entries', () => {
    expect(parseIndexationRequest({ urls: ['https://emporiolelecute.com.br/', 'http://127.0.0.1'] })).toBeNull();
    expect(parseIndexationRequest({ urls: Array(201).fill('https://emporiolelecute.com.br/') })).toBeNull();
    for (const limit of [0, 201, 1.5, '50']) expect(parseIndexationRequest({ limit })).toBeNull();
    expect(parseIndexationRequest({ limit: 200 })).toEqual({ limit: 200, urls: [] });
  });
});

describe('Authoritative status email', () => {
  it('takes recipient, status and tracking from the saved order, not forged request fields', () => {
    const saved = {
      order_code: 'LC123456', customer_email: 'customer@example.test', customer_name: 'Cliente',
      status: 'production', tracking_code: null, tracking_carrier: null, tracking_url: null,
      customerEmail: 'attacker@example.test', newStatus: 'shipped', statusLabel: 'Pagamento falso',
      trackingUrl: 'https://evil.test',
    };
    expect(buildStatusEmailData(saved)).toEqual({
      type: 'status_update', orderCode: 'LC123456', customerEmail: 'customer@example.test',
      customerName: 'Cliente', newStatus: 'production', statusLabel: 'Em produção',
      trackingCode: undefined, trackingCarrier: undefined, trackingUrl: undefined,
    });
  });

  it('excludes executable tracking links from email', () => {
    expect(buildStatusEmailData({
      order_code: 'LC123456', customer_email: 'customer@example.test', customer_name: 'Cliente',
      status: 'shipped', tracking_code: 'TEST', tracking_carrier: null, tracking_url: 'javascript:alert(1)',
    }).trackingUrl).toBeUndefined();
  });
});