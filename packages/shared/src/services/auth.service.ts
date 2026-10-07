// Authentification de l'admin (e-mail + mot de passe).
// Un compte n'a accès que s'il porte le custom claim `role` (owner | manager) et que
// admins/{uid}.isActive n'est pas false ; sinon il est déconnecté aussitôt.
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AdminRole = 'owner' | 'manager';

export interface AdminSession {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
}

export type AuthErrorCode = 'invalid-credentials' | 'too-many-requests' | 'network' | 'not-admin' | 'inactive' | 'unknown';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

function toAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new AuthError('invalid-credentials');
    case 'auth/too-many-requests':
      return new AuthError('too-many-requests');
    case 'auth/network-request-failed':
      return new AuthError('network');
    case 'auth/user-disabled':
      return new AuthError('inactive');
    default:
      return new AuthError('unknown');
  }
}

/** Vérifie les droits d'un utilisateur connecté ; le déconnecte s'il n'est pas admin actif. */
export async function resolveAdminSession(user: User, { recordLogin = false } = {}): Promise<AdminSession> {
  try {
    const token = await user.getIdTokenResult(recordLogin); // jeton rafraîchi à la connexion : rôle à jour
    const role = token.claims.role;
    if (role !== 'owner' && role !== 'manager') throw new AuthError('not-admin');

    const ref = doc(db, 'admins', user.uid);
    const profile = await getDoc(ref);
    if (profile.exists() && profile.data().isActive === false) throw new AuthError('inactive');
    if (!profile.exists() && role === 'owner') {
      // compte propriétaire créé hors de l'application : sa fiche est créée à la première connexion
      await setDoc(ref, {
        displayName: user.displayName || user.email || 'Propriétaire',
        email: user.email ?? '',
        role,
        isActive: true,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }).catch(() => undefined);
    } else if (recordLogin && profile.exists()) {
      await updateDoc(ref, { lastLoginAt: serverTimestamp() }).catch(() => undefined); // non bloquant
    }

    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: (profile.exists() && (profile.data().displayName as string)) || user.displayName || user.email || '',
      role,
    };
  } catch (e) {
    await signOut(auth);
    throw toAuthError(e);
  }
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  let user: User;
  try {
    user = (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
  } catch (e) {
    throw toAuthError(e);
  }
  return resolveAdminSession(user, { recordLogin: true });
}

export function signOutAdmin(): Promise<void> {
  return signOut(auth);
}

/** Toujours « envoyé » pour un e-mail inconnu : on ne révèle pas quels comptes existent. */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    const err = toAuthError(e);
    if (err.code !== 'invalid-credentials') throw err;
  }
}

/** Premier état connu de l'authentification (utilisateur ou null), puis chaque changement. */
export function watchAuthUser(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
