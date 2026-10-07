// Configuration de l'accueil : numéro WhatsApp, couleurs, textes et réglages du hero.
// Les valeurs marquées 🔒 attendent une décision de la vendeuse (PROGRAMME-IMPLEMENTATION.md §2).
// Plus tard, WHATSAPP_NUMBER, PHONES, CONTACT_EMAIL et SOCIALS viendront de settings/public (Firestore).

/** Numéro WhatsApp de la boutique, format international sans « + ». 🔒 D2 */
export const WHATSAPP_NUMBER = '2250507884470';

/** Numéros affichés dans le pied de page (format +225XXXXXXXXXX). 🔒 D2 */
export const PHONES = ['+2250141047671', '+2250507884470', '+2250767107804'];

/** Adresse e-mail de contact de la boutique (pied de page). */
export const CONTACT_EMAIL = 'contact@celestebotcho.com';

/** Réseaux sociaux : un lien vide n'est pas affiché. */
export const SOCIALS = { facebook: '', instagram: '', tiktok: '' };

export const WHATSAPP_MESSAGES = {
  general: 'Bonjour Céleste Bôtchô, je souhaite passer une commande.',
  product: (name: string, price: string) => `Bonjour Céleste Bôtchô, je souhaite commander : ${name} (${price}).`,
};

/** Miroir de tokens.css (--bg, --gold…), pour le canvas. */
export const COLORS = {
  bg: '#17120a',
  gold: '#f5b800',
  goldLight: '#ffd95a',
  goldDark: '#c98a00',
  text: '#f5efe6',
} as const;

/** Doit correspondre au point de rupture de hero.css. */
export const MOBILE_QUERY = '(max-width: 719.98px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface FrameSequence {
  /** Dossier dans apps/public/public, images frame_0001.webp… */
  path: string;
  count: number;
  /** Taille native des images, pour le calcul « cover ». */
  width: number;
  height: number;
  /** Le cube de faux produits est dans le cadre : il faut le masque de droite. */
  hasCube: boolean;
}

export const HERO = {
  sequences: {
    // images 1 à 228 de la vidéo, une sur deux ; hauteur de section : 450vh (hero.css)
    desktop: { path: '/hero/desktop/', count: 114, width: 1280, height: 720, hasCube: true },
    // une sur quatre, recadrée au centre (540×720) : le cube est hors cadre ; 350vh (hero.css)
    mobile: { path: '/hero/mobile/', count: 57, width: 540, height: 720, hasCube: false },
  } satisfies Record<string, FrameSequence>,
  /** Image fixe « de face » si l'animation est désactivée (prefers-reduced-motion).
   *  frame_0085 desktop = image 169 de la vidéo = frame_0043 mobile (déjà recadrée, sans le cube). */
  stillFrame: { desktop: '/hero/desktop/frame_0085.webp', mobile: '/hero/mobile/frame_0043.webp' },
  /** Durée d'entrée et de sortie d'un bloc de texte, en part de p. */
  fade: 0.04,
  /** Début de chaque séquence de la vidéo → indicateur à 5 points. */
  stages: [
    { debut: 0, label: 'Profil' },
    { debut: 0.12, label: 'Rotation' },
    { debut: 0.45, label: 'Trois formats' },
    { debut: 0.58, label: 'De face' },
    { debut: 0.85, label: 'Commander' },
  ],
  canvasLabel:
    'Animation : une femme en tenue de sport noire tourne lentement sur elle-même au fil du défilement.',
};

export interface HeroBlock {
  debut: number;
  fin: number;
  surtitre?: string;
  titre: string;
  texte?: string;
  /** intro : indice « Faites défiler » ; cta : boutons de commande. */
  variante?: 'intro' | 'cta';
}

/** Les cinq blocs de texte du hero, dans l'ordre de lecture. */
export const HERO_BLOCKS: HeroBlock[] = [
  { debut: 0, fin: 0.12, titre: 'Plus de volume, plus de confiance', variante: 'intro' },
  {
    debut: 0.16,
    fin: 0.41,
    surtitre: 'Nos bonbons',
    titre: 'Une gourmandise pensée pour vos formes',
    texte: 'Des bonbons au goût caramel, à croquer chaque jour.',
  },
  {
    debut: 0.45,
    fin: 0.58,
    surtitre: 'Trois formats',
    titre: 'Un pot pour chaque envie',
    texte: 'Petit, moyen ou grand : choisissez celui qui vous convient.',
  },
  {
    debut: 0.62,
    fin: 0.81,
    surtitre: 'Votre silhouette',
    titre: 'Assumez vos courbes',
    texte: "Rejoignez les clientes qui nous font confiance à Abidjan et partout en Côte d'Ivoire.",
  },
  {
    debut: 0.85,
    fin: 1,
    titre: 'Prête à commander ?',
    texte: "Livraison partout en Côte d'Ivoire",
    variante: 'cta',
  },
];

export interface HeroProduct {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Hauteur affichée, en unités relatives (voir --pot-unit dans hero.css). */
  size: number;
}

/** Les trois vraies photos posées à droite du hero, dans l'ordre d'apparition. */
export const HERO_PRODUCTS: HeroProduct[] = [
  { src: '/produits/pot-blanc.webp', alt: 'Pot haut à couvercle blanc rempli de bonbons Toffi Céleste Bôtchô', width: 292, height: 560, size: 22.5 },
  { src: '/produits/pot-rose.webp', alt: 'Pot transparent à couvercle rose rempli de bonbons Toffi Céleste Bôtchô', width: 424, height: 560, size: 27 },
  { src: '/produits/pot-bas.webp', alt: 'Pot rond et bas rempli de bonbons Toffi Céleste Bôtchô', width: 660, height: 560, size: 16 },
];

/** Apparition des produits : entre p 0.45 et 0.58, décalage de 0.04 entre chacun. */
export const HERO_PRODUCTS_TIMING = { debut: 0.45, fin: 0.58, decalage: 0.04 };

export const ORDER_STEPS = [
  { titre: 'Choisissez votre format', texte: 'Petit, moyen ou grand pot : parcourez nos produits ci-dessus.' },
  { titre: 'Écrivez-nous sur WhatsApp', texte: 'Un clic sur « Commander » ouvre la conversation avec votre choix déjà rempli.' },
  { titre: 'Recevez chez vous', texte: "Livraison à Abidjan et expédition partout en Côte d'Ivoire. Paiement à la livraison ou par mobile money." },
];
