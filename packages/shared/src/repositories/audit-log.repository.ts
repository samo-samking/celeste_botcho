// Journal des actions admin : toujours écrit dans le même batch que l'action journalisée.
import { collection, doc, serverTimestamp, type WriteBatch } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export function addAuditLog(batch: WriteBatch, action: string, targetPath: string, summary: string) {
  batch.set(doc(collection(db, 'auditLogs')), {
    actorUid: auth.currentUser?.uid ?? 'inconnu',
    action,
    targetPath,
    summary,
    at: serverTimestamp(),
  });
}
