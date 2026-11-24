const allowedOrigins = new Set([
  'https://emporiolelecute.com.br',
  'https://www.emporiolelecute.com.br',
  'https://emporiolelecute.lovable.app',
]);

export const safeIndexationUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!allowedOrigins.has(url.origin) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
};

export const parseIndexationRequest = (body: unknown): { urls: string[]; limit: number } | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const limit = input.limit ?? 100;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 200) return null;
  if (input.urls !== undefined && (!Array.isArray(input.urls) || input.urls.length > 200)) return null;
  const urls: string[] = [];
  for (const value of (input.urls ?? []) as unknown[]) {
    const safe = safeIndexationUrl(value);
    if (!safe) return null;
    urls.push(safe);
  }
  return { urls: [...new Set(urls)], limit };
};