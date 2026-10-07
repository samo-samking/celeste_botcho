import { describe, expect, it } from 'vitest';
import { formatFcfa } from '../../src/utils/format-fcfa';

describe('formatFcfa', () => {
  it('formate 2500 en « 2 500 F CFA » avec espace insécable fine', () => {
    expect(formatFcfa(2500)).toBe('2 500 F CFA');
  });
  it('variante courte « 2 500 F »', () => {
    expect(formatFcfa(2500, { short: true })).toBe('2 500 F');
  });
  it('gère les petits et grands montants', () => {
    expect(formatFcfa(500)).toBe('500 F CFA');
    expect(formatFcfa(1250000)).toBe('1 250 000 F CFA');
  });
});
