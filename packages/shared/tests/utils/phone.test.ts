import { describe, expect, it } from 'vitest';
import { formatPhone, isValidCiPhone, normalizePhone } from '../../src/utils/phone';

describe('phone', () => {
  it('normalizePhone("07 67 10 78 04") donne +2250767107804', () => {
    expect(normalizePhone('07 67 10 78 04')).toBe('+2250767107804');
    expect(normalizePhone('+225 07.67.10.78.04')).toBe('+2250767107804');
    expect(normalizePhone('002250767107804')).toBe('+2250767107804');
    expect(normalizePhone('2250767107804')).toBe('+2250767107804');
  });

  it("formatPhone est l'inverse de normalizePhone", () => {
    for (const n of ['+2250767107804', '+2250141047671', '+2252722000000']) {
      expect(normalizePhone(formatPhone(n))).toBe(n);
    }
    expect(formatPhone('+2250507884470')).toBe('05 07 88 44 70');
  });

  it('isValidCiPhone accepte 10 chiffres et les préfixes 01 / 05 / 07 / 25 / 27', () => {
    for (const n of ['0141047671', '0507884470', '0767107804', '2522000000', '2722000000']) {
      expect(isValidCiPhone(n)).toBe(true);
    }
  });

  it('isValidCiPhone refuse les autres préfixes et longueurs', () => {
    for (const n of ['0941047671', '2122000000', '050788447', '05078844700', '', 'abc', '+33612345678']) {
      expect(isValidCiPhone(n)).toBe(false);
    }
  });
});
