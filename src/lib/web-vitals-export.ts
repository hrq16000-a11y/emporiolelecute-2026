import type { WebVitalsReport } from '@/hooks/useWebVitalsReports';

export const exportWebVitalsCsv = (reports: WebVitalsReport[]) => {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = reports.flatMap(report => (report.pages ?? []).map(page => [report.id, report.label, report.created_at, page.name, page.score, page.lcp, page.cls, page.tbt, page.fcp].map(cell).join(',')));
  return '\uFEFF' + ['id,label,created_at,page,score,lcp,cls,tbt,fcp', ...rows].join('\r\n');
};