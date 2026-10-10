import type { FestiveMode } from '../domain/festive';

// Réglages de la boutique (architecture §4) : settings/public est lu par le site une fois par visite,
// settings/legal par les pages légales. Seule la propriétaire peut les modifier.

export type DeliveryMode = 'local' | 'shipping';

export interface DeliveryZone {
  id: string;
  name: string; // 'Abidjan — Cocody'
  mode: DeliveryMode; // livraison en main propre ou expédition
  fee: number; // F CFA, entier
}

export interface HeroSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
  link: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Socials {
  facebook: string;
  tiktok: string;
  instagram: string;
}

export interface PublicSettings {
  shopName: string;
  slogan: string;
  logoUrl: string;
  phones: string[]; // format +2250507884470
  whatsappNumber: string; // '2250507884470', sans le +
  contactEmail: string;
  address: string;
  businessHours: string;
  geo: { lat: number; lng: number } | null;
  socials: Socials;
  heroSlides: HeroSlide[];
  deliveryZones: DeliveryZone[]; // gérées dans l'écran Livraison
  faq: FaqItem[];
  announcement: string | null; // bandeau en haut du site
  seo: { title: string; description: string; ogImageUrl: string };
  /** Décors de fête : automatique selon les dates, désactivé, ou thème forcé. */
  festive: FestiveMode;
  updatedAt: Date | null;
}

export interface LegalSettings {
  mentionsLegales: string; // Markdown simple
  cgv: string;
  confidentialite: string;
  updatedAt: Date | null;
}

export const MAX_PHONES = 4;
export const MAX_FAQ = 20;
export const MAX_ZONES = 40;

/** Valeurs utilisées tant que settings/public n'existe pas encore (première configuration). */
export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  shopName: 'Céleste Bôtchô',
  slogan: 'Plus de volume, plus de confiance.',
  logoUrl: '/brand/logo-hd.webp',
  phones: ['+2250141047671', '+2250507884470', '+2250767107804'],
  whatsappNumber: '2250507884470',
  contactEmail: 'contact@celestebotcho.com',
  address: "Abidjan, Côte d'Ivoire",
  businessHours: '',
  geo: null,
  socials: { facebook: '', tiktok: '', instagram: '' },
  heroSlides: [],
  deliveryZones: [],
  faq: [],
  announcement: null,
  seo: {
    title: 'Céleste Bôtchô',
    description: 'Toffi au caramel et soins pour sublimer vos formes. Commande sur WhatsApp, livraison à Abidjan et partout en Côte d’Ivoire.',
    ogImageUrl: '/og/og-default.jpg',
  },
  festive: 'auto',
  updatedAt: null,
};

export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  mentionsLegales: '',
  cgv: '',
  confidentialite: '',
  updatedAt: null,
};
