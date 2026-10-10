// Décors de fête du site : deux thèmes.
// - « Fêtes de fin d'année » : du 1er décembre au 6 janvier (Noël puis Nouvel An, un seul décor ;
//   les vœux changent : « Joyeux Noël » jusqu'au 25 décembre, « Bonne année » ensuite).
// - « Indépendance » : autour du 7 août (Côte d'Ivoire).
// Mode réglé dans l'admin (Configuration › Fêtes) : automatique selon les dates, désactivé, ou un
// thème forcé. Dates fixes chaque année (mois 1 à 12, bornes incluses).
export type FestiveTheme = 'yearend' | 'independence';
export type FestiveMode = 'auto' | 'off' | FestiveTheme;

export interface FestivePeriod {
  theme: FestiveTheme;
  label: string;
  /** [mois, jour] de début et de fin ; une période peut chevaucher le 1er janvier. */
  from: [number, number];
  to: [number, number];
}

export const FESTIVE_PERIODS: FestivePeriod[] = [
  { theme: 'yearend', label: 'Fêtes de fin d’année', from: [12, 1], to: [1, 6] },
  { theme: 'independence', label: 'Fête de l’Indépendance', from: [8, 1], to: [8, 10] },
];

export const FESTIVE_LABELS: Record<FestiveTheme, string> = {
  yearend: 'Fêtes de fin d’année',
  independence: 'Fête de l’Indépendance',
};

export const FESTIVE_MODES: FestiveMode[] = ['auto', 'off', 'yearend', 'independence'];
export const isFestiveMode = (v: unknown): v is FestiveMode => FESTIVE_MODES.includes(v as FestiveMode);

const key = (month: number, day: number) => month * 100 + day;

/** Thème du calendrier pour cette date (heure locale), ou null hors période de fête. */
export function festiveThemeOn(date: Date): FestiveTheme | null {
  const today = key(date.getMonth() + 1, date.getDate());
  for (const p of FESTIVE_PERIODS) {
    const from = key(...p.from);
    const to = key(...p.to);
    const inside = from <= to ? today >= from && today <= to : today >= from || today <= to; // période à cheval sur janvier
    if (inside) return p.theme;
  }
  return null;
}

/** Thème à afficher : mode de l'admin, sauf aperçu demandé dans l'adresse (?fete=fin-annee…). */
export function activeFestiveTheme(mode: FestiveMode, date = new Date(), preview?: FestiveTheme | 'off' | null): FestiveTheme | null {
  if (preview) return preview === 'off' ? null : preview;
  if (mode === 'off' || !isFestiveMode(mode)) return null;
  if (mode === 'auto') return festiveThemeOn(date);
  return mode;
}

/** Fin d'année : vœux de Noël jusqu'au 25 décembre, de Nouvel An ensuite. */
export const isNewYearSide = (date: Date) => !(date.getMonth() === 11 && date.getDate() <= 25);

/** Année souhaitée au Nouvel An : de juillet à décembre, l'année qui arrive (aperçu ou thème forcé compris). */
export const newYearOf = (date: Date) => (date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear());

/** Paramètre d'aperçu dans l'adresse de la boutique. */
export const FESTIVE_PREVIEW_PARAM = 'fete';
export const FESTIVE_PREVIEW_VALUES: Record<string, FestiveTheme | 'off'> = {
  'fin-annee': 'yearend',
  noel: 'yearend',
  'nouvel-an': 'yearend',
  independance: 'independence',
  aucune: 'off',
};
