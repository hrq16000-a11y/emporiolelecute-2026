import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getConsentStatus, hasOptionalConsent, recordConsent, useCookieConsent } from '@/lib/cookie-consent';
import { event, fbEvent, trackFunnelEvent } from '@/lib/analytics';
import { markLead } from '@/lib/visitor';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { webcrypto } from 'node:crypto';
import { waitFor } from '@testing-library/react';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.gtag; delete window.fbq; });

describe('Round 2 optional consent boundaries', () => {
  it('blocks optional cookies and events when consent is absent', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    window.gtag = vi.fn(); window.fbq = vi.fn();
    event('purchase'); fbEvent('Lead'); trackFunnelEvent('pdp_whatsapp_click'); await markLead('quote');
    expect(getConsentStatus()).toBe('pending');
    expect(fetch).not.toHaveBeenCalled(); expect(window.gtag).not.toHaveBeenCalled(); expect(window.fbq).not.toHaveBeenCalled();
  });
  it.each(['true', 'false', '{"accepted":true}', 'corrupted', ''])('fails closed for invalid stored consent %s', value => {
    localStorage.setItem('elc_cookie_consent', value);
    expect(getConsentStatus()).toBe('pending'); expect(hasOptionalConsent()).toBe(false);
  });
  it('respects an explicit refusal', () => {
    recordConsent(false);
    window.gtag = vi.fn(); event('purchase');
    expect(getConsentStatus()).toBe('rejected'); expect(window.gtag).not.toHaveBeenCalled();
  });
  it('allows optional events only after acceptance', () => {
    recordConsent(true); window.gtag = vi.fn(); event('view_item', { value: 9.99 });
    expect(window.gtag).toHaveBeenCalledWith('event', 'view_item', { value: 9.99 });
  });
  it('revokes optional identifiers while preserving the cart', () => {
    recordConsent(true); localStorage.setItem('elc_visitor_id', 'synthetic'); localStorage.setItem('elc_visitor_credential', 'synthetic'); sessionStorage.setItem('__pdp_funnel_sid__', 'synthetic');
    localStorage.setItem('emporio-cart-storage', 'synthetic-cart'); recordConsent(false);
    expect(localStorage.getItem('elc_visitor_id')).toBeNull(); expect(sessionStorage.getItem('__pdp_funnel_sid__')).toBeNull();
    expect(localStorage.getItem('elc_visitor_credential')).toBeNull();
    expect(localStorage.getItem('emporio-cart-storage')).toBe('synthetic-cart');
  });
  it('discards queued analytics when consent is revoked before sending', () => {
    vi.useFakeTimers(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    recordConsent(true); trackFunnelEvent('pdp_whatsapp_click'); recordConsent(false); vi.advanceTimersByTime(4000);
    expect(fetch).not.toHaveBeenCalled(); vi.useRealTimers();
  });
  it('reacts to acceptance and refuses messages from other origins as consent', () => {
    const { result } = renderHook(useCookieConsent);
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://other.invalid', data: { consent: 'accepted' } })));
    expect(result.current).toBe('pending');
    act(() => recordConsent(true)); expect(result.current).toBe('accepted');
    act(() => recordConsent(false)); expect(result.current).toBe('rejected');
  });
  it('does not create visitor IDs or send pageviews before consent, and resumes on acceptance', async () => {
    const fetch = vi.fn(async () => new Response('{}')); vi.stubGlobal('fetch', fetch);
    const { unmount } = renderHook(useVisitorTracking, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    expect(fetch).not.toHaveBeenCalled(); expect(localStorage.getItem('elc_visitor_id')).toBeNull();
    act(() => recordConsent(true));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const bodies = fetch.mock.calls.map(call => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)));
    expect(bodies.map(body => body.event)).toEqual(['init', 'pageview']);
    act(() => recordConsent(false)); fetch.mockClear();
    window.dispatchEvent(new Event('pagehide')); expect(fetch).not.toHaveBeenCalled();
    unmount();
  });
});