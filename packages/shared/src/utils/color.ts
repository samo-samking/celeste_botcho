// Couleurs : contraste WCAG et assombrissement d'une teinte jusqu'au contraste voulu.
// Sert à la couleur de vitrine des catégories (texte #F5EFE6 posé dessus).

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Texte clair du site, posé sur les teintes de catégorie. */
export const LIGHT_TEXT = '#f5efe6';

/** Teintes proposées pour les catégories : profondes, chaudes, lisibles avec le texte clair. */
export const CATEGORY_PRESETS = [
  { hex: '#b8860b', name: 'Or ambré' },
  { hex: '#a0452e', name: 'Terre cuite' },
  { hex: '#2f6b4f', name: 'Vert profond' },
  { hex: '#a9581f', name: 'Caramel' },
  { hex: '#7a2632', name: 'Bordeaux' },
  { hex: '#6b2e5a', name: 'Prune' },
  { hex: '#2b4a6b', name: 'Bleu nuit' },
  { hex: '#8c6a3f', name: 'Bronze' },
] as const;

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Luminance relative (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Mélange avec du noir (amount 0 → 1). */
export function darken(hex: string, amount: number): string {
  return toHex(rgb(hex).map((c) => c * (1 - amount)) as [number, number, number]);
}

/** Assombrit la teinte par paliers de 4 % jusqu'à atteindre `ratio` avec `text`. */
export function darkenToContrast(hex: string, text = LIGHT_TEXT, ratio = 4.5): string {
  if (!HEX_COLOR.test(hex)) return hex;
  let out = hex.toLowerCase();
  for (let i = 1; i <= 25 && contrastRatio(out, text) < ratio; i++) out = darken(hex, i * 0.04);
  return out;
}

/** Fond sombre du site. */
export const DARK_BG = '#17120a';

/** Mélange avec du blanc (amount 0 → 1). */
export function lighten(hex: string, amount: number): string {
  return toHex(rgb(hex).map((c) => c + (255 - c) * amount) as [number, number, number]);
}

/** Éclaircit la teinte par paliers de 4 % jusqu'à être lisible (texte) sur `background`. */
export function lightenToContrast(hex: string, background = DARK_BG, ratio = 4.5): string {
  if (!HEX_COLOR.test(hex)) return hex;
  let out = hex.toLowerCase();
  for (let i = 1; i <= 25 && contrastRatio(out, background) < ratio; i++) out = lighten(hex, i * 0.04);
  return out;
}

/** Couleur de la catégorie, ou une teinte de la palette choisie selon sa position. */
export function categoryColor(color: string | undefined, index: number): string {
  return color && HEX_COLOR.test(color) ? color.toLowerCase() : CATEGORY_PRESETS[index % CATEGORY_PRESETS.length]!.hex;
}
