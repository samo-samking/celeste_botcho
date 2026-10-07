// ViewModel du tableau de bord : chiffres du catalogue (le catalogue est petit : tout est lu en une fois).
import { computed, signal } from '@preact/signals-core';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';

export interface CatalogStats {
  published: number;
  drafts: number;
  outOfStock: number;
  categories: number;
  activeCategories: number;
}

export class DashboardViewModel {
  readonly stats = signal<CatalogStats | null>(null);
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
      const [categories, products] = await Promise.all([categoryRepository.listAll(), productRepository.listAll()]);
      this.stats.value = {
        published: products.filter((p) => p.status === 'published').length,
        drafts: products.filter((p) => p.status === 'draft').length,
        outOfStock: products.filter((p) => p.status === 'published' && !p.inStock).length,
        categories: categories.length,
        activeCategories: categories.filter((c) => c.isActive).length,
      };
    } catch {
      this.error.value = 'Impossible de charger les chiffres. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }
}
