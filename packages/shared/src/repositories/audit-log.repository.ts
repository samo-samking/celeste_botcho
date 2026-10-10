// Journal des actions admin : toujours écrit dans le même batch que l'action journalisée.
// Lecture réservée à la propriétaire (règles), par pages de 50, plus récentes d'abord.
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, type DocumentSnapshot, type WriteBatch } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { AuditLog, WithId } from '../models';
import { fromDoc } from './convert';

const col = collection(db, 'auditLogs');
export const AUDIT_PAGE = 50;

export function addAuditLog(batch: WriteBatch, action: string, targetPath: string, summary: string) {
  batch.set(doc(col), {
    actorUid: auth.currentUser?.uid ?? 'inconnu',
    action,
    targetPath,
    summary,
    at: serverTimestamp(),
  });
}

export const auditLogRepository = {
  async list(after?: DocumentSnapshot | null): Promise<{ logs: WithId<AuditLog>[]; cursor: DocumentSnapshot | null }> {
    const c = [orderBy('at', 'desc'), ...(after ? [startAfter(after)] : []), limit(AUDIT_PAGE + 1)];
    const snap = await getDocs(query(col, ...c));
    const docs = snap.docs.slice(0, AUDIT_PAGE);
    return { logs: docs.map((d) => fromDoc<AuditLog>(d)), cursor: snap.docs.length > AUDIT_PAGE ? docs.at(-1)! : null };
  },
};
