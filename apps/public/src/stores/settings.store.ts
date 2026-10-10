// Coordonnées de la boutique (écran Configuration de l'admin) : téléphones, WhatsApp, e-mail, réseaux.
// Affichage immédiat avec la dernière version connue (sessionStorage) ou les valeurs de config.ts,
// puis lecture de settings/public une fois par visite, quand la page est au repos (le SDK Firebase
// n'alourdit pas le premier affichage).
import { signal } from '@preact/signals-core';
import type { DeliveryZone, FaqItem, Socials } from '@celeste/shared/models';
import type { FestiveMode } from '@celeste/shared/domain/festive';
import { CONTACT_EMAIL, DEFAULT_FAQ, PHONES, SOCIALS, WHATSAPP_NUMBER } from '../pages/home/config';

export interface SiteContact {
  phones: string[];
  whatsappNumber: string; // sans « + »
  contactEmail: string;
  socials: Socials;
  businessHours: string;
  slogan: string;
  /** Questions fréquentes (Configuration › FAQ ; questions par défaut tant qu'aucune n'est saisie). */
  faq: FaqItem[];
  /** Zones et tarifs de livraison (écran Livraison de l'admin). */
  deliveryZones: DeliveryZone[];
  /** Décors de fête (Configuration › Fêtes). */
  festive: FestiveMode;
}

const KEY = 'cb-settings-v4';
const FALLBACK: SiteContact = {
  phones: PHONES,
  whatsappNumber: WHATSAPP_NUMBER,
  contactEmail: CONTACT_EMAIL,
  socials: SOCIALS,
  businessHours: '',
  slogan: 'Plus de volume, plus de confiance.',
  faq: DEFAULT_FAQ,
  deliveryZones: [],
  festive: 'auto',
};

function readCache(): SiteContact | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as SiteContact | null;
    return raw && Array.isArray(raw.phones) && typeof raw.whatsappNumber === 'string' && raw.socials && Array.isArray(raw.faq) && Array.isArray(raw.deliveryZones) ? raw : null;
  } catch {
    return null;
  }
}

export const siteContact = signal<SiteContact>(readCache() ?? FALLBACK);

let started = false;
let ready: Promise<void> = Promise.resolve();

/** Réglages chargés (ou échec) : le formulaire de commande attend les zones de livraison. */
export const settingsReady = () => (loadSiteSettings(), ready);

/** Lit settings/public (une fois par visite) ; en cas d'échec, on garde les valeurs affichées. */
export function loadSiteSettings() {
  if (started) return;
  started = true;
  ready = import('@celeste/shared/repositories/settings.repository')
    .then(({ settingsRepository }) => settingsRepository.getPublic())
    .then((s) => {
      const next: SiteContact = {
        phones: s.phones.length ? s.phones : FALLBACK.phones,
        whatsappNumber: s.whatsappNumber || FALLBACK.whatsappNumber,
        contactEmail: s.contactEmail,
        socials: s.socials,
        businessHours: s.businessHours,
        slogan: s.slogan || FALLBACK.slogan,
        faq: s.faq.length ? s.faq : FALLBACK.faq,
        deliveryZones: s.deliveryZones,
        festive: s.festive,
      };
      siteContact.value = next;
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* stockage indisponible : sans conséquence */
      }
    })
    .catch(() => undefined);
}

/**
 * Tous les liens WhatsApp du site sont construits avec le numéro de config.ts : au clic, on y met
 * le numéro de la Configuration (un seul écouteur pour l'en-tête, le hero, la vitrine, le pied de page…).
 */
export function useConfiguredWhatsappNumber() {
  document.addEventListener(
    'click',
    (e) => {
      const link = (e.target as Element).closest?.<HTMLAnchorElement>('a[href^="https://wa.me/"]');
      if (!link) return;
      const number = siteContact.value.whatsappNumber.replace(/\D/g, '');
      if (number) link.href = link.href.replace(/^https:\/\/wa\.me\/\d+/, `https://wa.me/${number}`);
    },
    { capture: true },
  );
}
