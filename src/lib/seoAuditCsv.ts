/**
 * CSV export for the SEO audit results.
 *
 * Every audit finding becomes one row with: audit area, status, slug, URL and
 * the divergence reason (why the item is not clean). Pure functions only — no
 * network, no DOM — so the mapping is unit-testable.
 */
import { downloadFile, toCsv } from './seoExport';

export type AuditStatus = 'erro' | 'aviso' | 'ok';

export interface AuditCsvRow {
  auditoria: string;
  status: AuditStatus;
  slug: string;
  url: string;
  motivo: string;
  codigo: string;
}

interface IssueLike {
  severity: 'error' | 'warn';
  code: string;
  detail: string;
}
interface SiteCheckLike {
  name: string;
  ok: boolean;
  detail: string;
  severity: 'info' | 'warn' | 'error';
}
interface SiteLike {
  checks: SiteCheckLike[];
}
interface ProductLike {
  slug: string;
  url: string;
  issues: IssueLike[];
}
interface ProductsLike {
  products: ProductLike[];
}
interface FeedItemLike {
  id: string;
  title: string;
  link: string;
  issues: IssueLike[];
}
interface FeedLike {
  items: FeedItemLike[];
}
interface PageLike {
  kind: string;
  path: string;
  url: string;
  status: number;
  canonical: string | null;
  indexable: boolean;
  issues: string[];
}
interface IndexLike {
  pages: PageLike[];
}

export interface AuditCsvInput {
  site?: SiteLike | null;
  products?: ProductsLike | null;
  feed?: FeedLike | null;
  index?: IndexLike | null;
}

const STATUS_ORDER: Record<AuditStatus, number> = { erro: 0, aviso: 1, ok: 2 };

/** Last path segment of a URL/path, used as the item's slug. */
export const slugFromUrl = (value: string | null | undefined): string => {
  if (!value) return '';
  const clean = value
    .split('#')[0]
    .split('?')[0]
    .replace(/\/+$/, '')
    .toLowerCase();
  const seg = clean.split('/').pop() ?? '';
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
};

/** Stable machine code for a free-text issue, e.g. "Canonical divergente: x" -> "canonical_divergente". */
export const issueCode = (detail: string): string => {
  const head = detail.split(/[:—(]/)[0].trim().toLowerCase();
  const code = head.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return code || 'divergencia';
};

const severityStatus = (severity: 'error' | 'warn'): AuditStatus =>
  severity === 'error' ? 'erro' : 'aviso';

const sortRows = (rows: AuditCsvRow[]): AuditCsvRow[] =>
  [...rows].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.auditoria.localeCompare(b.auditoria) ||
      a.slug.localeCompare(b.slug) ||
      a.codigo.localeCompare(b.codigo),
  );

/**
 * Flatten every audit result into CSV rows.
 * Clean items are kept as `status: ok` so the file is a full audit report,
 * not only a list of failures.
 */
export function buildAuditCsvRows(input: AuditCsvInput): AuditCsvRow[] {
  const rows: AuditCsvRow[] = [];

  for (const check of input.site?.checks ?? []) {
    rows.push({
      auditoria: 'infraestrutura',
      status: check.ok ? 'ok' : check.severity === 'error' ? 'erro' : 'aviso',
      slug: '',
      url: '',
      motivo: check.detail,
      codigo: check.name,
    });
  }

  for (const product of input.products?.products ?? []) {
    if (product.issues.length === 0) {
      rows.push({
        auditoria: 'produtos',
        status: 'ok',
        slug: product.slug,
        url: product.url,
        motivo: '',
        codigo: '',
      });
      continue;
    }
    for (const issue of product.issues) {
      rows.push({
        auditoria: 'produtos',
        status: severityStatus(issue.severity),
        slug: product.slug,
        url: product.url,
        motivo: issue.detail,
        codigo: issue.code,
      });
    }
  }

  for (const item of input.feed?.items ?? []) {
    for (const issue of item.issues) {
      rows.push({
        auditoria: 'feed-merchant',
        status: severityStatus(issue.severity),
        slug: slugFromUrl(item.link) || item.id,
        url: item.link,
        motivo: issue.detail,
        codigo: issue.code,
      });
    }
  }

  for (const page of input.index?.pages ?? []) {
    const slug = slugFromUrl(page.path) || page.path;
    if (page.issues.length === 0) {
      rows.push({
        auditoria: 'indexabilidade',
        status: 'ok',
        slug,
        url: page.url,
        motivo: '',
        codigo: '',
      });
      continue;
    }
    for (const detail of page.issues) {
      rows.push({
        auditoria: 'indexabilidade',
        status: page.indexable ? 'aviso' : 'erro',
        slug,
        url: page.url,
        motivo: detail,
        codigo: issueCode(detail),
      });
    }
  }

  return sortRows(rows);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/**
 * Write the audit rows to a CSV download. A UTF-8 BOM keeps accents readable
 * when the file is opened in Excel (pt-BR locale).
 */
export function downloadAuditCsv(rows: AuditCsvRow[], name = 'auditoria-seo'): number {
  if (rows.length === 0) return 0;
  downloadFile(`${name}-${stamp()}.csv`, `\uFEFF${toCsv(rows)}`, 'text/csv');
  return rows.length;
}
