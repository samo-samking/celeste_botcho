// Calcul d'une commande à partir du panier et du catalogue À JOUR (jamais des prix affichés) :
// articles figés, promotions (automatiques + code saisi), frais de livraison, total.
// Les prix unitaires gardent le prix du catalogue ; l'économie des promos est dans `discount`
// (total = sous-total − remise + livraison, ce que l'admin recalcule pour détecter un écart).
import type { DeliveryZone, OrderItem, Promotion } from '../models';
import { applicablePromos, bestPrice, findPromoByCode } from './promo';
import { lineTotal, orderTotal } from './pricing';

export interface CheckoutLine {
  productId: string;
  sku: string;
  qty: number;
}

/** Ce que le calcul a besoin de savoir d'un produit (catalogue public). */
export interface CheckoutProduct {
  id: string;
  name: string;
  categoryId: string;
  variants: { sku: string; label: string; price: number; available: boolean }[];
}

export interface CheckoutQuote {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  /** Code promo accepté (en majuscules), ou null. */
  promoCode: string | null;
  /** Code saisi mais refusé (inconnu, expiré, ou sans effet sur ce panier). */
  promoRejected: boolean;
  /** Lignes du panier qui ne peuvent plus être commandées (retirées, désactivées, épuisées). */
  unavailable: CheckoutLine[];
}

export function quoteOrder({
  lines,
  products,
  promos,
  code = '',
  zone,
  now = new Date(),
}: {
  lines: CheckoutLine[];
  products: CheckoutProduct[];
  promos: Promotion[];
  code?: string;
  zone: DeliveryZone | null;
  now?: Date;
}): CheckoutQuote {
  const byId = new Map(products.map((p) => [p.id, p]));
  const wanted = code.trim().toUpperCase();
  const codePromo = wanted ? findPromoByCode(promos, wanted, now) : null;

  const items: OrderItem[] = [];
  const unavailable: CheckoutLine[] = [];
  let discount = 0;
  let codeUsed = false;

  for (const line of lines) {
    const product = byId.get(line.productId);
    const variant = product?.variants.find((v) => v.sku === line.sku);
    const qty = Math.max(0, Math.floor(line.qty));
    if (!product || !variant || !variant.available || qty < 1) {
      unavailable.push(line);
      continue;
    }
    const target = { productId: product.id, categoryId: product.categoryId, sku: variant.sku };
    const promosHere = applicablePromos(promos, target, { now, code: codePromo ? wanted : '' });
    const unit = bestPrice(variant.price, promosHere);
    if (codePromo && unit < bestPrice(variant.price, applicablePromos(promos, target, { now }))) codeUsed = true;
    discount += (variant.price - unit) * qty;
    items.push({
      productId: product.id,
      sku: variant.sku,
      name: product.name,
      variantLabel: variant.label,
      unitPrice: variant.price,
      qty,
      lineTotal: lineTotal(variant.price, qty),
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const deliveryFee = zone?.fee ?? 0;
  return {
    items,
    subtotal,
    discount,
    deliveryFee,
    total: orderTotal({ subtotal, discount, deliveryFee }),
    promoCode: codeUsed ? wanted : null,
    promoRejected: !!wanted && !codeUsed,
    unavailable,
  };
}
