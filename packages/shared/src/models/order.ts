// Commande (architecture §4). Les articles sont une copie figée : si un prix change demain,
// la commande d'hier reste exacte. L'identifiant du document est le numéro de commande.
import type { DeliveryMode } from './settings';

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'mobile_money';
export type PaymentStatus = 'pending' | 'paid';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string; // copie
  variantLabel: string; // copie
  unitPrice: number; // copie du prix catalogue ; l'économie des promos est dans Order.discount
  qty: number;
  lineTotal: number;
}

export interface StatusChange {
  status: OrderStatus;
  at: Date;
  by: string; // 'customer' ou uid de l'admin
}

export interface Order {
  orderNumber: string; // 'CB-261006-7K3F'
  status: OrderStatus;
  customer: { name: string; phone: string; city: string; address: string; email?: string | null };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  delivery: { mode: DeliveryMode; zoneId: string; zoneName: string; fee: number };
  total: number;
  payment: { method: PaymentMethod; status: PaymentStatus };
  customerNote: string;
  adminNote: string; // admin uniquement
  cancelReason: string | null;
  statusHistory: StatusChange[];
  trackingId: string; // ID du document orderTracking
  /** Stock déjà décrémenté (passage en « confirmée ») : à restituer en cas d'annulation. */
  stockDeducted?: boolean;
  consentAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nouvelle',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

/** Parcours normal d'une commande. */
export const ORDER_FLOW: OrderStatus[] = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];
/** Commandes « en cours » : suivies en temps réel dans l'admin. */
export const ACTIVE_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'shipped'];

/** Étape suivante du parcours (null : livrée ou annulée). */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(status);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1]! : null;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: 'Paiement à la livraison',
  mobile_money: 'Mobile money',
};
