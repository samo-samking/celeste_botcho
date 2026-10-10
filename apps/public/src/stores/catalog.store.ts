// Catalogue public : catégories visibles et produits publiés, lus UNE fois par visite et partagés
// entre la vitrine et le panier (règle de fluidité n° 1 : tout le catalogue en une requête).
// Gardé 10 min sur le téléphone : une visite récente s'affiche aussitôt, sans attendre Firebase
// (le SDK n'est chargé que pour une vraie lecture). Les prix sont de toute façon revérifiés à la commande.
import type { Category, Product, WithId } from '@celeste/shared/models';
import { cld } from '@celeste/shared/services/images';

const CACHE_KEY = 'cb-catalog-v1'; // la version permet de changer le format plus tard
const CACHE_TTL = 10 * 60_000;
type CachedCategory = Pick<WithId<Category>, 'id' | 'name' | 'slug' | 'description' | 'color' | 'imageUrl' | 'sortOrder' | 'isActive'>;

export interface CatalogVariant {
  sku: string;
  label: string;
  price: number;
  /** Format actif et en stock (stock non suivi = disponible). */
  available: boolean;
  /** Photo propre au format (choisie dans l'admin), sinon null : on garde la photo du produit. */
  image: { src: string; alt: string } | null;
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
  const photoOf = (url: string | null | undefined) => {
    const img = url ? p.images?.find((i) => i.url === url) : undefined;
    return img ? { src: cld(img.url, 'c_limit,w_900'), alt: img.alt || p.name } : null;
  };
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    image: photo ? { src: cld(photo.url, 'c_limit,w_900'), alt: photo.alt || p.name } : null,
    variants: (p.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => ({ sku: v.sku, label: v.label, price: v.price, available: v.stock === null || v.stock > 0, image: photoOf(v.image) })),
  };
};

const build = (categories: WithId<Category>[], products: CatalogProduct[]): Catalog => ({
  categories,
  products,
  byId: new Map(products.map((p) => [p.id, p])),
});

function readCache(): Catalog | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; categories: CachedCategory[]; products: CatalogProduct[] } | null;
    if (!raw || Date.now() - raw.at > CACHE_TTL || !Array.isArray(raw.categories) || !Array.isArray(raw.products)) return null;
    return build(raw.categories as WithId<Category>[], raw.products);
  } catch {
    return null;
  }
}

function writeCache(categories: WithId<Category>[], products: CatalogProduct[]) {
  try {
    const slim: CachedCategory[] = categories.map(({ id, name, slug, description, color, imageUrl, sortOrder, isActive }) => ({ id, name, slug, description, color, imageUrl, sortOrder, isActive }));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), categories: slim, products }));
  } catch {
    /* stockage plein ou indisponible : sans conséquence */
  }
}

async function fetchCatalog(): Promise<Catalog> {
  const [{ categoryRepository }, { productRepository }] = await Promise.all([
    import('@celeste/shared/repositories/category.repository'),
    import('@celeste/shared/repositories/product.repository'),
  ]);
  const [categories, products] = await Promise.all([categoryRepository.listActive(), productRepository.listPublished()]);
  const list = products.map(toProduct).filter((p) => p.variants.length > 0);
  writeCache(categories, list);
  return build(categories, list);
}

/** Catalogue de la visite : cache récent du téléphone, sinon lecture Firestore (une seule fois). */
export function loadCatalog(): Promise<Catalog> {
  pending ??= Promise.resolve(readCache() ?? fetchCatalog())
    .catch((e) => {
      pending = null; // nouvel essai possible
      throw e;
    });
  return pending;
}

/** Catalogue relu dans Firestore (sans le cache du téléphone) : prix et stocks à jour pour commander. */
export function refreshCatalog(): Promise<Catalog> {
  pending = fetchCatalog().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}
