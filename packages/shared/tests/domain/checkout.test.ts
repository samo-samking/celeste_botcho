import { describe, expect, it } from 'vitest';
import { quoteOrder, type CheckoutProduct } from '../../src/domain/checkout';
import type { Promotion } from '../../src/models';

const NOW = new Date('2026-10-10T12:00:00Z');
const day = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
const promo = (o: Partial<Promotion>): Promotion => ({
  title: 'Promo', type: 'percent', value: 10, scope: 'all', targetIds: [], code: null, bannerImageUrl: null,
  startsAt: day(-1), endsAt: day(1), isActive: true, createdAt: null, ...o,
});
const PRODUCTS: CheckoutProduct[] = [
  { id: 'bf', name: 'Toffi Bassin & Fesses', categoryId: 'c-bf', variants: [
    { sku: 'BF-30', label: 'Petit pot', price: 3000, available: true },
    { sku: 'BF-115', label: 'Grand pot', price: 10000, available: false },
  ] },
  { id: 'gc', name: 'Toffi Grossissant Corps', categoryId: 'c-gc', variants: [{ sku: 'GC-55', label: 'Pot moyen', price: 5000, available: true }] },
];
const ZONE = { id: 'cocody', name: 'Abidjan — Cocody', mode: 'local' as const, fee: 1500 };

describe('quoteOrder', () => {
  it('prix du catalogue, sous-total, livraison, total', () => {
    const q = quoteOrder({ lines: [{ productId: 'bf', sku: 'BF-30', qty: 2 }, { productId: 'gc', sku: 'GC-55', qty: 1 }], products: PRODUCTS, promos: [], zone: ZONE, now: NOW });
    expect(q.items.map((i) => [i.sku, i.unitPrice, i.qty, i.lineTotal])).toEqual([['BF-30', 3000, 2, 6000], ['GC-55', 5000, 1, 5000]]);
    expect([q.subtotal, q.discount, q.deliveryFee, q.total]).toEqual([11000, 0, 1500, 12500]);
  });
  it('écarte les formats épuisés ou retirés', () => {
    const q = quoteOrder({ lines: [{ productId: 'bf', sku: 'BF-115', qty: 1 }, { productId: 'x', sku: 'X', qty: 1 }, { productId: 'gc', sku: 'GC-55', qty: 1 }], products: PRODUCTS, promos: [], zone: null, now: NOW });
    expect(q.items).toHaveLength(1);
    expect(q.unavailable.map((l) => l.sku)).toEqual(['BF-115', 'X']);
    expect(q.total).toBe(5000);
  });
  it('promo automatique sur une catégorie : remise par unité', () => {
    const q = quoteOrder({ lines: [{ productId: 'bf', sku: 'BF-30', qty: 2 }, { productId: 'gc', sku: 'GC-55', qty: 1 }], products: PRODUCTS, promos: [promo({ scope: 'category', targetIds: ['c-bf'], value: 20 })], zone: ZONE, now: NOW });
    expect(q.discount).toBe(1200); // 2 × 600
    expect(q.total).toBe(11000 - 1200 + 1500);
    expect(q.promoCode).toBeNull();
  });
  it('code promo : accepté s’il fait baisser un prix, refusé sinon', () => {
    const promos = [promo({ code: 'BIENVENUE', type: 'amount', value: 500, scope: 'product', targetIds: ['gc'] })];
    const ok = quoteOrder({ lines: [{ productId: 'gc', sku: 'GC-55', qty: 1 }], products: PRODUCTS, promos, code: ' bienvenue ', zone: null, now: NOW });
    expect([ok.promoCode, ok.discount, ok.promoRejected]).toEqual(['BIENVENUE', 500, false]);
    const sansEffet = quoteOrder({ lines: [{ productId: 'bf', sku: 'BF-30', qty: 1 }], products: PRODUCTS, promos, code: 'BIENVENUE', zone: null, now: NOW });
    expect([sansEffet.promoCode, sansEffet.discount, sansEffet.promoRejected]).toEqual([null, 0, true]);
    const inconnu = quoteOrder({ lines: [{ productId: 'gc', sku: 'GC-55', qty: 1 }], products: PRODUCTS, promos, code: 'FAUX', zone: null, now: NOW });
    expect(inconnu.promoRejected).toBe(true);
  });
});
