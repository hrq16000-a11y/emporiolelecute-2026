/** Tracking capabilities must never become analytics or diagnostic payloads. */
export const isTrackingPath = (path: string): boolean => /^\/rastrear(?:\/|$)/.test(path.split(/[?#]/)[0]);

export const redactTrackingText = (value: string): string => value
  .replace(/(?:%[0-9a-f]{2})+/gi, token => { try { return decodeURIComponent(token); } catch { return '[encoded value omitted]'; } })
  .replace(/\/rastrear(?:\/[^\s?#"']*)?(?:\?[^\s"']*)?/gi, '/rastrear')
  .replace(/([?&](?:code|orderCode|order_code)=)[^&\s"']*/gi, '$1[redacted]')
  .replace(/\bLC[A-Z0-9]{6,18}\b/gi, '[tracking code omitted]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email omitted]');

/** Normalize errors and nested context before any diagnostic or analytics sink. */
export const sanitizeDiagnosticValue = (value: unknown, seen = new WeakSet<object>(), depth = 0): unknown => {
  if (typeof value === 'string') return redactTrackingText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 8 || seen.has(value)) return '[omitted]';
  seen.add(value);
  if (value instanceof Error) return {
    name: redactTrackingText(value.name), message: redactTrackingText(value.message),
    stack: redactTrackingText(value.stack || ''),
    cause: sanitizeDiagnosticValue('cause' in value ? value.cause : undefined, seen, depth + 1),
  };
  if (Array.isArray(value)) return value.map(item => sanitizeDiagnosticValue(item, seen, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /^(?:order_?code|order_?id|tracking_?(?:code|url)|visitor_?(?:id|credential)|user_?id|customer_.*|email|phone|address.*|authorization|token|subscription|endpoint|p256dh|auth)$/i.test(key)
      ? '[omitted]' : sanitizeDiagnosticValue(item, seen, depth + 1),
  ]));
};