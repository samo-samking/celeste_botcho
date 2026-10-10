import { describe, expect, it } from 'vitest';
import { activeFestiveTheme, festiveThemeOn, isNewYearSide, newYearOf } from '../../src/domain/festive';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);

describe('festive', () => {
  it('calendrier : fin d’année (1er déc. → 6 janv.) et Indépendance', () => {
    expect(festiveThemeOn(d(2026, 11, 30))).toBeNull();
    expect(festiveThemeOn(d(2026, 12, 1))).toBe('yearend');
    expect(festiveThemeOn(d(2026, 12, 31))).toBe('yearend');
    expect(festiveThemeOn(d(2027, 1, 6))).toBe('yearend');
    expect(festiveThemeOn(d(2027, 1, 7))).toBeNull();
    expect(festiveThemeOn(d(2026, 8, 7))).toBe('independence');
    expect(festiveThemeOn(d(2026, 8, 11))).toBeNull();
  });
  it('mode de l’admin et aperçu dans l’adresse', () => {
    const dec = d(2026, 12, 15);
    expect(activeFestiveTheme('auto', dec)).toBe('yearend');
    expect(activeFestiveTheme('off', dec)).toBeNull();
    expect(activeFestiveTheme('independence', dec)).toBe('independence');
    expect(activeFestiveTheme('off', dec, 'yearend')).toBe('yearend'); // l'aperçu l'emporte
    expect(activeFestiveTheme('auto', dec, 'off')).toBeNull();
    expect(activeFestiveTheme('christmas' as never, dec)).toBeNull(); // ancienne valeur : ignorée
  });
  it('vœux : Noël jusqu’au 25 décembre, puis Nouvel An', () => {
    expect(isNewYearSide(d(2026, 12, 25))).toBe(false);
    expect(isNewYearSide(d(2026, 12, 26))).toBe(true);
    expect(isNewYearSide(d(2027, 1, 3))).toBe(true);
  });
  it('année souhaitée : de juillet à décembre, l’année suivante', () => {
    expect(newYearOf(d(2026, 12, 31))).toBe(2027);
    expect(newYearOf(d(2027, 1, 3))).toBe(2027);
    expect(newYearOf(d(2026, 10, 10))).toBe(2027);
  });
});
