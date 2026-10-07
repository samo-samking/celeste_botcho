// Connexion Firebase Admin partagée par les scripts (seed, set-admin).
// - Émulateurs : aucune clé nécessaire.
// - Projet réel : `service-account.json` à la racine (ignoré par git) ou
//   `gcloud auth application-default login`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const root = join(import.meta.dirname, '../..');

export const EMULATOR = {
  firestore: '127.0.0.1:8080',
  auth: '127.0.0.1:9099',
};

export const projectId: string = JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8')).projects.default;

export function initAdmin({ emulator }: { emulator: boolean }) {
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR.firestore;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR.auth;
    // pas de recherche du serveur de métadonnées Google Cloud (lente, inutile avec les émulateurs)
    process.env.METADATA_SERVER_DETECTION = 'none';
    initializeApp({ projectId });
  } else {
    const keyFile = join(root, 'service-account.json');
    initializeApp({
      projectId,
      credential: existsSync(keyFile) ? cert(keyFile) : applicationDefault(),
    });
  }
  return { auth: getAuth(), db: getFirestore() };
}

/** Vérifie que les émulateurs tournent, sinon message clair plutôt qu'un timeout. */
export async function assertEmulatorsRunning(): Promise<void> {
  for (const [name, host] of Object.entries(EMULATOR)) {
    try {
      await fetch(`http://${host}/`);
    } catch {
      throw new Error(`Émulateur ${name} injoignable sur ${host}. Lancer d'abord : npm run emulators`);
    }
  }
}
