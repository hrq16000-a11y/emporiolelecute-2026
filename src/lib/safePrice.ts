/**
 * Parse SAFE de preço para JSON-LD / microdata.
 *
 * O Supabase pode devolver colunas `numeric` como STRING (ex.: "4.60"),
 * e conteúdo editado à mão pode chegar como "R$ 4,60". O Google exige
 * que `offers.price` e `itemprop="price"` sejam estritamente numéricos,
 * com ponto decimal e sem símbolo de moeda.
 *
 * Regras aplicadas:
 *  - remove tudo que não for dígito, vírgula, ponto ou sinal negativo
 *  - trata separador decimal brasileiro ("1.234,56" -> 1234.56)
 *  - devolve `null` quando o valor é ausente/inválido, para que o caller
 *    possa OMITIR o campo em vez de emitir `NaN` (que quebra o rich result)
 */
export function parseSafePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }

  if (typeof value !== 'string') return null;

  const cleaned = value.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized: string;
  if (lastComma > lastDot) {
    // formato pt-BR: pontos são milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1) {
    // formato en-US: vírgulas são milhar
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Formata um preço para o formato exigido pelo schema.org: "4.60".
 * Devolve `null` quando o valor não é utilizável.
 */
export function formatSchemaPrice(value: unknown): string | null {
  const n = parseSafePrice(value);
  return n === null ? null : n.toFixed(2);
}
