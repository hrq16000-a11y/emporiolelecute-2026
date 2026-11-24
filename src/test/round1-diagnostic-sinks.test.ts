import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportError } from '@/lib/errorReporting';

const fixtures = vi.hoisted(() => ({ insert: vi.fn(async () => ({})), reporters: {} as Record<string, (metric: unknown) => Promise<void>> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: fixtures.insert }) } }));
vi.mock('@/lib/telemetry', () => ({ getTelemetryCorrelationId: () => 'synthetic-correlation' }));
vi.mock('web-vitals', () => Object.fromEntries(['CLS', 'INP', 'LCP', 'FCP', 'TTFB'].map(name => [
  `on${name}`, (report: (metric: unknown) => Promise<void>) => { fixtures.reporters[name] = report; },
])));

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); });

describe('Round 1 diagnostic sinks', () => {
  it('reportError sends sanitized context and retains its support correlation ID', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = reportError('checkout', new Error('Failure LCABC123'), { orderCode: 'LCABC123', status: 500 });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain('LCABC123');
    expect(logged).toContain(result.correlationId);
    expect(log.mock.calls[0][1]).toMatchObject({ status: 500 });
  });
  it('Web Vitals persists the route without the order capability', async () => {
    window.history.replaceState({}, '', '/rastrear/LCABCDEFGHIJKLMNOPQR');
    const { installWebVitals } = await import('@/lib/webVitals');
    installWebVitals();
    const report = fixtures.reporters.LCP;
    if (!report) throw new Error('Metric reporter not registered');
    await report({ name: 'LCP', value: 100, rating: 'good', delta: 100, id: 'metric-id', navigationType: 'navigate' });
    expect(fixtures.insert).toHaveBeenCalledWith(expect.objectContaining({ route: '/rastrear' }));
    expect(JSON.stringify(fixtures.insert.mock.calls)).not.toContain('LCABCDEFGHIJKLMNOPQR');
  });
  it('analytics wrappers omit nested capabilities and suppress events on tracking routes', async () => {
    const { event, fbEvent } = await import('@/lib/analytics');
    const gtag = vi.fn(); const fbq = vi.fn();
    window.gtag = gtag; window.fbq = fbq;
    event('diagnostic', { nested: { order_code: 'LCABC123' }, link_to: '/rastrear/LCABC123', status: 500 });
    expect(JSON.stringify(gtag.mock.calls)).not.toContain('LCABC123');
    expect(gtag.mock.calls[0][2]).toMatchObject({ status: 500 });
    window.history.replaceState({}, '', '/rastrear/LCABC123');
    gtag.mockClear();
    event('diagnostic'); fbEvent('Contact');
    expect(gtag).not.toHaveBeenCalled(); expect(fbq).not.toHaveBeenCalled();
    delete window.gtag; delete window.fbq;
  });
});