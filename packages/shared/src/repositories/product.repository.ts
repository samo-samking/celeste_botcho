// Produits (admin). Calcule minPrice, inStock et categoryName ; tient à jour productCount des
// catégories et journalise prix / publication / archivage, le tout dans un seul batch.
import { collection, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product, ProductStatus, WithId } from '../models';
import type { ProductInput } from '../validation/product.validation';
import { isInStock, minActivePrice } from '../domain/catalog';
import { addAuditLog } from './audit-log.repository';
import { fromDoc } from './convert';

const col = collection(db, 'products');

const STATUS_ACTIONS: Record<ProductStatus, string> = {
  draft: 'product.unpublish',
  published: 'product.publish',
  archived: 'product.archive',
};
export const STATUS_LABELS: Record<ProductStatus, string> = { draft: 'Brouillon', published: 'Publié', archived: 'Archivé' };

export const productRepository = {
  /** Site public : produits publiés, dans l'ordre de l'admin (index status + sortOrder). */
  async listPublished(): Promise<WithId<Product>[]> {
    const snap = await getDocs(query(col, where('status', '==', 'published'), orderBy('sortOrder')));
    return snap.docs.map((d) => fromDoc<Product>(d));
  },

  async listAll(): Promise<WithId<Product>[]> {
    const snap = await getDocs(query(col, orderBy('sortOrder')));
    return snap.docs.map((d) => fromDoc<Product>(d));
  },

  async get(id: string): Promise<WithId<Product> | null> {
    const snap = await getDoc(doc(col, id));
    return snap.exists() ? fromDoc<Product>(snap) : null;
  },

  async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const snap = await getDocs(query(col, where('slug', '==', slug)));
    return snap.docs.some((d) => d.id !== exceptId);
  },

  /** Crée (previous absent) ou met à jour un produit ; renvoie son identifiant. */
  async save(input: ProductInput, categoryName: string, previous?: WithId<Product>, nextSortOrder = 0): Promise<string> {
    const batch = writeBatch(db);
    const ref = previous ? doc(col, previous.id) : doc(col);
    const data = {
      ...input,
      categoryName,
      minPrice: minActivePrice(input.variants),
      inStock: isInStock(input.variants),
      updatedAt: serverTimestamp(),
    };

    if (previous) batch.update(ref, data);
    else batch.set(ref, { ...data, sortOrder: nextSortOrder, createdAt: serverTimestamp() });

    // productCount = nombre de produits publiés de la catégorie
    const before = previous?.status === 'published' ? previous.categoryId : null;
    const after = input.status === 'published' ? input.categoryId : null;
    if (before !== after) {
      if (before) batch.update(doc(db, 'categories', before), { productCount: increment(-1) });
      if (after) batch.update(doc(db, 'categories', after), { productCount: increment(1) });
    }

    // journal
    if (!previous) {
      addAuditLog(batch, 'product.create', ref.path, `${input.name} (${STATUS_LABELS[input.status].toLowerCase()})`);
    } else {
      if (previous.status !== input.status) {
        const from = STATUS_LABELS[previous.status].toLowerCase();
        const to = STATUS_LABELS[input.status].toLowerCase();
        addAuditLog(batch, STATUS_ACTIONS[input.status], ref.path, `${input.name} : ${from} → ${to}`);
      }
      const old = new Map(previous.variants.map((v) => [v.sku, v.price]));
      const changes = input.variants
        .filter((v) => old.has(v.sku) && old.get(v.sku) !== v.price)
        .map((v) => `prix ${v.label} : ${old.get(v.sku)} → ${v.price}`);
      if (changes.length) addAuditLog(batch, 'product.price', ref.path, changes.join(' ; '));
    }

    await batch.commit();
    return ref.id;
  },

  /** Nouvel ordre d'affichage : identifiants dans l'ordre voulu. */
  async reorder(ids: string[]) {
    const batch = writeBatch(db);
    ids.forEach((id, i) => batch.update(doc(col, id), { sortOrder: i }));
    await batch.commit();
  },

  /** Suppression définitive : seulement un brouillon ou un produit archivé. */
  async remove(product: WithId<Product>) {
    if (product.status === 'published') throw new Error("Un produit publié ne peut pas être supprimé : archivez-le d'abord.");
    const batch = writeBatch(db);
    batch.delete(doc(col, product.id));
    addAuditLog(batch, 'product.delete', `products/${product.id}`, product.name);
    await batch.commit();
  },
};
