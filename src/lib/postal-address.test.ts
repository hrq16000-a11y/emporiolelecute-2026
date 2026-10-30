import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupPostalAddress } from './postal-address';

afterEach(() => vi.unstubAllGlobals());

describe('automatic postal address lookup', () => {
  it('resolves city and state from a complete CEP without another action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ localidade: 'São José dos Pinhais', uf: 'PR' }) }));
    expect(await lookupPostalAddress('83005-000')).toEqual({ cep: '83005000', city: 'São José dos Pinhais', state: 'PR' });
  });
  it('uses the second provider when the first fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => ({ city: 'Curitiba', state: 'pr' }) }));
    expect(await lookupPostalAddress('80010000')).toEqual({ cep: '80010000', city: 'Curitiba', state: 'PR' });
  });
  it('does not manufacture address values when both providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }));
    await expect(lookupPostalAddress('83005000')).rejects.toThrow('postal_address_unavailable');
  });
});