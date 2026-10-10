// Notifications push de l'admin (Firebase Cloud Messaging) : abonne cet appareil, enregistre son
// jeton dans pushTokens/{jeton} ; les Cloud Functions envoient une notification à chaque nouvelle
// commande ou nouveau message, même quand l'admin est fermé.
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, auth, db, firebaseConfig } from './firebase';

const LOCAL_KEY = 'cb-admin-push-token';
const SW_URL = '/firebase-messaging-sw.js';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

/** Nom lisible de l'appareil : « Chrome · Android ». */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'Autre';
  return `${browser} · ${os}`;
}

/** Service worker de FCM : la configuration (publique) lui est passée dans l'adresse. */
async function registerWorker() {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  return navigator.serviceWorker.register(`${SW_URL}?${params}`, { scope: '/firebase-cloud-messaging-push-scope' });
}

export async function pushState(): Promise<PushState> {
  if (!(await isSupported().catch(() => false)) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const token = localStorage.getItem(LOCAL_KEY);
  if (!token || Notification.permission !== 'granted') return 'off';
  const snap = await getDoc(doc(db, 'pushTokens', token)).catch(() => null);
  return snap?.exists() ? 'on' : 'off';
}

/** Demande l'autorisation, abonne l'appareil et l'enregistre ; renvoie l'état final. */
export async function enablePush(vapidKey: string): Promise<PushState> {
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const registration = await registerWorker();
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  const uid = auth.currentUser?.uid;
  if (!token || !uid) return 'off';
  await setDoc(doc(db, 'pushTokens', token), { uid, label: deviceLabel(), createdAt: serverTimestamp() });
  localStorage.setItem(LOCAL_KEY, token);
  return 'on';
}

/** Désabonne cet appareil (le jeton est supprimé chez Firebase et dans la base). */
export async function disablePush(): Promise<PushState> {
  const token = localStorage.getItem(LOCAL_KEY);
  if (token) {
    await deleteDoc(doc(db, 'pushTokens', token)).catch(() => undefined);
    await deleteToken(getMessaging(app)).catch(() => undefined);
    localStorage.removeItem(LOCAL_KEY);
  }
  return 'off';
}
