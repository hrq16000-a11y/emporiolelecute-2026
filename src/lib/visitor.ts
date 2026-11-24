// Helpers compartilhados de visitante (id local + promoção a lead).
import { hasOptionalConsent } from './cookie-consent';

const STORAGE_KEY = "elc_visitor_id";

export function getVisitorId(): string | null {
  if (!hasOptionalConsent()) return null;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Marca o visitante atual como lead. Idempotente e silencioso em caso de erro.
export async function markLead(trigger: string): Promise<void> {
  if (!hasOptionalConsent()) return;
  const visitorId = getVisitorId();
  if (!visitorId) return;
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId, event: "lead", lead_trigger: trigger }),
      keepalive: true,
    });
  } catch {
    // silencioso — não pode bloquear UX
  }
}
