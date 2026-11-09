import { useEffect, useState } from "react";
import { getEntryScriptPath } from "@/lib/deploymentVersion";

// Um GET leve por meia hora, somente com aba visível. Não recarregar pedidos.
const VERSION_INTERVAL_MS = 30 * 60_000;
const isSensitiveRoute = () =>
  /^\/(admin|auth|login|checkout|carrinho|finalizar|pedido|orcamento|suporte)(\/|-|$)/.test(window.location.pathname);

const reload = () => {
  try { sessionStorage.removeItem("lov_chunk_reload_at"); } catch { /* storage opcional */ }
  window.location.reload();
};

const StaleBundleOverlay = () => {
  const [hardStale, setHardStale] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onStale = () => setHardStale(true);
    window.addEventListener("lov:stale-bundle", onStale);
    return () => window.removeEventListener("lov:stale-bundle", onStale);
  }, []);

  useEffect(() => {
    const currentEntry = document.querySelector<HTMLScriptElement>(
      'script[type="module"][src*="/assets/index-"]',
    )?.getAttribute("src");
    if (!currentEntry) return;

    const currentPath = new URL(currentEntry, window.location.origin).pathname;
    let active = true;
    let checking = false;
    let foundNewVersion = false;
    let lastCheckedAt = Date.now();

    const check = async () => {
      if (!active || checking || foundNewVersion || isSensitiveRoute() ||
          document.visibilityState !== "visible" ||
          Date.now() - lastCheckedAt < VERSION_INTERVAL_MS) return;
      lastCheckedAt = Date.now();
      checking = true;
      try {
        const response = await fetch("/", { cache: "no-store" });
        if (!response.ok) return;
        const nextPath = getEntryScriptPath(await response.text());
        if (active && nextPath && nextPath !== currentPath) {
          foundNewVersion = true;
          setUpdateAvailable(true);
        }
      } catch {
        // Sem conexão não significa que há uma nova versão.
      } finally {
        checking = false;
      }
    };

    const timer = window.setInterval(() => { void check(); }, VERSION_INTERVAL_MS);
    const onFocus = () => { void check(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (hardStale) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-6 text-center space-y-4">
          <h2 className="text-xl font-display text-foreground">Nova versão disponível</h2>
          <p className="text-sm text-muted-foreground">
            Detectamos uma atualização do site. Clique para recarregar e continuar.
          </p>
          <button onClick={reload} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:opacity-90 transition">
            Atualizar / Recarregar
          </button>
        </div>
      </div>
    );
  }

  // Aviso não modal: o cliente decide quando atualizar, sem perder formulário/carrinho.
  if (!updateAvailable || dismissed || isSensitiveRoute()) return null;
  return (
    <aside role="status" aria-live="polite" className="fixed bottom-24 left-4 z-[70] max-w-[min(23rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 text-foreground shadow-xl">
      <p className="text-sm font-semibold">Tem novidade na loja!</p>
      <p className="mt-1 text-xs text-muted-foreground">Uma versão atualizada está disponível.</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={reload} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Atualizar agora</button>
        <button type="button" onClick={() => setDismissed(true)} className="min-h-11 px-2 text-xs underline" aria-label="Adiar atualização da loja">Agora não</button>
      </div>
    </aside>
  );
};

export default StaleBundleOverlay;
