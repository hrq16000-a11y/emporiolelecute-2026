import { useSyncExternalStore } from 'react';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';
const consentKey = 'elc_cookie_consent';
const consentEvent = 'elc:consent-change';
export const consentPreferencesEvent = 'elc:consent-preferences';

export const getConsentStatus = (): ConsentStatus => {
  try {
    const value = window.localStorage.getItem(consentKey);
    return value === 'accepted' || value === 'rejected' ? value : 'pending';
  } catch {
    return 'pending';
  }
};

export const hasOptionalConsent = () => getConsentStatus() === 'accepted';

export const recordConsent = (accepted: boolean) => {
  try {
    window.localStorage.setItem(consentKey, accepted ? 'accepted' : 'rejected');
    if (!accepted) {
      window.localStorage.removeItem('elc_visitor_id');
      window.localStorage.removeItem('elc_visitor_credential');
      window.sessionStorage.removeItem('__pdp_funnel_sid__');
    }
  } catch { /* Unavailable storage never enables optional tracking. */ }
  window.dispatchEvent(new Event(consentEvent));
};

const subscribe = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && (event.key === consentKey || event.key === null)) onChange();
  };
  window.addEventListener(consentEvent, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(consentEvent, onChange);
    window.removeEventListener('storage', onStorage);
  };
};

export const useCookieConsent = () => useSyncExternalStore(subscribe, getConsentStatus, () => 'pending' as const);
export const openConsentPreferences = () => window.dispatchEvent(new Event(consentPreferencesEvent));