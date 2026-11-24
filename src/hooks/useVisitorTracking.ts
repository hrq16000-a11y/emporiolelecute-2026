// Optional visitor analytics starts only after explicit consent.
import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { parseUA } from "@/lib/uaParser";
import { redactTrackingText } from '@/lib/tracking-privacy';
import { hasOptionalConsent, useCookieConsent } from '@/lib/cookie-consent';
import { getVisitorIdentity } from '@/lib/visitor';
export { getConsentStatus, recordConsent } from '@/lib/cookie-consent';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`;

async function send(payload: Record<string, unknown>, useBeacon = false) {
  if (!hasOptionalConsent()) return;
  const identity = await getVisitorIdentity();
  if (!identity || !hasOptionalConsent()) return;
  const body = JSON.stringify({ ...payload, ...identity });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => { /* silencioso */ });
}

function buildDevicePayload() {
  const ua = navigator.userAgent;
  const uaInfo = parseUA(ua);
  return {
    ...uaInfo,
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    pixel_ratio: window.devicePixelRatio,
    color_depth: window.screen.colorDepth,
    language: navigator.language,
    languages: navigator.languages?.slice(0, 5),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touch_support: "ontouchstart" in window,
  };
}

export function useVisitorTracking() {
  const consent = useCookieConsent();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  const initialized = useRef(false);
  const pageStart = useRef<number>(Date.now());
  const lastHeartbeatAt = useRef<number>(Date.now()); // base para cálculo de delta
  const lastPath = useRef<string>("");

  // INIT — captura device + UTM + referrer (1x por carregamento)
  useEffect(() => {
    if (consent !== 'accepted') { initialized.current = false; lastPath.current = ''; return; }
    if (initialized.current) return;
    initialized.current = true;

    // Admin é exceção: continua sem trackear
    if (location.pathname.startsWith("/admin")) return;

    const search = new URLSearchParams(window.location.search);
    send({
      event: "init",
      device: buildDevicePayload(),
      utm: {
        utm_source: search.get("utm_source"),
        utm_medium: search.get("utm_medium"),
        utm_campaign: search.get("utm_campaign"),
        utm_term: search.get("utm_term"),
        utm_content: search.get("utm_content"),
      },
      referrer: redactTrackingText(document.referrer) || null,
      landing_path: redactTrackingText(location.pathname),
    });
  }, [consent, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // PAGEVIEW + flush de heartbeat ao mudar de rota
  useEffect(() => {
    if (consent !== 'accepted') return;
    if (location.pathname.startsWith("/admin")) return;

    // Flush do delta acumulado na página anterior antes de virar
    if (lastPath.current && lastPath.current !== location.pathname) {
      const deltaMs = Date.now() - lastHeartbeatAt.current;
      const delta = Math.max(1, Math.floor(deltaMs / 1000));
      send({
        event: "heartbeat",
        delta_seconds: delta,
        scroll_depth: Math.round((window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100),
      });
    }

    pageStart.current = Date.now();
    lastHeartbeatAt.current = Date.now();
    const fromPath = lastPath.current || null;
    lastPath.current = redactTrackingText(location.pathname);

    const productSlug = location.pathname.startsWith("/produto/") || location.pathname.startsWith("/produtos/")
      ? params.slug || location.pathname.split("/").pop()
      : undefined;

    // Reenvia device a cada pageview também (auto-heal de campos faltantes — barato)
    send({
      event: "pageview",
      path: redactTrackingText(location.pathname + location.search),
      title: document.title,
      product_slug: productSlug,
      referrer: redactTrackingText(document.referrer) || null,
      from_path: fromPath,
      device: buildDevicePayload(),
    });
  }, [location.pathname, location.search, params.slug, consent]);

  // Heartbeat periódico (30s) — envia DELTA acumulado
  useEffect(() => {
    if (consent !== 'accepted') return;
    if (location.pathname.startsWith("/admin")) return;
    const interval = setInterval(() => {
      if (!hasOptionalConsent() || document.visibilityState !== "visible") return;
      const deltaMs = Date.now() - lastHeartbeatAt.current;
      const delta = Math.max(1, Math.floor(deltaMs / 1000));
      if (delta < 5) return;
      send({
        event: "heartbeat",
        delta_seconds: delta,
        scroll_depth: Math.round((window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100),
      });
      lastHeartbeatAt.current = Date.now();
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname, consent]);

  // Heartbeat final ao sair / esconder a aba
  useEffect(() => {
    if (consent !== 'accepted') return;
    const onHide = () => {
      if (!hasOptionalConsent()) return;
      if (location.pathname.startsWith("/admin")) return;
      const deltaMs = Date.now() - lastHeartbeatAt.current;
      const delta = Math.max(1, Math.floor(deltaMs / 1000));
      if (delta < 1) return;
      send({
        event: "heartbeat",
        delta_seconds: delta,
        scroll_depth: Math.round((window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100),
      }, true);
      lastHeartbeatAt.current = Date.now();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
      else lastHeartbeatAt.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, [location.pathname, consent]);
}
