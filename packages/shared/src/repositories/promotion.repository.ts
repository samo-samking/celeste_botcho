// Promotions (admin) : liste, création / modification, activation, suppression ; journalisées.
import { collection, doc, getDocs, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Promotion, WithId } from '../models';
import type { PromotionInput } from '../validation/promotion.validation';
import { addAuditLog } from './audit-log.repository';
import { fromDoc } from './convert';

const col = collection(db, 'promotions');

const toFirestore = (p: PromotionInput) => ({
  ...p,
  startsAt: Timestamp.fromDate(p.startsAt),
  endsAt: Timestamp.fromDate(p.endsAt),
});

export const promotionRepository = {
  async listAll(): Promise<WithId<Promotion>[]> {
    return (await getDocs(query(col, orderBy('startsAt', 'desc')))).docs.map((d) => fromDoc<Promotion>(d));
  },

  /** Site public : promos actives non terminées (la date de début est vérifiée en mémoire). */
  async listActive(): Promise<WithId<Promotion>[]> {
    const q = query(col, where('isActive', '==', true), where('endsAt', '>=', Timestamp.now()));
    return (await getDocs(q)).docs.map((d) => fromDoc<Promotion>(d));
  },

  async save(input: PromotionInput, previous?: WithId<Promotion>): Promise<string> {
    const batch = writeBatch(db);
    const ref = previous ? doc(col, previous.id) : doc(col);
    if (previous) batch.update(ref, toFirestore(input));
    else batch.set(ref, { ...toFirestore(input), createdAt: serverTimestamp() });
    addAuditLog(batch, previous ? 'promotion.update' : 'promotion.create', ref.path, input.title);
    await batch.commit();
    return ref.id;
  },

  async setActive(promo: WithId<Promotion>, isActive: boolean) {
    const batch = writeBatch(db);
    batch.update(doc(col, promo.id), { isActive });
    addAuditLog(batch, isActive ? 'promotion.enable' : 'promotion.disable', `promotions/${promo.id}`, promo.title);
    await batch.commit();
  },

  async remove(promo: WithId<Promotion>) {
    const batch = writeBatch(db);
    batch.delete(doc(col, promo.id));
    addAuditLog(batch, 'promotion.delete', `promotions/${promo.id}`, promo.title);
    await batch.commit();
  },
};
