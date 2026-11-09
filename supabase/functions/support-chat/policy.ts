export const wantsHuman = (text: string) => /\b(humano|humana|atendente|pessoa|reclamação|cancelar|reembolso)\b/i.test(text);
export const ownsOrder = (verifiedEmail: string | undefined, orderEmail: string) => Boolean(verifiedEmail && verifiedEmail.toLowerCase() === orderEmail.toLowerCase());
