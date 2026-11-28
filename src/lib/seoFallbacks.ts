/** React 19 hoists route metadata without removing the static HTML defaults.
 * Keep the entry HTML useful without JavaScript, but never let its marked
 * fallbacks compete with route-owned titles or social/search descriptions.
 * Only the explicitly marked elements are detached; other metadata (including
 * verification tokens, robots, canonical, JSON-LD and preloads) is untouched.
 */
const selector = "title, meta[name], meta[property]";
const fallbackAttr = "data-seo-fallback";

function metadataKey(element: Element): string | null {
  if (element.tagName === "TITLE") return "title";
  const property = element.getAttribute("property");
  const name = element.getAttribute("name");
  if (property) return `property:${property.toLowerCase()}`;
  if (name) return `name:${name.toLowerCase()}`;
  return null;
}

export function installSeoFallbacks(head: HTMLHeadElement): () => void {
  const fallbacks = Array.from(head.querySelectorAll(`[${fallbackAttr}]`));
  if (!fallbacks.length) return () => {};

  const reconcile = () => {
    const owned = new Set(
      Array.from(head.querySelectorAll(selector))
        .filter((element) => !element.hasAttribute(fallbackAttr))
        .map(metadataKey),
    );
    for (const fallback of fallbacks) {
      const key = metadataKey(fallback);
      if (!key) continue;
      if (owned.has(key)) {
        if (fallback.parentNode === head) fallback.remove();
      } else if (fallback.parentNode !== head) {
        head.append(fallback);
      }
    }
  };

  // Watch only direct head children (not the page or its image carousel).
  // Reconcile after React mounts/unmounts metadata in a route transition.
  const observer = new MutationObserver(reconcile);
  observer.observe(head, { childList: true });
  reconcile();
  return () => observer.disconnect();
}
