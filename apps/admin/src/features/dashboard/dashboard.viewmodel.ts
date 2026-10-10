// ViewModel du tableau de bord : chiffres du catalogue (le catalogue est petit : tout est lu en une
// fois) et des ventes (commandes des 31 derniers jours, en une requête), promos en cours.
import { computed, signal } from '@preact/signals-core';
import type { Order, WithId } from '@celeste/shared/models';
import { isPromoActive } from '@celeste/shared/domain/promo';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { orderRepository } from '@celeste/shared/repositories/order.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';
import { promotionRepository } from '@celeste/shared/repositories/promotion.repository';

export interface CatalogStats {
  published: number;
  drafts: number;
  outOfStock: number;
  categories: number;
  activeCategories: number;
}

export interface SalesStats {
  ordersToday: number;
  /** Chiffre du mois : commandes livrées depuis le 1er. */
  monthRevenue: number;
  monthDelivered: number;
  activePromos: number;
  /** Commandes par jour sur 30 jours (hors annulées), du plus ancien au plus récent. */
  days: { date: Date; count: number; total: number }[];
  latest: WithId<Order>[];
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export class DashboardViewModel {
  readonly stats = signal<CatalogStats | null>(null);
  readonly sales = signal<SalesStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Étapes de démarrage : faites ou non. */
  readonly steps = computed(() => {
    const s = this.stats.value;
    return {
      category: (s?.categories ?? 0) > 0,
      product: (s?.published ?? 0) + (s?.drafts ?? 0) > 0,
      published: (s?.published ?? 0) > 0,
    };
  });

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const today = startOfDay(new Date());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const from = new Date(Math.min(monthStart.getTime(), today.getTime() - 29 * DAY));
      const [categories, products, orders, promos, latest] = await Promise.all([
        categoryRepository.listAll(),
        productRepository.listAll(),
        orderRepository.listBetween(from, new Date(today.getTime() + DAY)),
        promotionRepository.listActive(),
        orderRepository.latest(5),
      ]);
      this.stats.value = {
        published: products.filter((p) => p.status === 'published').length,
        drafts: products.filter((p) => p.status === 'draft').length,
        outOfStock: products.filter((p) => p.status === 'published' && !p.inStock).length,
        categories: categories.length,
        activeCategories: categories.filter((c) => c.isActive).length,
      };

      const days = Array.from({ length: 30 }, (_, i) => ({ date: new Date(today.getTime() - (29 - i) * DAY), count: 0, total: 0 }));
      for (const o of orders) {
        if (!o.createdAt || o.status === 'cancelled') continue;
        const i = Math.round((startOfDay(o.createdAt).getTime() - days[0]!.date.getTime()) / DAY);
        if (i >= 0 && i < 30) {
          days[i]!.count++;
          days[i]!.total += o.total;
        }
      }
      const delivered = orders.filter((o) => o.status === 'delivered' && o.createdAt && o.createdAt >= monthStart);
      this.sales.value = {
        ordersToday: orders.filter((o) => o.createdAt && o.createdAt >= today && o.status !== 'cancelled').length,
        monthRevenue: delivered.reduce((n, o) => n + o.total, 0),
        monthDelivered: delivered.length,
        activePromos: promos.filter((p) => isPromoActive(p)).length,
        days,
        latest,
      };
    } catch {
      this.error.value = 'Impossible de charger les chiffres. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }
}
