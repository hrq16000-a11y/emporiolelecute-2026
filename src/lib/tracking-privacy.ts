/** Tracking capabilities must never become analytics or diagnostic payloads. */
export const isTrackingPath = (path: string): boolean => /^\/rastrear(?:\/|$)/.test(path.split(/[?#]/)[0]);

export const redactTrackingText = (value: string): string => value
  .replace(/\/rastrear(?:\/[^\s?#"']*)?(?:\?[^\s"']*)?/gi, '/rastrear')
  .replace(/([?&](?:code|orderCode|order_code)=)[^&\s"']*/gi, '$1[redacted]')
  .replace(/\bLC[A-Z0-9]{6,18}\b/gi, '[tracking code omitted]');