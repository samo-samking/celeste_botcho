import { describe, expect, it } from 'vitest';
import { CATEGORY_PRESETS, DARK_BG, LIGHT_TEXT, categoryColor, contrastRatio, darkenToContrast, lightenToContrast } from '../../src/utils/color';

describe('couleurs', () => {
  it('contraste : bornes connues', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
  it('darkenToContrast atteint 4,5:1 avec le texte clair', () => {
    for (const { hex } of CATEGORY_PRESETS) {
      expect(contrastRatio(darkenToContrast(hex), LIGHT_TEXT)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('une teinte déjà lisible n’est pas modifiée', () => {
    expect(darkenToContrast('#2f6b4f')).toBe('#2f6b4f');
  });
  it('lightenToContrast rend chaque teinte lisible en texte sur le fond sombre', () => {
    for (const { hex } of CATEGORY_PRESETS) {
      expect(contrastRatio(lightenToContrast(hex), DARK_BG)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('categoryColor : couleur valide, sinon teinte de la palette', () => {
    expect(categoryColor('#A0452E', 0)).toBe('#a0452e');
    expect(categoryColor('', 1)).toBe(CATEGORY_PRESETS[1].hex);
    expect(categoryColor('rouge', 8)).toBe(CATEGORY_PRESETS[0].hex);
  });
});
