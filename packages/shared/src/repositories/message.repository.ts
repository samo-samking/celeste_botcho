// Messages du formulaire de contact (admin) : boîte de réception en temps réel, statut, suppression.
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Message, MessageStatus, WithId } from '../models';
import { fromDoc } from './convert';

const col = collection(db, 'messages');

export const messageRepository = {
  /** Les 200 derniers messages, plus récents d'abord, en temps réel. */
  watch(onChange: (messages: WithId<Message>[]) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(query(col, orderBy('createdAt', 'desc'), limit(200)), (snap) => onChange(snap.docs.map((d) => fromDoc<Message>(d))), onError);
  },

  async setStatus(id: string, status: MessageStatus) {
    await updateDoc(doc(col, id), { status });
  },

  /** Suppression définitive (propriétaire uniquement, règles). */
  async remove(id: string) {
    await deleteDoc(doc(col, id));
  },
};
