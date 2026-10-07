// Garde d'accès : suit l'utilisateur Firebase, vérifie son rôle et l'état de son compte.
// Un compte sans rôle admin ou désactivé est déconnecté, avec un message sur l'écran de connexion.
import { signal } from '@preact/signals-core';
import {
  resolveAdminSession,
  signInAdmin,
  signOutAdmin,
  watchAuthUser,
  type AdminSession,
  type AuthErrorCode,
} from '@celeste/shared/services/auth.service';

export const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'E-mail ou mot de passe incorrect.',
  'too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  network: 'Pas de connexion internet. Vérifiez votre réseau, puis réessayez.',
  'not-admin': "Ce compte n'a pas accès à l'administration.",
  inactive: 'Ce compte est désactivé. Contactez la propriétaire de la boutique.',
  unknown: 'Une erreur est survenue. Réessayez.',
};

export const messageFor = (e: unknown) =>
  AUTH_MESSAGES[(e as { code?: AuthErrorCode })?.code ?? 'unknown'] ?? AUTH_MESSAGES.unknown;

/** Session admin vérifiée, ou null. */
export const session = signal<AdminSession | null>(null);
/** false tant que Firebase n'a pas indiqué si quelqu'un est connecté. */
export const authReady = signal(false);
/** Message à afficher sur l'écran de connexion après une déconnexion forcée. */
export const accessMessage = signal<string | null>(null);

let loggingIn = false;

export function initAuthGuard() {
  watchAuthUser(async (user) => {
    if (loggingIn) return; // signIn() résout lui-même la session
    if (!user) {
      session.value = null;
    } else if (session.value?.uid !== user.uid) {
      try {
        session.value = await resolveAdminSession(user);
      } catch (e) {
        session.value = null;
        accessMessage.value = messageFor(e);
      }
    }
    authReady.value = true;
  });
}

export async function signIn(email: string, password: string): Promise<void> {
  loggingIn = true;
  try {
    accessMessage.value = null;
    session.value = await signInAdmin(email, password);
  } finally {
    loggingIn = false;
  }
}

export async function signOut(): Promise<void> {
  await signOutAdmin();
  session.value = null;
}
