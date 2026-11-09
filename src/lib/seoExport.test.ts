import { expect, it } from 'vitest';
import { toCsv } from './seoExport';

it('neutralizes spreadsheet formulas in export values and headers', () => {
  expect(toCsv([{ '=header': '=1+1', label: '  @SUM(1)', command: '+cmd', negative: '-cmd' }]))
    .toBe("'=header,label,command,negative\n'=1+1,'  @SUM(1),'+cmd,'-cmd");
});
it('preserves numeric measurements and quotes multiline values', () => {
  expect(toCsv([{ value: -3, label: 'one\r\ntwo' }])).toBe('value,label\n-3,"one\r\ntwo"');
});