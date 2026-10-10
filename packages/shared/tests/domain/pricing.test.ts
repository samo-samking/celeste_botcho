import { describe, expect, it } from 'vitest';
import { lineTotal, orderTotal, subtotal } from '../../src/domain/pricing';
import { minActivePrice } from '../../src/domain/catalog';

describe('pricing', () => {
  it('lineTotal, subtotal, discount, orderTotal', () => {
    expect(lineTotal(2500, 2)).toBe(5000);
    const items = [{ unitPrice: 2500, qty: 2 }, { unitPrice: 4000, qty: 1 }];
    expect(subtotal(items)).toBe(9000);
    expect(orderTotal({ subtotal: 9000, discount: 500, deliveryFee: 1500 })).toBe(10000);
    expect(orderTotal({ subtotal: 400, discount: 500, deliveryFee: 1500 })).toBe(1500); // remise plafonnée
  });
  it('panier vide', () => {
    expect(subtotal([])).toBe(0);
    expect(orderTotal({ subtotal: 0, discount: 0, deliveryFee: 0 })).toBe(0);
  });
  it('quantité 0', () => {
    expect(lineTotal(2500, 0)).toBe(0);
    expect(lineTotal(2500, -3)).toBe(0);
  });
  it('minActivePrice ignore les formats inactifs', () => {
    const v = (price: number, isActive: boolean) => ({ sku: String(price), label: '', quantity: 1, price, stock: null, isActive });
    expect(minActivePrice([v(1000, false), v(2500, true), v(4000, true)])).toBe(2500);
  });
});
