// Comptes admin (propriétaire) : liste, nom affiché, activation. Le rôle (custom claim) ne se
// modifie pas depuis le navigateur : `npm run set-admin` ou, plus tard, une fonction serveur.
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Admin, WithId } from '../models';
import { addAuditLog } from './audit-log.repository';
import { fromDoc } from './convert';

const col = collection(db, 'admins');

export const adminRepository = {
  async listAll(): Promise<WithId<Admin>[]> {
    const snap = await getDocs(col);
    return snap.docs
      .map((d) => fromDoc<Admin>(d))
      .sort((a, b) => (a.role === b.role ? a.displayName.localeCompare(b.displayName, 'fr') : a.role === 'owner' ? -1 : 1));
  },

  /** Désactiver : la personne est déconnectée à sa prochaine action et ne peut plus se reconnecter. */
  async setActive(admin: WithId<Admin>, isActive: boolean) {
    const batch = writeBatch(db);
    batch.update(doc(col, admin.id), { isActive });
    addAuditLog(batch, isActive ? 'admin.enable' : 'admin.disable', `admins/${admin.id}`, `${admin.displayName} (${admin.email})`);
    await batch.commit();
  },

  async rename(admin: WithId<Admin>, displayName: string) {
    const batch = writeBatch(db);
    batch.update(doc(col, admin.id), { displayName });
    addAuditLog(batch, 'admin.rename', `admins/${admin.id}`, `${admin.displayName} → ${displayName}`);
    await batch.commit();
  },
};
