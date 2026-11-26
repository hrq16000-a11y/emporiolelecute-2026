import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Normalizes public URLs and keeps a single canonical tag even when Helmet
 * inserts route metadata after the router effect (for example after SEO config
 * finishes loading). Admin URLs are intentionally left untouched.
 */
const TRACKING_PARAMS = [
  "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid", "ref", "_ga", "yclid",
];
const ORIGIN = "https://emporiolelecute.com.br";

function cleanSearch(search: string): string {
  if (!search) return "";
  const params = new URLSearchParams(search);
  const toDelete: string[] = [];
  params.forEach((_v, k) => {
    if (k.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.includes(k.toLowerCase())) {
      toDelete.push(k);
    }
  });
  toDelete.forEach((k) => params.delete(k));
  const out = params.toString();
  return out ? `?${out}` : "";
}

function cleanPath(pathname: string): string {
  if (pathname.startsWith("/admin")) return pathname;
  let path = pathname.toLowerCase();
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  return path;
}

/** Prefer Helmet's route-specific canonical; otherwise maintain our fallback. */
function setCanonical(url: string) {
  const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
  const helmetLink = links.find((link) => link.dataset.rh === "true");
  if (helmetLink) {
    links.filter((link) => link !== helmetLink).forEach((link) => link.remove());
    return;
  }

  const [canonical, ...duplicates] = links;
  duplicates.forEach((link) => link.remove());
  const target = canonical ?? document.createElement("link");
  if (!canonical) {
    target.rel = "canonical";
    document.head.appendChild(target);
  }
  target.href = url;
}

export default function CanonicalNormalizer() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cleanedPath = cleanPath(location.pathname);
    const cleanedSearch = cleanSearch(location.search);
    if (cleanedPath !== location.pathname || cleanedSearch !== location.search) {
      navigate(`${cleanedPath}${cleanedSearch}${location.hash}`, { replace: true });
      return;
    }

    const canonicalUrl = `${ORIGIN}${cleanedPath}`;
    setCanonical(canonicalUrl);

    // Helmet may mount later than this effect when its SEO query resolves.
    // Observe only head child insertions; deduplication is idempotent.
    const observer = new MutationObserver(() => setCanonical(canonicalUrl));
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
