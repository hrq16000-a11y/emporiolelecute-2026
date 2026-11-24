export const buildBusinessSchema = (input: { origin: string; logo: string; description?: string; phone?: string; socialUrls?: string[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${input.origin}/#organization`,
  name: 'Empório LeleCute',
  url: input.origin,
  logo: { '@type': 'ImageObject', url: new URL(input.logo, input.origin).href },
  ...(input.description ? { description: input.description } : {}),
  ...(input.phone ? { telephone: input.phone } : {}),
  sameAs: [...new Set(input.socialUrls ?? [])].filter((value) => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  }).sort(),
  areaServed: { '@type': 'Country', name: 'Brasil' },
});