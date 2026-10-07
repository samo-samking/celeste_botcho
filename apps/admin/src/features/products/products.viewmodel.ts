// ViewModel des produits : liste filtrée (recherche, catégorie, statut, rupture), enregistrement,
// changement de statut, ordre d'affichage, suppression. Le catalogue est petit : tout est lu en une fois.
import { computed, signal } from '@preact/signals-core';
import type { Category, Product, ProductStatus, WithId } from '@celeste/shared/models';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { productRepository, STATUS_LABELS } from '@celeste/shared/repositories/product.repository';
import { validateProduct, type ProductInput } from '@celeste/shared/validation/product.validation';

export type StatusFilter = ProductStatus | 'all';

/** Texte comparable : minuscules, sans accents. */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Champs modifiables d'un produit existant, pour le réenregistrer avec un autre statut. */
export function toInput(p: WithId<Product>): ProductInput {
  return {
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    composition: p.composition ?? '',
    usage: p.usage ?? '',
    precautions: p.precautions ?? '',
    images: p.images ?? [],
    variants: p.variants ?? [],
    status: p.status,
    isFeatured: !!p.isFeatured,
    sortOrder: p.sortOrder ?? 0,
    seo: p.seo ?? { title: '', description: '' },
  };
}

export class ProductsViewModel {
  readonly list = signal<WithId<Product>[]>([]);
  readonly categories = signal<WithId<Category>[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pending = signal<string | null>(null);

  readonly search = signal('');
  readonly categoryId = signal('');
  readonly status = signal<StatusFilter>('all');
  readonly outOfStock = signal(false);

  readonly hasFilters = computed(
    () => !!this.search.value.trim() || !!this.categoryId.value || this.status.value !== 'all' || this.outOfStock.value,
  );

  readonly counts = computed(() => {
    const c: Record<StatusFilter, number> = { all: 0, draft: 0, published: 0, archived: 0 };
    for (const p of this.list.value) {
      c.all++;
      c[p.status]++;
    }
    return c;
  });

  readonly filtered = computed(() => {
    const q = normalize(this.search.value.trim());
    return this.list.value.filter(
      (p) =>
        (this.status.value === 'all' || p.status === this.status.value) &&
        (!this.categoryId.value || p.categoryId === this.categoryId.value) &&
        (!this.outOfStock.value || !p.inStock) &&
        (!q || normalize(`${p.name} ${p.categoryName} ${p.variants.map((v) => v.sku).join(' ')}`).includes(q)),
    );
  });

  statusLabel = (s: ProductStatus) => STATUS_LABELS[s];

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const [products, categories] = await Promise.all([productRepository.listAll(), categoryRepository.listAll()]);
      this.list.value = products;
      this.categories.value = categories;
    } catch {
      this.error.value = 'Impossible de charger les produits. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  resetFilters() {
    this.search.value = '';
    this.categoryId.value = '';
    this.status.value = 'all';
    this.outOfStock.value = false;
  }

  /** Enregistre ; renvoie les erreurs par champ, ou null si tout s'est bien passé. */
  async save(input: ProductInput, previous?: WithId<Product>): Promise<Record<string, string> | null> {
    const checked = validateProduct(input);
    if (!checked.ok) return checked.errors;
    if (await productRepository.slugTaken(checked.value.slug, previous?.id)) {
      return { slug: 'Cette adresse est déjà utilisée par un autre produit.' };
    }
    const category = this.categories.value.find((c) => c.id === checked.value.categoryId);
    const next = this.list.value.reduce((max, p) => Math.max(max, (p.sortOrder ?? 0) + 1), 0);
    await productRepository.save(checked.value, category?.name ?? '', previous, next);
    await this.load();
    return null;
  }

  /** Publier, repasser en brouillon, archiver ou restaurer depuis la liste. */
  async setStatus(product: WithId<Product>, status: ProductStatus): Promise<Record<string, string> | null> {
    this.pending.value = product.id;
    try {
      return await this.save({ ...toInput(product), status }, product);
    } finally {
      this.pending.value = null;
    }
  }

  async move(id: string, to: number) {
    const list = [...this.list.value];
    const from = list.findIndex((p) => p.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    list.splice(to, 0, list.splice(from, 1)[0]!);
    const previous = this.list.value;
    this.list.value = list.map((p, i) => ({ ...p, sortOrder: i }));
    this.pending.value = id;
    try {
      await productRepository.reorder(list.map((p) => p.id));
    } catch (e) {
      this.list.value = previous;
      throw e;
    } finally {
      this.pending.value = null;
    }
  }

  async remove(product: WithId<Product>) {
    await productRepository.remove(product);
    this.list.value = this.list.value.filter((p) => p.id !== product.id);
  }
}
