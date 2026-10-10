// Numéro de commande lisible au téléphone : CB-AAMMJJ-XXXX (sans 0/O/1/I/L, faciles à confondre).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ORDER_NUMBER = /^CB-\d{6}-[2-9A-HJKMNP-Z]{4}$/;

export function newOrderNumber(date = new Date(), random: () => number = Math.random): string {
  const yymmdd = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const suffix = Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('');
  return `CB-${yymmdd}-${suffix}`;
}

/** « cb-261006-7k3f », « CB 261006 7K3F » → « CB-261006-7K3F » ; null si la forme n'est pas reconnue. */
export function normalizeOrderNumber(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const m = compact.match(/^CB(\d{6})([0-9A-Z]{4})$/);
  const n = m ? `CB-${m[1]}-${m[2]}` : null;
  return n && ORDER_NUMBER.test(n) ? n : null;
}
