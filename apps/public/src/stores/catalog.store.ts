// Catalogue public : catégories visibles et produits publiés, lus UNE fois par visite et partagés
// entre la vitrine et le panier (règle de fluidité n° 1 : tout le catalogue en une requête).
// Chargé à la demande : ce module importe le SDK Firebase.
import type { Category, Product, WithId } from '@celeste/shared/models';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';
import { cld } from '@celeste/shared/services/images';

export interface CatalogVariant {
  sku: string;
  label: string;
  price: number;
  /** Format actif et en stock (stock non suivi = disponible). */
  available: boolean;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  image: { src: string; alt: string } | null;
  variants: CatalogVariant[];
}

export interface Catalog {
  categories: WithId<Category>[];
  products: CatalogProduct[];
  byId: Map<string, CatalogProduct>;
}

let pending: Promise<Catalog> | null = null;

const toProduct = (p: WithId<Product>): CatalogProduct => {
  const photo = p.images?.[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    image: photo ? { src: cld(photo.url, 'c_limit,w_900'), alt: photo.alt || p.name } : null,
    variants: (p.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => ({ sku: v.sku, label: v.label, price: v.price, available: v.stock === null || v.stock > 0 })),
  };
};

export function loadCatalog(): Promise<Catalog> {
  pending ??= Promise.all([categoryRepository.listActive(), productRepository.listPublished()])
    .then(([categories, products]) => {
      const list = products.map(toProduct).filter((p) => p.variants.length > 0);
      return { categories, products: list, byId: new Map(list.map((p) => [p.id, p])) };
    })
    .catch((e) => {
      pending = null; // nouvel essai possible
      throw e;
    });
  return pending;
}
