import { describe, expect, it } from 'vitest';
import { deliveryFee, zonesByMode } from '../../src/domain/delivery';
import type { DeliveryZone } from '../../src/models';

const ZONES: DeliveryZone[] = [
  { id: 'cocody', name: 'Abidjan — Cocody', mode: 'local', fee: 1500 },
  { id: 'yopougon', name: 'Abidjan — Yopougon', mode: 'local', fee: 2000 },
  { id: 'interieur', name: 'Intérieur du pays', mode: 'shipping', fee: 3000 },
];

describe('delivery', () => {
  it('deliveryFee renvoie le tarif de la zone', () => {
    expect(deliveryFee(ZONES, 'yopougon')).toBe(2000);
  });
  it('deliveryFee : zone inconnue', () => {
    expect(deliveryFee(ZONES, 'bouake')).toBeNull();
  });
  it('zonesByMode sépare local et shipping', () => {
    const g = zonesByMode(ZONES);
    expect(g.local.map((z) => z.id)).toEqual(['cocody', 'yopougon']);
    expect(g.shipping.map((z) => z.id)).toEqual(['interieur']);
  });
});
