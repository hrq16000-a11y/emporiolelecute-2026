import { it, expect } from 'vitest';
import { hasHighRegression } from '../../supabase/functions/_shared/security-regression';
it('detects high substitutions even when totals are unchanged', () => expect(hasHighRegression([{ id:'new',package:'p',severity:'high' }],[{ id:'old',package:'p',severity:'high' }])).toBe(true));
it('does not treat the first scan as a regression', () => expect(hasHighRegression([{id:'a',package:'p',severity:'high'}],null)).toBe(false));
it('detects escalation from high to critical', () => expect(hasHighRegression([{id:'a',package:'p',severity:'critical'}],[{id:'a',package:'p',severity:'high'}])).toBe(true));
it('does not flag unchanged findings', () => expect(hasHighRegression([{id:'a',package:'p',severity:'high'}],[{id:'a',package:'p',severity:'high'}])).toBe(false));