import { expect, it } from 'vitest';
import { exportWebVitalsCsv } from './web-vitals-export';
it('neutralizes spreadsheet formulas in imported report labels', () => {
  const csv = exportWebVitalsCsv([{ id: 'r', label: '=HYPERLINK("evil")', created_at: '2026-11-09', base_url: null, notes: null, pages: [{ name: '@SUM(1)', lcp: 123 }] }]);
  expect(csv).toContain('"\'=HYPERLINK(""evil"")"');
  expect(csv).toContain('"\'@SUM(1)"');
  expect(csv).toContain('"123"');
});