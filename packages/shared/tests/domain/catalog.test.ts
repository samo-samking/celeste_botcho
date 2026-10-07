import { describe, expect, it } from 'vitest';
import { buildSku, isInStock, minActivePrice, publicationIssues, skuPrefix } from '../../src/domain/catalog';
import type { Variant } from '../../src/models';

const v = (price: number, isActive = true, stock: number | null = null): Variant => ({ sku: `S${price}`, label: `${price}`, quantity: 30, price, stock, isActive });

describe('catalogue', () => {
  it('minActivePrice ignore les formats inactifs', () => {
    expect(minActivePrice([v(4000), v(2500, false), v(8500)])).toBe(4000);
    expect(minActivePrice([v(2500, false)])).toBe(0);
    expect(minActivePrice([])).toBe(0);
  });
  it('isInStock : stock non suivi = disponible, 0 = rupture', () => {
    expect(isInStock([v(1, true, null)])).toBe(true);
    expect(isInStock([v(1, true, 0)])).toBe(false);
    expect(isInStock([v(1, false, 5), v(2, true, 3)])).toBe(true);
    expect(isInStock([v(1, false, 5)])).toBe(false);
  });
  it('SKU automatique', () => {
    expect(skuPrefix('Toffi Bassin & Fesses')).toBe('TOF-BF');
    expect(skuPrefix('Crème réparatrice')).toBe('CRE-R');
    expect(skuPrefix('Sirop')).toBe('SIR');
    expect(buildSku('Toffi Bassin & Fesses', 30)).toBe('TOF-BF-030');
    expect(buildSku('Toffi Grossissant Corps', 115)).toBe('TOF-GC-115');
  });
  it('publicationIssues liste les manques', () => {
    const base = { name: 'Toffi', categoryId: 'c1', images: [{ url: 'u', width: 1, height: 1, alt: '' }], variants: [v(2500)], composition: 'x', precautions: 'y' };
    expect(publicationIssues(base)).toEqual([]);
    expect(publicationIssues({ ...base, images: [], composition: ' ', variants: [v(1, false)] })).toEqual([
      'au moins une photo',
      'au moins un format actif',
      'la composition',
    ]);
  });
});
