// Catégories (admin). Renommer une catégorie met à jour `categoryName` de ses produits dans le même batch.
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Category, WithId } from '../models';
import type { CategoryInput } from '../validation/category.validation';
import { addAuditLog } from './audit-log.repository';
import { fromDoc } from './convert';

const col = collection(db, 'categories');

export const categoryRepository = {
  /** Site public : catégories visibles, dans l'ordre de l'admin (tri en mémoire : pas d'index composite). */
  async listActive(): Promise<WithId<Category>[]> {
    const snap = await getDocs(query(col, where('isActive', '==', true)));
    return snap.docs.map((d) => fromDoc<Category>(d)).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async listAll(): Promise<WithId<Category>[]> {
    const snap = await getDocs(query(col, orderBy('sortOrder')));
    return snap.docs.map((d) => fromDoc<Category>(d));
  },

  async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const snap = await getDocs(query(col, where('slug', '==', slug)));
    return snap.docs.some((d) => d.id !== exceptId);
  },

  /** Crée (previous absent) ou met à jour une catégorie ; renvoie son identifiant. */
  async save(input: CategoryInput, previous?: WithId<Category>, nextSortOrder = 0): Promise<string> {
    const batch = writeBatch(db);
    const ref = previous ? doc(col, previous.id) : doc(col);
    if (!previous) {
      batch.set(ref, { ...input, sortOrder: nextSortOrder, productCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      addAuditLog(batch, 'category.create', ref.path, input.name);
    } else {
      batch.update(ref, { ...input, updatedAt: serverTimestamp() });
      if (previous.name !== input.name) {
        const products = await getDocs(query(collection(db, 'products'), where('categoryId', '==', previous.id)));
        products.forEach((p) => batch.update(p.ref, { categoryName: input.name }));
        addAuditLog(batch, 'category.rename', ref.path, `${previous.name} → ${input.name}`);
      }
    }
    await batch.commit();
    return ref.id;
  },

  async setActive(id: string, isActive: boolean) {
    await updateDoc(doc(col, id), { isActive, updatedAt: serverTimestamp() });
  },

  /** Nouvel ordre d'affichage : identifiants dans l'ordre voulu. */
  async reorder(ids: string[]) {
    const batch = writeBatch(db);
    ids.forEach((id, i) => batch.update(doc(col, id), { sortOrder: i }));
    await batch.commit();
  },

  /** Refusé si un produit (même brouillon) utilise encore la catégorie. */
  async remove(id: string) {
    const count = (await getCountFromServer(query(collection(db, 'products'), where('categoryId', '==', id)))).data().count;
    if (count > 0) throw new Error(`Cette catégorie contient ${count} produit${count > 1 ? 's' : ''} : désactivez-la plutôt.`);
    await deleteDoc(doc(col, id));
  },
};
