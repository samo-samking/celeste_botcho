// Promotions : promo en cours, promos applicables à un format, meilleur prix.
// Règles : une promo ne fait jamais monter un prix ; jamais sous 0 ; prix arrondi à la dizaine inférieure.
import type { Promotion } from '../models';

export interface PromoTarget {
  productId: string;
  categoryId: string;
  sku: string;
}

export type PromoState = 'scheduled' | 'running' | 'ended' | 'inactive';

export function promoState(p: Pick<Promotion, 'isActive' | 'startsAt' | 'endsAt'>, now = new Date()): PromoState {
  if (!p.isActive) return 'inactive';
  if (now < p.startsAt) return 'scheduled';
  if (now > p.endsAt) return 'ended';
  return 'running';
}

export function isPromoActive(p: Pick<Promotion, 'isActive' | 'startsAt' | 'endsAt'>, now = new Date()): boolean {
  return promoState(p, now) === 'running';
}

export function promoCovers(p: Pick<Promotion, 'scope' | 'targetIds'>, t: PromoTarget): boolean {
  switch (p.scope) {
    case 'all':
      return true;
    case 'category':
      return p.targetIds.includes(t.categoryId);
    case 'product':
      return p.targetIds.includes(t.productId);
    case 'variant':
      return p.targetIds.includes(t.sku);
  }
}

/** Promos en cours qui s'appliquent à ce format : automatiques, plus celle du code saisi. */
export function applicablePromos(promos: Promotion[], t: PromoTarget, { now = new Date(), code = '' } = {}): Promotion[] {
  const wanted = code.trim().toUpperCase();
  return promos.filter((p) => isPromoActive(p, now) && promoCovers(p, t) && (p.code === null || (!!wanted && p.code.toUpperCase() === wanted)));
}

/** Prix après une promo (sans arrondi) ; un prix fixe supérieur au prix normal est ignoré. */
export function priceWithPromo(price: number, p: Pick<Promotion, 'type' | 'value'>): number {
  switch (p.type) {
    case 'percent':
      return price * (1 - Math.min(100, Math.max(0, p.value)) / 100);
    case 'amount':
      return price - Math.max(0, p.value);
    case 'fixed_price':
      return p.value < price ? p.value : price;
  }
}

/** Meilleur prix parmi les promos (la plus avantageuse gagne), arrondi à la dizaine inférieure. */
export function bestPrice(price: number, promos: Pick<Promotion, 'type' | 'value'>[]): number {
  const best = promos.reduce((min, p) => Math.min(min, priceWithPromo(price, p)), price);
  return best >= price ? price : Math.max(0, Math.floor(best / 10) * 10);
}

/** Promo correspondant à un code saisi (casse ignorée), si elle est en cours. */
export function findPromoByCode(promos: Promotion[], code: string, now = new Date()): Promotion | null {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;
  return promos.find((p) => p.code?.toUpperCase() === wanted && isPromoActive(p, now)) ?? null;
}
