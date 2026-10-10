// orderTracking/{sha256(orderNumber + '|' + phone)} : suivi sans compte. La cliente saisit son
// numéro de commande et son téléphone ; le navigateur calcule l'empreinte et lit ce seul document.
import type { OrderStatus } from './order';

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  updatedAt: Date | null;
}
