// Livraison : tarif d'une zone, regroupement par mode (livraison en main propre / expédition).
import type { DeliveryMode, DeliveryZone } from '../models';

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  local: 'Livraison en main propre',
  shipping: 'Expédition',
};

/** Tarif de la zone, ou null si elle n'existe plus (la commande doit alors être refusée). */
export function deliveryFee(zones: DeliveryZone[], zoneId: string): number | null {
  return zones.find((z) => z.id === zoneId)?.fee ?? null;
}

export function zonesByMode(zones: DeliveryZone[]): Record<DeliveryMode, DeliveryZone[]> {
  return {
    local: zones.filter((z) => z.mode === 'local'),
    shipping: zones.filter((z) => z.mode === 'shipping'),
  };
}
