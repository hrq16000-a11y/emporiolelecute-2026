import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Normalizes URLs for SEO consistency:
 *  - strips trailing slash (except root)
 *  - removes known tracking params (utm_*, fbclid, gclid, msclkid, mc_cid, mc_eid, ref, _ga)
 *  - lowercases the pathname for case-insensitive routes
 *
 * Uses a 301-equivalent client-side replace (no history entry) and updates
 * the <link rel="canonical"> tag to match the cleaned URL.
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
  let p = pathname;
  // skip admin/api
  if (p.startsWith("/admin")) return p;
  // lowercase
  p = p.toLowerCase();
  // strip trailing slash (except root)
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p;
}

export default function CanonicalNormalizer() {
  const location = useLocation();
  const navigate = useNavigate();

  const cleanedPath = cleanPath(location.pathname);
  const cleanedSearch = cleanSearch(location.search);

  useEffect(() => {
    const needsRedirect =
      cleanedPath !== location.pathname || cleanedSearch !== location.search;

    if (needsRedirect) {
      navigate(`${cleanedPath}${cleanedSearch}${location.hash}`, { replace: true });
    }
  }, [cleanedPath, cleanedSearch, location.pathname, location.search, location.hash, navigate]);

  // The fallback and route-specific canonical share a single Helmet owner.
  // Later route metadata can override this fallback without a DOM/timer race.
  return (
    <Helmet>
      <link rel="canonical" href={`${ORIGIN}${cleanedPath}`} />
    </Helmet>
  );
}
