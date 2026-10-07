// À écrire en Phase 1 (§1.2–1.6 du programme) — les todo s'affichent dans le rapport de tests.
import { describe, it } from 'vitest';

describe('phone', () => {
  it.todo('normalizePhone("07 67 10 78 04") donne +2250767107804');
  it.todo('formatPhone est l\'inverse de normalizePhone');
  it.todo('isValidCiPhone accepte 10 chiffres et les préfixes 01 / 05 / 07 / 25 / 27');
  it.todo('isValidCiPhone refuse les autres préfixes et longueurs');
});
