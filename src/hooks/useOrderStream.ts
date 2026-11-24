import { useEffect, useRef, useState } from "react";
import { readOrderStreamEvents } from '@/lib/order-stream-events';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const RECONNECT_MS = 8000;

interface UseOrderStreamOptions {
  /** Código do pedido; quando vazio, nenhuma conexão é aberta. */
  orderCode?: string | null;
  /** Desliga o stream (ex.: pedido entregue/cancelado). */
  enabled?: boolean;
  /** Chamado quando o backend sinaliza qualquer mudança no pedido. */
  onUpdate: () => void;
}

/**
 * Conexão SSE com o status do pedido em tempo real.
 * Retorna `connected` para que a página possa reduzir/desligar o polling —
 * o polling continua ativo como fallback quando o SSE não conecta.
 */
export const useOrderStream = ({ orderCode, enabled = true, onUpdate }: UseOrderStreamOptions) => {
  const [connected, setConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!orderCode || !enabled) {
      setConnected(false);
      return;
    }
    if (typeof window === "undefined" || typeof ReadableStream === "undefined") {
      setConnected(false);
      return;
    }

    let controller: AbortController | null = null;
    let retry: number | undefined;
    let disposed = false;

    const connect = async () => {
      if (disposed) return;
      controller = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        const response = await fetch(`${FUNCTIONS_BASE}/order-stream`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ code: orderCode }), signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok || !response.body) return;
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!disposed) {
          const { done, value } = await reader.read();
          if (done) break;
          const parsed = readOrderStreamEvents(buffer + decoder.decode(value, { stream: true }));
          buffer = parsed.remainder;
          for (const event of parsed.events) {
            if (disposed) break;
            setConnected(true);
            if (event === 'status') onUpdateRef.current();
          }
        }
      } catch { /* polling remains active while the stream is unavailable */ }
      finally {
        reader?.releaseLock();
        if (!disposed) {
          setConnected(false);
          retry = window.setTimeout(() => { void connect(); }, RECONNECT_MS);
        }
      }
    };

    void connect();

    return () => {
      disposed = true;
      setConnected(false);
      if (retry) window.clearTimeout(retry);
      controller?.abort();
    };
  }, [orderCode, enabled]);

  return { connected };
};
