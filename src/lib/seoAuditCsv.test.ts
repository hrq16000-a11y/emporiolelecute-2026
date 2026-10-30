import { describe, expect, it } from 'vitest';
import { buildAuditCsvRows, downloadAuditCsv, issueCode, slugFromUrl } from './seoAuditCsv';
import { toCsv } from './seoExport';

const site = {
  checks: [
    { name: 'sitemap_reachable', ok: true, detail: 'HTTP 200', severity: 'info' as const },
    { name: 'robots_has_sitemap', ok: false, detail: 'robots.txt sem Sitemap:', severity: 'error' as const },
  ],
};

const products = {
  products: [
    {
      slug: 'kit-baby-shower',
      url: 'https://emporiolelecute.com.br/produto/kit-baby-shower',
      issues: [{ severity: 'error' as const, code: 'image_missing', detail: 'Sem imagem — og:image quebra.' }],
    },
    {
      slug: 'difusor-lavanda',
      url: 'https://emporiolelecute.com.br/produto/difusor-lavanda',
      issues: [],
    },
  ],
};

const feed = {
  items: [
    {
      id: 'SKU-9',
      title: 'Difusor',
      link: 'https://emporiolelecute.com.br/produto/difusor-lavanda',
      issues: [{ severity: 'warn' as const, code: 'title_short', detail: 'Título curto (12 caracteres).' }],
    },
  ],
};

const index = {
  pages: [
    {
      kind: 'theme_hub',
      path: '/ocasioes/baby-shower',
      url: 'https://emporiolelecute.com.br/ocasioes/baby-shower',
      status: 200,
      canonical: 'https://emporiolelecute.com.br/ocasioes/baby-shower-2',
      indexable: true,
      issues: ['Canonical divergente: https://emporiolelecute.com.br/ocasioes/baby-shower-2'],
    },
    {
      kind: 'core',
      path: '/loja',
      url: 'https://emporiolelecute.com.br/loja',
      status: 200,
      canonical: 'https://emporiolelecute.com.br/loja',
      indexable: true,
      issues: [],
    },
  ],
};

describe('slugFromUrl', () => {
  it('takes the last path segment without query, hash or trailing slash', () => {
    expect(slugFromUrl('https://emporiolelecute.com.br/produto/kit-baby?utm=1#x')).toBe('kit-baby');
    expect(slugFromUrl('/ocasioes/baby-shower/')).toBe('baby-shower');
    expect(slugFromUrl(null)).toBe('');
  });
});

describe('issueCode', () => {
  it('derives a stable code from a free-text divergence reason', () => {
    expect(issueCode('Canonical divergente: https://x/y')).toBe('canonical_divergente');
    expect(issueCode('')).toBe('divergencia');
  });
});

describe('buildAuditCsvRows', () => {
  const rows = buildAuditCsvRows({ site, products, feed, index });

  it('keeps one row per finding with status, slug and reason', () => {
    const missingImage = rows.find((r) => r.codigo === 'image_missing');
    expect(missingImage).toMatchObject({
      auditoria: 'produtos',
      status: 'erro',
      slug: 'kit-baby-shower',
      motivo: 'Sem imagem — og:image quebra.',
    });

    const shortTitle = rows.find((r) => r.codigo === 'title_short');
    expect(shortTitle).toMatchObject({
      auditoria: 'feed-merchant',
      status: 'aviso',
      slug: 'difusor-lavanda',
    });
  });

  it('reports the canonical divergence with the page slug as the reason', () => {
    const drift = rows.find((r) => r.auditoria === 'indexabilidade' && r.slug === 'baby-shower');
    expect(drift).toMatchObject({
      status: 'aviso',
      codigo: 'canonical_divergente',
      motivo: 'Canonical divergente: https://emporiolelecute.com.br/ocasioes/baby-shower-2',
    });
  });

  it('marks clean items as ok instead of dropping them', () => {
    expect(rows.find((r) => r.slug === 'difusor-lavanda' && r.auditoria === 'produtos')?.status).toBe('ok');
    expect(rows.find((r) => r.slug === 'loja')?.status).toBe('ok');
  });

  it('sorts errors before warnings and warnings before ok', () => {
    const statuses = rows.map((r) => r.status);
    const firstOk = statuses.indexOf('ok');
    const lastErro = statuses.lastIndexOf('erro');
    const lastAviso = statuses.lastIndexOf('aviso');
    expect(lastErro).toBeLessThan(firstOk);
    expect(lastAviso).toBeLessThan(firstOk);
  });

  it('returns nothing when no audit ran', () => {
    expect(buildAuditCsvRows({})).toEqual([]);
  });
});

describe('CSV serialization', () => {
  it('quotes reasons containing commas or quotes', () => {
    const csv = toCsv(buildAuditCsvRows({ products: { products: [
      { slug: 'a', url: 'u', issues: [{ severity: 'error', code: 'x', detail: 'Falta 1 imagem, 2 imagens, "mínimo"' }] },
    ] } }));
    expect(csv.split('\n')[1]).toContain('"Falta 1 imagem, 2 imagens, ""mínimo"""');
  });
});

describe('downloadAuditCsv', () => {
  it('returns 0 and writes nothing when there are no rows', () => {
    expect(downloadAuditCsv([])).toBe(0);
  });
});
