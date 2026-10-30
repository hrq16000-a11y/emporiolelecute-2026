export interface PostalAddress {
  cep: string;
  city: string;
  state: string;
}

export const lookupPostalAddress = async (
  cep: string,
  signal?: AbortSignal,
): Promise<PostalAddress> => {
  const digits = cep.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) throw new Error('invalid_postal_code');
  const providers = [
    `https://viacep.com.br/ws/${digits}/json/`,
    `https://brasilapi.com.br/api/cep/v1/${digits}`,
  ];
  for (const url of providers) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const response = await fetch(url, { signal: signal ?? AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const data = await response.json();
      const city = data.localidade ?? data.city;
      const state = data.uf ?? data.state;
      if (!data.erro && typeof city === 'string' && city && typeof state === 'string' && /^[a-z]{2}$/i.test(state)) {
        return { cep: digits, city, state: state.toUpperCase() };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error('postal_address_unavailable');
};