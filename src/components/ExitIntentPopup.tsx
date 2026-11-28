import { useEffect, useRef, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Gift, Package, Clock, X } from "lucide-react";
import { trackFunnelEvent } from "@/lib/analytics";
import { CONSENT_LAYER, readStorefrontLayers, useStorefrontLayers } from "@/lib/storefront-layers";

interface ExitIntentPopupProps {
  /** URL pronta para abrir o WhatsApp. Deve sempre refletir o estado atual (quantidade/personalização). */
  getWhatsappUrl: () => string;
  productName: string;
  productSlug: string;
  minQuantity: number;
  productionDays: number;
  quantity: number;
  personalized: boolean;
  enabled?: boolean;
  title?: string;
  description?: string;
  ctaLabel?: string;
  dismissLabel?: string;
  /** Máximo de exibições por sessão. */
  maxPerSession?: number;
  /** Tempo mínimo (minutos) entre exibições. */
  cooldownMinutes?: number;
  armDelayMs?: number;
}

const STATE_KEY = "__exit_intent_state__";

interface PopupState {
  shownCount: number;
  lastShown: number;
}

function readState(): PopupState {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return { shownCount: 0, lastShown: 0 };
    const parsed = JSON.parse(raw);
    return { shownCount: Number(parsed.shownCount) || 0, lastShown: Number(parsed.lastShown) || 0 };
  } catch {
    return { shownCount: 0, lastShown: 0 };
  }
}

function writeState(s: PopupState) {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export const ExitIntentPopup = ({
  getWhatsappUrl,
  productName,
  productSlug,
  minQuantity,
  productionDays,
  quantity,
  personalized,
  enabled = true,
  title = "Espera! Posso te ajudar?",
  description = "Antes de sair, fale com a gente no WhatsApp.",
  ctaLabel = "Falar no WhatsApp",
  dismissLabel = "Continuar navegando",
  maxPerSession = 1,
  cooldownMinutes = 30,
  armDelayMs = 8000,
}: ExitIntentPopupProps) => {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const layers = useStorefrontLayers();
  useEffect(() => {
    if (layers & CONSENT_LAYER) setOpen(false);
  }, [layers]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let armed = false;
    const armTimer = window.setTimeout(() => { armed = true; }, armDelayMs);

    const canShow = (reason: string): boolean => {
      const s = readState();
      const cooldownMs = cooldownMinutes * 60_000;
      if (s.shownCount >= maxPerSession) {
        trackFunnelEvent("exit_popup_blocked", { reason, rule: "max_per_session", product_slug: productSlug });
        return false;
      }
      if (s.lastShown && Date.now() - s.lastShown < cooldownMs) {
        trackFunnelEvent("exit_popup_blocked", { reason, rule: "cooldown", product_slug: productSlug });
        return false;
      }
      return true;
    };

    const trigger = (reason: "mouse_out" | "scroll_up") => {
      if (!armed || document.visibilityState !== "visible" || readStorefrontLayers() !== 0) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && (focused.matches("input, textarea, select, [role=combobox]") || focused.isContentEditable)) return;
      if (!canShow(reason)) return;
      const s = readState();
      writeState({ shownCount: s.shownCount + 1, lastShown: Date.now() });
      previousFocus.current = focused instanceof HTMLElement ? focused : null;
      setOpen(true);
      trackFunnelEvent("exit_popup_open", {
        reason,
        product_slug: productSlug,
        quantity,
        personalized,
      });
    };

    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      if (e.clientY <= 0) trigger("mouse_out");
    };

    let lastY = window.scrollY;
    let lastT = Date.now();
    const onScroll = () => {
      const now = Date.now();
      const dy = window.scrollY - lastY;
      const dt = now - lastT || 1;
      const speed = dy / dt;
      if (window.scrollY > 600 && speed < -1.4) trigger("scroll_up");
      lastY = window.scrollY;
      lastT = now;
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled, armDelayMs, cooldownMinutes, maxPerSession, productSlug, quantity, personalized]);

  const handleOpenChange = (next: boolean) => {
    if (!next && open) {
      trackFunnelEvent("exit_popup_close", { method: "dismiss", product_slug: productSlug });
    }
    setOpen(next);
  };

  const handleWhatsApp = () => {
    trackFunnelEvent("exit_popup_whatsapp_click", { product_slug: productSlug, quantity, personalized });
    const url = getWhatsappUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleDismiss = () => {
    trackFunnelEvent("exit_popup_close", { method: "continue", product_slug: productSlug });
    setOpen(false);
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" hideCloseButton onCloseAutoFocus={event => {
        const target = previousFocus.current;
        if (target?.isConnected && target !== document.body) {
          event.preventDefault();
          target.focus({ preventScroll: true });
        }
      }}>
        <DialogClose aria-label="Fechar sugestão de atendimento" className="absolute right-3 top-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>
        <DialogHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p className="font-semibold mb-2 truncate">{productName}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> mín. {minQuantity} un.</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {productionDays} dias</span>
          </div>
          <p className="text-xs">
            Sua seleção: <span className="font-medium text-foreground">{quantity} un.{personalized ? " · com personalização" : ""}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold"
          >
            <MessageCircle className="h-4 w-4 mr-2" /> {ctaLabel}
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            {dismissLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
