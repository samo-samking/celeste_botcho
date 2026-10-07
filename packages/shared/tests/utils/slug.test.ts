import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/utils/slug';

describe('slugify', () => {
  it('retire accents et « & »', () => {
    expect(slugify('Toffi Bassin & Fesses')).toBe('toffi-bassin-fesses');
    expect(slugify('Crème réparatrice')).toBe('creme-reparatrice');
    expect(slugify('Soins & gamme spécifique')).toBe('soins-gamme-specifique');
  });
  it('nettoie espaces, ponctuation et tirets en trop', () => {
    expect(slugify('  Sirop -- ventre plat !! ')).toBe('sirop-ventre-plat');
    expect(slugify("L'or de Bôtchô")).toBe('l-or-de-botcho');
  });
});
