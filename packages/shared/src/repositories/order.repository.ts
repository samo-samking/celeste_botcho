// Commandes (admin) : suivi en temps réel des commandes en cours, historique paginé, recherche,
// changement de statut en transaction (commande + historique + suivi cliente + stock + journal).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { ACTIVE_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus, type Product, type WithId } from '../models';
import { isInStock } from '../domain/catalog';
import { fromDoc } from './convert';

const col = collection(db, 'orders');
export const ORDERS_PAGE = 25;

export interface HistoryFilter {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
}
export interface OrdersPage {
  orders: WithId<Order>[];
  cursor: DocumentSnapshot | null; // null : dernière page
}

export const orderRepository = {
  /** Commandes en cours (nouvelles → expédiées), plus récentes d'abord, en temps réel. */
  watchActive(onChange: (orders: WithId<Order>[]) => void, onError: (e: Error) => void): Unsubscribe {
    const q = query(col, where('status', 'in', ACTIVE_STATUSES), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => fromDoc<Order>(d))), onError);
  },

  /** Historique filtré, 25 par page (curseur Firestore). */
  async listHistory(filter: HistoryFilter, after?: DocumentSnapshot | null): Promise<OrdersPage> {
    const c: QueryConstraint[] = [];
    if (filter.status) c.push(where('status', '==', filter.status));
    if (filter.from) c.push(where('createdAt', '>=', Timestamp.fromDate(filter.from)));
    if (filter.to) c.push(where('createdAt', '<', Timestamp.fromDate(filter.to)));
    c.push(orderBy('createdAt', 'desc'));
    if (after) c.push(startAfter(after));
    c.push(limit(ORDERS_PAGE + 1));
    const snap = await getDocs(query(col, ...c));
    const docs = snap.docs.slice(0, ORDERS_PAGE);
    return { orders: docs.map((d) => fromDoc<Order>(d)), cursor: snap.docs.length > ORDERS_PAGE ? docs.at(-1)! : null };
  },

  /** Toutes les commandes d'une période (export CSV, graphique du tableau de bord). */
  async listBetween(from: Date, to: Date): Promise<WithId<Order>[]> {
    const q = query(col, where('createdAt', '>=', Timestamp.fromDate(from)), where('createdAt', '<', Timestamp.fromDate(to)), orderBy('createdAt', 'desc'));
    return (await getDocs(q)).docs.map((d) => fromDoc<Order>(d));
  },

  async latest(n: number): Promise<WithId<Order>[]> {
    return (await getDocs(query(col, orderBy('createdAt', 'desc'), limit(n)))).docs.map((d) => fromDoc<Order>(d));
  },

  async get(orderNumber: string): Promise<WithId<Order> | null> {
    const snap = await getDoc(doc(col, orderNumber));
    return snap.exists() ? fromDoc<Order>(snap) : null;
  },

  async byPhone(phone: string): Promise<WithId<Order>[]> {
    const q = query(col, where('customer.phone', '==', phone), orderBy('createdAt', 'desc'), limit(50));
    return (await getDocs(q)).docs.map((d) => fromDoc<Order>(d));
  },

  /**
   * Change le statut. Au passage en « confirmée », le stock suivi des formats est décrémenté ;
   * une commande annulée après confirmation le restitue. Annulation : motif obligatoire.
   */
  async setStatus(orderNumber: string, status: OrderStatus, { reason }: { reason?: string } = {}) {
    const uid = auth.currentUser?.uid ?? 'admin';
    await runTransaction(db, async (tx) => {
      const ref = doc(col, orderNumber);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Commande introuvable.');
      const order = fromDoc<Order>(snap);
      if (order.status === status) return;
      if (order.status === 'cancelled' || order.status === 'delivered') throw new Error('Cette commande est terminée : son statut ne peut plus changer.');
      if (status === 'cancelled' && !reason?.trim()) throw new Error("Indiquez le motif de l'annulation.");

      // stock : lu avant toute écriture (règle des transactions)
      const deduct = !order.stockDeducted && status !== 'cancelled' && status !== 'new';
      const restore = !!order.stockDeducted && status === 'cancelled';
      const productIds = deduct || restore ? [...new Set(order.items.map((i) => i.productId))] : [];
      const products = await Promise.all(productIds.map((id) => tx.get(doc(db, 'products', id))));

      for (const p of products) {
        if (!p.exists()) continue;
        const product = fromDoc<Product>(p);
        let changed = false;
        const variants = product.variants.map((v) => {
          const qty = order.items.filter((i) => i.productId === p.id && i.sku === v.sku).reduce((n, i) => n + i.qty, 0);
          if (!qty || v.stock === null) return v; // stock non suivi
          changed = true;
          return { ...v, stock: Math.max(0, v.stock + (restore ? qty : -qty)) };
        });
        if (changed) tx.update(p.ref, { variants, inStock: isInStock(variants), updatedAt: serverTimestamp() });
      }

      const now = Timestamp.now();
      tx.update(ref, {
        status,
        statusHistory: [...order.statusHistory.map((h) => ({ ...h, at: Timestamp.fromDate(h.at) })), { status, at: now, by: uid }],
        ...(status === 'cancelled' ? { cancelReason: reason!.trim() } : {}),
        ...(status === 'delivered' && order.payment.method === 'cash_on_delivery' ? { 'payment.status': 'paid' } : {}),
        ...(deduct ? { stockDeducted: true } : restore ? { stockDeducted: false } : {}),
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, 'orderTracking', order.trackingId), { orderNumber, status, updatedAt: serverTimestamp() }, { merge: true });
      tx.set(doc(collection(db, 'auditLogs')), {
        actorUid: uid,
        action: status === 'cancelled' ? 'order.cancel' : 'order.status',
        targetPath: `orders/${orderNumber}`,
        summary: `${orderNumber} : ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[status]}${reason ? ` (${reason.trim()})` : ''}`,
        at: serverTimestamp(),
      });
    });
  },

  async setAdminNote(orderNumber: string, adminNote: string) {
    await updateDoc(doc(col, orderNumber), { adminNote: adminNote.trim().slice(0, 1000), updatedAt: serverTimestamp() });
  },

  async setPaid(orderNumber: string, paid: boolean) {
    await updateDoc(doc(col, orderNumber), { 'payment.status': paid ? 'paid' : 'pending', updatedAt: serverTimestamp() });
  },
};
