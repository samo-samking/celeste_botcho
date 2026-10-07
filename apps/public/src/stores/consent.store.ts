// Consentement aux cookies, conservé dans un cookie first-party `cb_consent` (6 mois).
// - Nécessaires (panier, sécurité anti-robots) : toujours actifs, pas de consentement requis.
// - Mesure d'audience : désactivée tant que la personne n'a pas accepté.
// Changer CONSENT_VERSION redemande le consentement à tout le monde (ex. nouvel outil).
import { effect, signal } from '@preact/signals-core';

const COOKIE = 'cb_consent';
const MAX_AGE = 60 * 60 * 24 * 182; // 6 mois, en secondes
export const CONSENT_VERSION = 1;

export interface Consent {
  v: number;
  analytics: boolean;
  /** Date ISO du choix, pour pouvoir le prouver. */
  at: string;
}

function read(): Consent | null {
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Consent;
    return value.v === CONSENT_VERSION && typeof value.analytics === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

/** null = pas encore de choix : le bandeau s'affiche. */
export const consent = signal<Consent | null>(read());

/** Panneau de réglages rouvert depuis le pied de page. */
export const consentPanelOpen = signal(false);

export function saveConsent({ analytics }: { analytics: boolean }) {
  const value: Consent = { v: CONSENT_VERSION, analytics, at: new Date().toISOString() };
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  consent.value = value;
  consentPanelOpen.value = false;
}

/** Lance `start` dès que (et seulement si) la mesure d'audience est acceptée. */
export function onAnalyticsConsent(start: () => void) {
  let started = false;
  return effect(() => {
    if (consent.value?.analytics && !started) {
      started = true;
      start();
    }
  });
}
