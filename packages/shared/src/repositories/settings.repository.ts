// Réglages : settings/public (lu par le site, une lecture par visite) et settings/legal.
// Écriture réservée à la propriétaire (règles) ; chaque enregistrement est journalisé.
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DEFAULT_LEGAL_SETTINGS, DEFAULT_PUBLIC_SETTINGS, type DeliveryZone, type LegalSettings, type PublicSettings } from '../models';
import type { LegalSettingsInput, PublicSettingsInput } from '../validation/settings.validation';
import { addAuditLog } from './audit-log.repository';
import { fromDoc } from './convert';

const publicRef = doc(db, 'settings', 'public');
const legalRef = doc(db, 'settings', 'legal');

/** Valeurs par défaut complétées par le document (champs absents = valeur par défaut). */
function withDefaults<T extends object>(defaults: T, data: Partial<T> | null): T {
  if (!data) return { ...defaults };
  const out = { ...defaults } as Record<string, unknown>;
  for (const [k, v] of Object.entries(data)) if (v !== undefined && k !== 'id') out[k] = v;
  return out as T;
}

export const settingsRepository = {
  async getPublic(): Promise<PublicSettings> {
    const snap = await getDoc(publicRef);
    return withDefaults(DEFAULT_PUBLIC_SETTINGS, snap.exists() ? fromDoc<PublicSettings>(snap) : null);
  },

  async getLegal(): Promise<LegalSettings> {
    const snap = await getDoc(legalRef);
    return withDefaults(DEFAULT_LEGAL_SETTINGS, snap.exists() ? fromDoc<LegalSettings>(snap) : null);
  },

  /**
   * Enregistre les réglages modifiés (public et/ou légal) en une fois. Fusion : les champs gérés
   * ailleurs (zones de livraison, carrousel) ne sont pas touchés.
   */
  async save({ publicInput, legalInput, summary }: { publicInput?: PublicSettingsInput; legalInput?: LegalSettingsInput; summary: string }) {
    const batch = writeBatch(db);
    if (publicInput) batch.set(publicRef, { ...publicInput, updatedAt: serverTimestamp() }, { merge: true });
    if (legalInput) batch.set(legalRef, { ...legalInput, updatedAt: serverTimestamp() }, { merge: true });
    addAuditLog(batch, 'settings.update', publicInput ? 'settings/public' : 'settings/legal', summary);
    await batch.commit();
  },

  /** Zones de livraison (écran Livraison) : seul le champ deliveryZones est modifié. */
  async saveDeliveryZones(zones: DeliveryZone[], summary: string) {
    const batch = writeBatch(db);
    batch.set(publicRef, { deliveryZones: zones, updatedAt: serverTimestamp() }, { merge: true });
    addAuditLog(batch, 'delivery.update', 'settings/public', summary);
    await batch.commit();
  },
};
