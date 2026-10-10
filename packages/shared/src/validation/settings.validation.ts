// Réglages de la boutique : vérification et normalisation avant enregistrement (écran Configuration).
import { MAX_FAQ, MAX_PHONES, MAX_ZONES, type DeliveryZone, type LegalSettings, type PublicSettings, type Socials } from '../models';
import { slugify } from '../utils/slug';
import { isFestiveMode } from '../domain/festive';
import { normalizePhone } from '../utils/phone';
import { result, type ValidationResult } from './result';

/** Champs modifiables dans l'écran Configuration (les zones de livraison ont leur propre écran). */
export type PublicSettingsInput = Pick<
  PublicSettings,
  'shopName' | 'slogan' | 'phones' | 'whatsappNumber' | 'contactEmail' | 'address' | 'businessHours' | 'socials' | 'faq' | 'announcement' | 'seo' | 'festive'
>;
export type LegalSettingsInput = Pick<LegalSettings, 'mentionsLegales' | 'cgv' | 'confidentialite'>;

export const SETTINGS_LIMITS = {
  shopName: 60,
  slogan: 120,
  address: 160,
  businessHours: 120,
  announcement: 140,
  question: 160,
  answer: 800,
  legal: 30_000,
  seoTitle: 60,
  seoDescription: 155,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOCIAL_HOSTS: Record<keyof Socials, RegExp> = {
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/,
  tiktok: /(^|\.)tiktok\.com$/,
  instagram: /(^|\.)instagram\.com$/,
};
const SOCIAL_LABELS: Record<keyof Socials, string> = { facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram' };

/** « facebook.com/celeste » → « https://facebook.com/celeste » ; null si ce n'est pas un lien du bon réseau. */
export function normalizeSocialUrl(network: keyof Socials, input: string): string | null {
  const raw = input.trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!SOCIAL_HOSTS[network].test(url.hostname.toLowerCase()) || url.pathname.length < 2) return null;
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
}

export function validatePublicSettings(input: PublicSettingsInput): ValidationResult<PublicSettingsInput> {
  const errors: Record<string, string> = {};
  const L = SETTINGS_LIMITS;
  const text = (key: string, value: string, max: number, min = 0, label = 'Ce champ') => {
    const v = value.trim();
    if (v.length < min) errors[key] = min === 1 ? `${label} est obligatoire.` : `${min} caractères minimum.`;
    else if (v.length > max) errors[key] = `${max} caractères maximum.`;
    return v;
  };

  const shopName = text('shopName', input.shopName, L.shopName, 1, 'Le nom de la boutique');
  const slogan = text('slogan', input.slogan, L.slogan);
  const address = text('address', input.address, L.address);
  const businessHours = text('businessHours', input.businessHours, L.businessHours);

  // téléphones : lignes vides ignorées, chacun normalisé au format +225…
  const phones: string[] = [];
  input.phones.forEach((p, i) => {
    if (!p.trim()) return;
    const n = normalizePhone(p);
    if (!n) errors[`phones.${i}`] = 'Numéro ivoirien à 10 chiffres attendu (ex. 05 07 88 44 70).';
    else if (phones.includes(n)) errors[`phones.${i}`] = 'Numéro en double.';
    else phones.push(n);
  });
  if (!phones.length && !Object.keys(errors).some((k) => k.startsWith('phones.'))) errors.phones = 'Indiquez au moins un numéro.';
  if (input.phones.filter((p) => p.trim()).length > MAX_PHONES) errors.phones = `${MAX_PHONES} numéros maximum.`;

  const wa = normalizePhone(input.whatsappNumber);
  if (!wa) errors.whatsappNumber = 'Numéro WhatsApp ivoirien à 10 chiffres attendu.';

  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (contactEmail && !EMAIL.test(contactEmail)) errors.contactEmail = 'Adresse e-mail invalide.';

  const socials = { ...input.socials };
  for (const k of Object.keys(SOCIAL_LABELS) as (keyof Socials)[]) {
    const n = normalizeSocialUrl(k, input.socials[k]);
    if (n === null) errors[`socials.${k}`] = `Lien ${SOCIAL_LABELS[k]} attendu (ex. https://www.${k === 'facebook' ? 'facebook' : k}.com/…).`;
    else socials[k] = n;
  }

  const announcement = text('announcement', input.announcement ?? '', L.announcement);

  if (input.faq.length > MAX_FAQ) errors.faq = `${MAX_FAQ} questions maximum.`;
  const faq = input.faq
    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
    .filter((f, i) => {
      if (!f.question && !f.answer) return false; // ligne vide : retirée
      if (!f.question) errors[`faq.${i}.question`] = 'Question manquante.';
      else if (f.question.length > L.question) errors[`faq.${i}.question`] = `${L.question} caractères maximum.`;
      if (!f.answer) errors[`faq.${i}.answer`] = 'Réponse manquante.';
      else if (f.answer.length > L.answer) errors[`faq.${i}.answer`] = `${L.answer} caractères maximum.`;
      return true;
    });

  const seo = {
    title: text('seo.title', input.seo.title, L.seoTitle),
    description: text('seo.description', input.seo.description, L.seoDescription),
    ogImageUrl: input.seo.ogImageUrl.trim(),
  };

  return result(
    {
      shopName,
      slogan,
      phones,
      whatsappNumber: wa ? wa.slice(1) : '', // stocké sans le « + »
      contactEmail,
      address,
      businessHours,
      socials,
      faq,
      announcement: announcement || null,
      seo,
      festive: isFestiveMode(input.festive) ? input.festive : 'auto',
    },
    errors,
  );
}

export function validateLegalSettings(input: LegalSettingsInput): ValidationResult<LegalSettingsInput> {
  const errors: Record<string, string> = {};
  const out = {} as LegalSettingsInput;
  for (const k of ['mentionsLegales', 'cgv', 'confidentialite'] as const) {
    out[k] = input[k].trim();
    if (out[k].length > SETTINGS_LIMITS.legal) errors[k] = `${SETTINGS_LIMITS.legal.toLocaleString('fr-FR')} caractères maximum.`;
  }
  return result(out, errors);
}

/** Zones de livraison (écran Livraison) : nom, mode, tarif entier ; identifiant stable dérivé du nom. */
export function validateDeliveryZones(zones: DeliveryZone[]): ValidationResult<DeliveryZone[]> {
  const errors: Record<string, string> = {};
  const ids = new Set<string>();
  const names = new Set<string>();
  const out = zones.map((z, i) => {
    const name = z.name.trim();
    if (name.length < 2) errors[`zones.${i}.name`] = 'Nom de la zone requis.';
    else if (name.length > 60) errors[`zones.${i}.name`] = '60 caractères maximum.';
    else if (names.has(name.toLowerCase())) errors[`zones.${i}.name`] = 'Zone en double.';
    names.add(name.toLowerCase());
    if (!Number.isInteger(z.fee) || z.fee < 0) errors[`zones.${i}.fee`] = 'Tarif entier, 0 ou plus.';
    else if (z.fee > 100_000) errors[`zones.${i}.fee`] = 'Tarif trop élevé.';
    let id = z.id || slugify(name) || `zone-${i + 1}`;
    while (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    return { id, name, mode: z.mode, fee: z.fee };
  });
  if (out.length > MAX_ZONES) errors.zones = `${MAX_ZONES} zones maximum.`;
  return result(out, errors);
}
