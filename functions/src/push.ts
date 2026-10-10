// Notifications push vers les appareils des admins (jetons FCM enregistrés dans pushTokens/).
// Les jetons expirés ou révoqués sont supprimés au passage.
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

/** Adresse de l'admin en ligne (le clic sur la notification ouvre l'écran concerné). */
export const ADMIN_URL = 'https://celestebotcho-admin.web.app';

const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

export async function notifyAdmins({ title, body, path, tag }: { title: string; body: string; path: string; tag: string }) {
  const db = getFirestore();
  const snap = await db.collection('pushTokens').get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) {
    logger.info('Aucun appareil abonné aux alertes', { tag });
    return;
  }
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { icon: `${ADMIN_URL}/icons/icon-192.png`, badge: `${ADMIN_URL}/icons/icon-192.png`, tag, renotify: true },
      fcmOptions: { link: `${ADMIN_URL}${path}` },
    },
  });
  const stale = res.responses.flatMap((r, i) => (!r.success && r.error && GONE.has(r.error.code) ? [tokens[i]!] : []));
  await Promise.all(stale.map((t) => db.doc(`pushTokens/${t}`).delete()));
  logger.info('Alerte envoyée', { tag, envoyées: res.successCount, échecs: res.failureCount, retirés: stale.length });
}
