// Conversions Firestore → application : Timestamp → Date (y compris dans les tableaux et objets
// imbriqués, ex. l'historique des statuts d'une commande), ajout de l'identifiant.
import { Timestamp, type DocumentSnapshot } from 'firebase/firestore';
import type { WithId } from '../models';

function convert(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate();
  if (Array.isArray(v)) return v.map(convert);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, convert(x)]));
  }
  return v;
}

export function fromDoc<T>(snap: DocumentSnapshot): WithId<T> {
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  return { ...(convert(data) as object), id: snap.id } as WithId<T>;
}
