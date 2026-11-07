import { expect, it } from 'vitest';
import { parseSitemapStatus } from './sitemap-status';
it('counts page URLs rather than image URLs', () => expect(parseSitemapStatus('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://example.com</loc><image:image><image:loc>https://example.com/a.jpg</image:loc></image:image></url></urlset>').count).toBe(1));
it('rejects an HTML fallback instead of reporting zero URLs', () => expect(() => parseSitemapStatus('<html><body>not a sitemap</body></html>')).toThrow());