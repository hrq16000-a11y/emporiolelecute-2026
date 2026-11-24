// A browser secret derives its public identifier; possession of a UUID alone
// cannot authorize legacy records or another browser's activity.
export const visitorCredentialKey = 'elc_visitor_credential';
export const isVisitorCredential = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export const deriveVisitorId = async (credential: string): Promise<string> => {
  if (!isVisitorCredential(credential)) throw new Error('Invalid visitor credential');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lelecute:visitor:v1:${credential}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const ownsVisitorId = async (id: string, credential: unknown): Promise<boolean> =>
  isVisitorCredential(credential) && await deriveVisitorId(credential) === id;