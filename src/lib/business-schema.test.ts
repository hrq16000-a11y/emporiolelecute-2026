import { describe, expect, it } from 'vitest';
import { buildBusinessSchema } from './business-schema';

describe('Verified business schema', () => {
  it('uses the official logo and configured public profiles, without fabricated business facts', () => {
    const schema = buildBusinessSchema({ origin: 'https://emporiolelecute.com.br', logo: '/assets/logo.webp', socialUrls: ['https://instagram.com/emporiolelecute', 'javascript:alert(1)'] });
    expect(schema.logo.url).toBe('https://emporiolelecute.com.br/assets/logo.webp');
    expect(schema.sameAs).toEqual(['https://instagram.com/emporiolelecute']);
    expect(schema.name).toBe('Empório LeleCute');
    expect(schema.areaServed.name).toBe('Brasil');
    expect(schema).not.toHaveProperty('openingHoursSpecification');
    expect(schema).not.toHaveProperty('geo');
  });
});