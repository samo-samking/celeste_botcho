// Création d'une commande par une cliente (site public) : la commande et son document de suivi,
// écrits ensemble. Les règles Firestore vérifient le statut « new », l'heure serveur, le numéro,
// le téléphone, le nombre d'articles et le total ; une commande existante ne peut pas être
// réécrite (refus), on retente alors avec un autre numéro.
import { doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Order } from '../models';
import { trackingId } from '../utils/hash';
import { newOrderNumber } from '../utils/order-number';

export type NewOrder = Omit<Order, 'orderNumber' | 'status' | 'statusHistory' | 'trackingId' | 'adminNote' | 'cancelReason' | 'consentAt' | 'createdAt' | 'updatedAt' | 'stockDeducted'>;

export const checkoutRepository = {
  /** Enregistre la commande ; renvoie son numéro. */
  async create(order: NewOrder): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const orderNumber = newOrderNumber();
      const tracking = await trackingId(orderNumber, order.customer.phone);
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', orderNumber), {
        ...order,
        orderNumber,
        status: 'new',
        statusHistory: [{ status: 'new', at: Timestamp.now(), by: 'customer' }],
        trackingId: tracking,
        adminNote: '',
        cancelReason: null,
        consentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'orderTracking', tracking), { orderNumber, status: 'new', updatedAt: serverTimestamp() });
      try {
        await batch.commit();
        return orderNumber;
      } catch (e) {
        lastError = e;
        if ((e as { code?: string }).code !== 'permission-denied') break; // réseau, etc. : inutile de retenter
      }
    }
    throw lastError;
  },
};
