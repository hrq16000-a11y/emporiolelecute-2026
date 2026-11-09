import { useEffect, useState } from "react";

const StaleBundleOverlay = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onStale = () => setOpen(true);
    window.addEventListener("lov:stale-bundle", onStale);
    return () => window.removeEventListener("lov:stale-bundle", onStale);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-6 text-center space-y-4">
        <h2 className="text-xl font-display text-foreground">Nova versão disponível</h2>
        <p className="text-sm text-muted-foreground">
          Detectamos uma atualização do site. Clique para recarregar e continuar.
        </p>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem("lov_chunk_reload_at");
            } catch {}
            location.reload();
          }}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium hover:opacity-90 transition"
        >
          Atualizar / Recarregar
        </button>
      </div>
    </div>
  );
};

export default StaleBundleOverlay;
