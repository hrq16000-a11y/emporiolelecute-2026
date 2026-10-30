import { describe, expect, it } from 'vitest';
import {
  matchClassFor,
  matchClassReason,
  summarizeAuditRows,
  type AuditSummaryRow,
} from './reviewAuditSummary';

const row = (over: Partial<AuditSummaryRow>): AuditSummaryRow => ({
  manual_status: 'pending',
  suggested_confidence: null,
  suggested_product_id: null,
  manual_product_id: null,
  imported_review_id: null,
  ...over,
});

describe('matchClassFor', () => {
  it('classifica score >= 0.75 como match forte', () => {
    expect(matchClassFor(1, 0.45)).toBe('strong');
    expect(matchClassFor(0.75, 0.45)).toBe('strong');
  });

  it('classifica score entre limiar e 0.75 como match fraco', () => {
    expect(matchClassFor(0.5, 0.45)).toBe('weak');
    expect(matchClassFor(0.45, 0.45)).toBe('weak');
  });

  it('classifica abaixo do limiar ou sem score como sem similaridade', () => {
    expect(matchClassFor(0.2, 0.45)).toBe('none');
    expect(matchClassFor(null, 0.45)).toBe('none');
    expect(matchClassFor(undefined, 0.45)).toBe('none');
    expect(matchClassFor(NaN, 0.45)).toBe('none');
  });

  it('respeita limiar customizado acima de 0.75', () => {
    expect(matchClassFor(0.8, 0.85)).toBe('none');
    expect(matchClassFor(0.86, 0.85)).toBe('weak');
    expect(matchClassFor(0.9, 0.85)).toBe('strong');
  });
});

describe('matchClassReason', () => {
  it('explica match forte com percentual', () => {
    expect(matchClassReason('strong', 0.92, 0.45)).toContain('92%');
  });

  it('explica ausência de candidato quando não há score', () => {
    expect(matchClassReason('none', null, 0.45)).toContain('Nenhum produto candidato');
  });

  it('explica match fraco como faixa entre limiar e corte forte', () => {
    const reason = matchClassReason('weak', 0.5, 0.45);
    expect(reason).toContain('45%');
    expect(reason).toContain('75%');
  });
});

describe('summarizeAuditRows', () => {
  it('conta por status e por classe de match', () => {
    const summary = summarizeAuditRows([
      row({ manual_status: 'confirmed', suggested_confidence: 0.9, suggested_product_id: 'p1' }),
      row({ manual_status: 'doubtful', suggested_confidence: 0.5, suggested_product_id: 'p2' }),
      row({ manual_status: 'no_match', suggested_confidence: 0.1 }),
      row({ manual_status: 'pending' }),
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byStatus.confirmed).toBe(1);
    expect(summary.byStatus.doubtful).toBe(1);
    expect(summary.byStatus.no_match).toBe(1);
    expect(summary.byStatus.pending).toBe(1);
    expect(summary.byStatus.rejected).toBe(0);
    expect(summary.byMatchClass).toEqual({ strong: 1, weak: 1, none: 2 });
  });

  it('conta prontas para importar: confirmada, com produto e ainda não importada', () => {
    const summary = summarizeAuditRows([
      row({ manual_status: 'confirmed', suggested_product_id: 'p1' }),
      row({ manual_status: 'confirmed', manual_product_id: 'p2', imported_review_id: 'r1' }),
      row({ manual_status: 'confirmed' }), // sem produto
      row({ manual_status: 'pending', suggested_product_id: 'p3' }),
    ]);
    expect(summary.readyToImport).toBe(1);
    expect(summary.alreadyImported).toBe(1);
    expect(summary.confirmedWithoutProduct).toBe(1);
  });

  it('retorna zeros para lista vazia', () => {
    const summary = summarizeAuditRows([]);
    expect(summary.total).toBe(0);
    expect(summary.readyToImport).toBe(0);
    expect(summary.byMatchClass).toEqual({ strong: 0, weak: 0, none: 0 });
  });
});
