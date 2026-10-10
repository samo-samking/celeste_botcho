// Numéros ivoiriens : 10 chiffres depuis 2021 (01, 05, 07 mobiles ; 25, 27 fixes).
// Stockage au format international +225XXXXXXXXXX ; affichage « 05 07 88 44 70 ».

const LOCAL = /^(01|05|07|25|27)\d{8}$/;

/** Les 10 chiffres locaux, sans indicatif ni séparateurs ; null si la forme n'est pas reconnue. */
function localDigits(input: string): string | null {
  let digits = input.trim().replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+225')) digits = digits.slice(4);
  else if (digits.startsWith('00225')) digits = digits.slice(5);
  else if (digits.startsWith('225') && digits.length === 13) digits = digits.slice(3);
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function isValidCiPhone(input: string): boolean {
  const digits = localDigits(input);
  return !!digits && LOCAL.test(digits);
}

/** « 07 67 10 78 04 », « +225 0767107804 », « 00225… » → « +2250767107804 » ; null si invalide. */
export function normalizePhone(input: string): string | null {
  const digits = localDigits(input);
  return digits && LOCAL.test(digits) ? `+225${digits}` : null;
}

/** +2250767107804 → « 07 67 10 78 04 » */
export function formatPhone(e164: string): string {
  return e164.replace(/^\+225/, '').replace(/(\d{2})(?=\d)/g, '$1 ');
}
