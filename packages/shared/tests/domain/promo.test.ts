import { describe, expect, it } from 'vitest';
import { applicablePromos, bestPrice, findPromoByCode, isPromoActive } from '../../src/domain/promo';
import type { Promotion } from '../../src/models';

const NOW = new Date('2026-10-10T12:00:00Z');
const day = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
const promo = (o: Partial<Promotion>): Promotion => ({
  title: 'Promo',
  type: 'percent',
  value: 10,
  scope: 'all',
  targetIds: [],
  code: null,
  bannerImageUrl: null,
  startsAt: day(-1),
  endsAt: day(1),
  isActive: true,
  createdAt: null,
  ...o,
});
const TARGET = { productId: 'p1', categoryId: 'c1', sku: 'TOF-BF-030' };

describe('promo', () => {
  it('isPromoActive : promo expirée', () => {
    expect(isPromoActive(promo({ startsAt: day(-10), endsAt: day(-1) }), NOW)).toBe(false);
  });
  it('isPromoActive : promo future', () => {
    expect(isPromoActive(promo({ startsAt: day(1), endsAt: day(5) }), NOW)).toBe(false);
    expect(isPromoActive(promo({ isActive: false }), NOW)).toBe(false);
    expect(isPromoActive(promo({}), NOW)).toBe(true);
  });
  it('applicablePromos selon le scope (all, category, product, variant), sans code', () => {
    const list = [
      promo({ title: 'tout' }),
      promo({ title: 'cat', scope: 'category', targetIds: ['c1'] }),
      promo({ title: 'autre cat', scope: 'category', targetIds: ['c2'] }),
      promo({ title: 'produit', scope: 'product', targetIds: ['p1'] }),
      promo({ title: 'format', scope: 'variant', targetIds: ['TOF-BF-030'] }),
      promo({ title: 'code', code: 'BIENVENUE' }),
    ];
    expect(applicablePromos(list, TARGET, { now: NOW }).map((p) => p.title)).toEqual(['tout', 'cat', 'produit', 'format']);
    expect(applicablePromos(list, TARGET, { now: NOW, code: 'bienvenue' }).map((p) => p.title)).toContain('code');
  });
  it('bestPrice : deux promos qui se chevauchent, la meilleure gagne', () => {
    expect(bestPrice(3000, [promo({ type: 'percent', value: 10 }), promo({ type: 'amount', value: 500 })])).toBe(2500);
  });
  it('bestPrice : fixed_price supérieur au prix est ignoré', () => {
    expect(bestPrice(3000, [promo({ type: 'fixed_price', value: 3500 })])).toBe(3000);
    expect(bestPrice(3000, [promo({ type: 'fixed_price', value: 2000 })])).toBe(2000);
  });
  it('bestPrice : jamais sous 0, arrondi à la dizaine inférieure', () => {
    expect(bestPrice(3000, [promo({ type: 'amount', value: 5000 })])).toBe(0);
    expect(bestPrice(2995, [promo({ type: 'percent', value: 15 })])).toBe(2540); // 2545,75 → 2540
  });
  it('findPromoByCode : insensible à la casse, code invalide refusé', () => {
    const list = [promo({ code: 'BIENVENUE' }), promo({ code: 'FINI', endsAt: day(-1) })];
    expect(findPromoByCode(list, ' bienvenue ', NOW)?.code).toBe('BIENVENUE');
    expect(findPromoByCode(list, 'FINI', NOW)).toBeNull();
    expect(findPromoByCode(list, 'INCONNU', NOW)).toBeNull();
    expect(findPromoByCode(list, '', NOW)).toBeNull();
  });
});
