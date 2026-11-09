/**
 * Detects hashed Vite main bundle in same-origin HTML.
 * A changed path indicates a newly deployed version, not a catalog update.
 */
export const getEntryScriptPath = (html: string): string | null => {
  const script = html.match(/<script\b[^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["'][^>]*>/i);
  if (!script) return null;
  try {
    return new URL(script[1], "https://emporiolelecute.com.br").pathname;
  } catch {
    return null;
  }
};
