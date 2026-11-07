export const parseSitemapStatus = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'urlset') throw new Error('O endereço não retornou um sitemap XML válido.');
  return { count: doc.getElementsByTagNameNS('*', 'url').length, generatedAt: xml.match(/lovable:sitemap-generated-at\s+([^\s<]+)/)?.[1] ?? null };
};