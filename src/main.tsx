import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installChunkReloadHandler } from "./lib/chunkReload";
import { runCacheCleanup } from "./lib/cacheCleanup";
import { installTelemetry } from "./lib/telemetry";
import { installWebVitals } from "./lib/webVitals";
import { installSeoFallbacks } from "./lib/seoFallbacks";
import RootErrorBoundary from "./components/RootErrorBoundary";

installChunkReloadHandler();
installTelemetry();
installWebVitals();
installSeoFallbacks(document.head);
runCacheCleanup();

// Auditoria automática de acessibilidade (contraste + foco visível) apenas em dev.
// Roda fora da árvore React, reporta no console e não vai para o bundle de produção.
if (import.meta.env.DEV) {
  void (async () => {
    try {
      const [{ default: React }, ReactDOM, axe] = await Promise.all([
        import("react"),
        import("react-dom"),
        import("@axe-core/react"),
      ]);
      // 1000ms debounce evita flood durante navegação/rerenders.
      // Regras focadas em contraste e foco — alinhadas ao pedido do produto.
      await axe.default(React, ReactDOM, 1000, {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "focus-order-semantics", enabled: true },
          { id: "button-name", enabled: true },
          { id: "link-name", enabled: true },
        ],
      });
    } catch {
      /* silencioso — não bloquear dev se algo falhar */
    }
  })();
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </RootErrorBoundary>
);

