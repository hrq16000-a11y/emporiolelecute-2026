// Captures Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and stores them as
// telemetry rows so admins can see real-user performance trends in the same
// table they already use for errors. We piggyback on `stale_bundle_logs` to
// avoid creating yet another table; the message is tagged so the telemetry
// viewer can distinguish vitals events from errors.
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";
import { getTelemetryCorrelationId } from "./telemetry";
import { redactTrackingText } from './tracking-privacy';

const sent = new Set<string>();

function rating(metric: Metric): "good" | "needs-improvement" | "poor" {
  return metric.rating;
}

async function report(metric: Metric) {
  // De-dupe per session/metric so we only persist the latest value once.
  const key = `${metric.name}`;
  if (sent.has(key)) return;
  sent.add(key);

  const cid = getTelemetryCorrelationId();
  const route = typeof location !== "undefined" ? redactTrackingText(location.pathname) : "";
  const message =
    `[cid:${cid.slice(0, 8)}] [web-vital][${metric.name}] ` +
    `${metric.value.toFixed(2)} (${rating(metric)})`;
  const stack = JSON.stringify(
    {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "",
    },
    null,
    2
  );

  try {
    await (supabase as any).from("stale_bundle_logs").insert({
      route,
      message: message.slice(0, 2000),
      stack: stack.slice(0, 8000),
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 1000) : "",
      reloaded: false,
    });
  } catch {
    /* best-effort */
  }
}

let installed = false;

export function installWebVitals() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    /* swallow — vitals must never break the app */
  }
}
