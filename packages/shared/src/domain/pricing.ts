// Montants d'une commande (F CFA, entiers). Une quantité nulle ou négative compte pour 0.
import type { OrderItem } from '../models';

export function lineTotal(unitPrice: number, qty: number): number {
  return Math.max(0, Math.round(unitPrice)) * Math.max(0, Math.floor(qty));
}

export function subtotal(items: Pick<OrderItem, 'unitPrice' | 'qty'>[]): number {
  return items.reduce((sum, i) => sum + lineTotal(i.unitPrice, i.qty), 0);
}

/** Total à payer : sous-total − remise (jamais négatif) + livraison. */
export function orderTotal({ subtotal, discount, deliveryFee }: { subtotal: number; discount: number; deliveryFee: number }): number {
  return Math.max(0, subtotal - Math.max(0, discount)) + Math.max(0, deliveryFee);
}
