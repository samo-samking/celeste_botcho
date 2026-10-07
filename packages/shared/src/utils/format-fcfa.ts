// Montants en FCFA entiers. Séparateur de milliers : espace insécable fine (U+202F).
const THIN_NBSP = ' ';
const NBSP = ' ';

/** formatFcfa(2500) → « 2 500 F CFA » ; formatFcfa(2500, { short: true }) → « 2 500 F » */
export function formatFcfa(amount: number, { short = false }: { short?: boolean } = {}): string {
  const digits = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
  return `${digits}${NBSP}${short ? 'F' : 'F CFA'}`;
}
