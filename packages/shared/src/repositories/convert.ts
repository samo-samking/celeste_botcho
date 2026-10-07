// Conversions Firestore → application : Timestamp → Date, ajout de l'identifiant.
import { Timestamp, type DocumentSnapshot } from 'firebase/firestore';
import type { WithId } from '../models';

export function fromDoc<T>(snap: DocumentSnapshot): WithId<T> {
  const data = snap.data() ?? {};
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) out[k] = v instanceof Timestamp ? v.toDate() : v;
  return out as WithId<T>;
}
