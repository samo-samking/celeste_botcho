// Promotion : pourcentage, montant déduit ou prix fixe, sur tout le site, une catégorie,
// un produit ou un format ; automatique (code null) ou avec code.
export type PromoType = 'percent' | 'amount' | 'fixed_price';
export type PromoScope = 'all' | 'category' | 'product' | 'variant';

export interface Promotion {
  title: string; // 'Promo exceptionnelle'
  type: PromoType;
  value: number; // 15 (%), 500 (F) ou prix fixe
  scope: PromoScope;
  targetIds: string[]; // IDs de catégories, produits ou SKU
  code: string | null; // null = appliquée automatiquement
  bannerImageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date | null;
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  percent: 'Pourcentage',
  amount: 'Montant déduit',
  fixed_price: 'Prix fixe',
};
export const PROMO_SCOPE_LABELS: Record<PromoScope, string> = {
  all: 'Tout le site',
  category: 'Catégories',
  product: 'Produits',
  variant: 'Formats',
};
