import { useSyncExternalStore } from "react";

/** Coordenação apenas visual. Não lê/grava consentimento, analytics ou dados comerciais. */
export const CONSENT_LAYER = 1;
export const CAMPAIGN_LAYER = 2;
export const MODAL_LAYER = 4;

const consentSelector = '[data-storefront-layer="consent"]';
const campaignSelector = '[data-storefront-layer="campaign"]';
const modalSelector = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"]:not([data-state="closed"])';
const watched = '[data-storefront-layer], [role="dialog"], [role="alertdialog"], [aria-modal]';

export function readStorefrontLayers(): number {
  if (typeof document === "undefined") return 0;
  return (document.querySelector(consentSelector) ? CONSENT_LAYER : 0)
    | (document.querySelector(campaignSelector) ? CAMPAIGN_LAYER : 0)
    | (document.querySelector(modalSelector) ? MODAL_LAYER : 0);
}

const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;
let snapshot = 0;
const isLayerNode = (node: Node) => node instanceof Element && (node.matches(watched) || !!node.querySelector(watched));

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observer && typeof document !== "undefined" && document.body) {
    snapshot = readStorefrontLayers();
    // Um observador compartilhado apenas para montagem/estado de camadas;
    // ignora as mutações de estilo, animação, texto e catálogo.
    observer = new MutationObserver(records => {
      if (!records.some(record => record.type === "attributes"
        ? (record.target instanceof Element && record.target.matches(watched)) || record.attributeName !== "data-state"
        : [...record.addedNodes, ...record.removedNodes].some(isLayerNode))) return;
      const next = readStorefrontLayers();
      if (next === snapshot) return;
      snapshot = next;
      listeners.forEach(notify => notify());
    });
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-storefront-layer", "data-state", "role", "aria-modal"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

export const useStorefrontLayers = () => useSyncExternalStore(subscribe, readStorefrontLayers, () => 0);
