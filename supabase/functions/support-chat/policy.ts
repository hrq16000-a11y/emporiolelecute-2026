export const wantsHuman = (text: string) => /\b(humano|humana|atendente|pessoa|reclamacao|cancelar|cancelamento|reembolso)\b/i.test(text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
export const ownsOrder = (verifiedEmail: string | undefined, orderEmail: string) => Boolean(verifiedEmail && verifiedEmail.toLowerCase() === orderEmail.toLowerCase());
