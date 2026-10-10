// ViewModel des Promotions : liste par état (en cours, programmées, terminées, désactivées),
// catalogue pour choisir les cibles et calculer l'aperçu des prix, détection des chevauchements.
import { computed, signal } from '@preact/signals-core';
import type { Category, Product, Promotion, WithId } from '@celeste/shared/models';
import { bestPrice, promoCovers, promoState, type PromoState } from '@celeste/shared/domain/promo';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';
import { promotionRepository } from '@celeste/shared/repositories/promotion.repository';
import { validatePromotion, type PromotionInput } from '@celeste/shared/validation/promotion.validation';

export interface PricePreview {
  product: string;
  variant: string;
  sku: string;
  before: number;
  after: number;
}

export class PromotionsViewModel {
  readonly promos = signal<WithId<Promotion>[]>([]);
  readonly categories = signal<WithId<Category>[]>([]);
  readonly products = signal<WithId<Product>[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly tab = signal<PromoState>('running');
  readonly pending = signal<string | null>(null);

  readonly byState = computed(() => {
    const groups: Record<PromoState, WithId<Promotion>[]> = { running: [], scheduled: [], ended: [], inactive: [] };
    for (const p of this.promos.value) groups[promoState(p)].push(p);
    return groups;
  });

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const [promos, categories, products] = await Promise.all([promotionRepository.listAll(), categoryRepository.listAll(), productRepository.listAll()]);
      this.promos.value = promos;
      this.categories.value = categories;
      this.products.value = products.filter((p) => p.status !== 'archived');
    } catch {
      this.error.value = 'Impossible de charger les promotions. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  /** Formats concernés avec ancien et nouveau prix (produits publiés et formats actifs). */
  preview(p: Pick<Promotion, 'type' | 'value' | 'scope' | 'targetIds'>): PricePreview[] {
    const out: PricePreview[] = [];
    for (const product of this.products.value) {
      if (product.status !== 'published') continue;
      for (const v of product.variants) {
        if (!v.isActive || !promoCovers(p, { productId: product.id, categoryId: product.categoryId, sku: v.sku })) continue;
        out.push({ product: product.name, variant: v.label, sku: v.sku, before: v.price, after: bestPrice(v.price, [p]) });
      }
    }
    return out;
  }

  /** Autres promos actives dont la période et les cibles recoupent celle-ci (même produit concerné). */
  overlaps(input: PromotionInput, selfId?: string): WithId<Promotion>[] {
    const mine = new Set(this.preview(input).map((x) => x.sku));
    return this.promos.value.filter((other) => {
      if (other.id === selfId || !other.isActive || other.code || input.code) return false; // les promos à code ne se cumulent pas automatiquement
      if (other.endsAt < input.startsAt || other.startsAt > input.endsAt) return false;
      return this.preview(other).some((x) => mine.has(x.sku));
    });
  }

  async save(input: PromotionInput, previous?: WithId<Promotion>): Promise<Record<string, string> | null> {
    const checked = validatePromotion(input);
    if (!checked.ok) return checked.errors;
    const dup = checked.value.code && this.promos.value.find((p) => p.id !== previous?.id && p.code === checked.value.code && p.isActive);
    if (dup) return { code: `Ce code est déjà utilisé par « ${dup.title} ».` };
    await promotionRepository.save(checked.value, previous);
    await this.load();
    return null;
  }

  async setActive(p: WithId<Promotion>, isActive: boolean) {
    this.pending.value = p.id;
    try {
      await promotionRepository.setActive(p, isActive);
      await this.load();
    } finally {
      this.pending.value = null;
    }
  }

  async remove(p: WithId<Promotion>) {
    await promotionRepository.remove(p);
    this.promos.value = this.promos.value.filter((x) => x.id !== p.id);
  }

  /** Texte court de la remise : « −15 % », « −500 F », « 2 000 F ». */
  static label(p: Pick<Promotion, 'type' | 'value'>, fcfa: (n: number) => string): string {
    return p.type === 'percent' ? `−${p.value} %` : p.type === 'amount' ? `−${fcfa(p.value)}` : `Prix fixe ${fcfa(p.value)}`;
  }
}

