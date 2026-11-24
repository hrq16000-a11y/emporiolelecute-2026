// Shared browser capability and optional lead tracking.
import { hasOptionalConsent } from './cookie-consent';
import { deriveVisitorId, isVisitorCredential, visitorCredentialKey } from '../../supabase/functions/_shared/visitor-capability';

const STORAGE_KEY = "elc_visitor_id";

export async function getVisitorIdentity(): Promise<{ visitor_id: string; visitor_credential: string } | null> {
  if (!hasOptionalConsent() || typeof window === 'undefined') return null;
  try {
    let credential = localStorage.getItem(visitorCredentialKey);
    if (!isVisitorCredential(credential)) {
      credential = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(visitorCredentialKey, credential);
      localStorage.removeItem(STORAGE_KEY);
    }
    const visitorId = await deriveVisitorId(credential);
    // Consent revocation or another tab rotating the secret cancels queued work.
    if (!hasOptionalConsent() || localStorage.getItem(visitorCredentialKey) !== credential) return null;
    localStorage.setItem(STORAGE_KEY, visitorId);
    return { visitor_id: visitorId, visitor_credential: credential };
  } catch { return null; }
}

export function getVisitorId(): string | null {
  if (!hasOptionalConsent()) return null;
  if (typeof window === "undefined") return null;
  try {
    return isVisitorCredential(localStorage.getItem(visitorCredentialKey)) ? localStorage.getItem(STORAGE_KEY) : null;
  } catch { return null; }
}

// Marca o visitante atual como lead. Idempotente e silencioso em caso de erro.
export async function markLead(trigger: string): Promise<void> {
  if (!hasOptionalConsent()) return;
  const identity = await getVisitorIdentity();
  if (!identity || !hasOptionalConsent()) return;
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...identity, event: "lead", lead_trigger: trigger }),
      keepalive: true,
    });
  } catch {
    // silencioso — não pode bloquear UX
  }
}
