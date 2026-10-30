// Resumo da auditoria de import de reviews (Elo7): contagens por status e por
// classe de match (forte / fraco / sem similaridade), usadas no painel admin
// para o admin entender o motivo de cada avaliação antes de reimportar.

export type MatchClass = 'strong' | 'weak' | 'none';

export const MATCH_CLASS_LABEL: Record<MatchClass, string> = {
  strong: 'Match forte',
  weak: 'Match fraco',
  none: 'Sem similaridade',
};

/**
 * Classifica um score de match em forte / fraco / sem similaridade,
 * seguindo a mesma regra de `classifyScore` (fuzzyMatch):
 *  - forte: score >= max(limiar, 0.75)
 *  - fraco:  score >= limiar
 *  - nenhum: abaixo do limiar ou sem score calculado
 */
export const matchClassFor = (
  score: number | null | undefined,
  threshold = 0.45,
): MatchClass => {
  if (score == null || Number.isNaN(score)) return 'none';
  if (score >= Math.max(threshold, 0.75)) return 'strong';
  if (score >= threshold) return 'weak';
  return 'none';
};

/** Motivo legível da classe de match, para exibir na linha da auditoria. */
export const matchClassReason = (
  cls: MatchClass,
  score: number | null | undefined,
  threshold = 0.45,
): string => {
  const pct = score != null && !Number.isNaN(score) ? ` (${(score * 100).toFixed(0)}%)` : '';
  switch (cls) {
    case 'strong':
      return `Títulos praticamente idênticos${pct} — acima de ${(Math.max(threshold, 0.75) * 100).toFixed(0)}%`;
    case 'weak':
      return `Similaridade parcial${pct} — entre ${(threshold * 100).toFixed(0)}% e ${(Math.max(threshold, 0.75) * 100).toFixed(0)}%, revisar antes de importar`;
    case 'none':
      return score == null
        ? 'Nenhum produto candidato comparado'
        : `Similaridade abaixo do limiar de ${(threshold * 100).toFixed(0)}%${pct}`;
  }
};

export interface AuditSummaryRow {
  manual_status: string;
  suggested_confidence: number | null;
  suggested_product_id: string | null;
  manual_product_id: string | null;
  imported_review_id: string | null;
}

export interface AuditSummary {
  total: number;
  byStatus: Record<string, number>;
  byMatchClass: Record<MatchClass, number>;
  /** Confirmadas com produto vinculado e ainda não importadas. */
  readyToImport: number;
  /** Confirmadas sem nenhum produto vinculado (vão falhar no import). */
  confirmedWithoutProduct: number;
  /** Já importadas anteriormente (import idempotente vai pular). */
  alreadyImported: number;
}

export const AUDIT_STATUSES = ['pending', 'confirmed', 'doubtful', 'rejected', 'no_match'] as const;

/** Agrega as linhas da auditoria em contagens por status e classe de match. */
export function summarizeAuditRows(rows: AuditSummaryRow[], threshold = 0.45): AuditSummary {
  const byStatus: Record<string, number> = Object.fromEntries(AUDIT_STATUSES.map((s) => [s, 0]));
  const byMatchClass: Record<MatchClass, number> = { strong: 0, weak: 0, none: 0 };
  let readyToImport = 0;
  let confirmedWithoutProduct = 0;
  let alreadyImported = 0;

  for (const row of rows) {
    byStatus[row.manual_status] = (byStatus[row.manual_status] ?? 0) + 1;
    byMatchClass[matchClassFor(row.suggested_confidence, threshold)] += 1;

    const hasProduct = Boolean(row.manual_product_id ?? row.suggested_product_id);
    const imported = Boolean(row.imported_review_id);
    if (imported) alreadyImported += 1;
    if (row.manual_status === 'confirmed') {
      if (!hasProduct) confirmedWithoutProduct += 1;
      else if (!imported) readyToImport += 1;
    }
  }

  return {
    total: rows.length,
    byStatus,
    byMatchClass,
    readyToImport,
    confirmedWithoutProduct,
    alreadyImported,
  };
}
