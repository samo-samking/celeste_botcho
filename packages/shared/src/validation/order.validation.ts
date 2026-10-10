// Coordonnées saisies par la cliente au moment de commander (formulaire du panier).
// Mêmes limites que les règles Firestore (nom ≤ 80, téléphone +225XXXXXXXXXX).
import type { PaymentMethod } from '../models';
import { normalizePhone } from '../utils/phone';
import { result, type ValidationResult } from './result';

export interface CheckoutInput {
  name: string;
  phone: string;
  zoneId: string;
  city: string;
  address: string;
  note: string;
  payment: PaymentMethod;
  consent: boolean;
}

export const CHECKOUT_LIMITS = { name: 80, city: 60, address: 200, note: 300 } as const;

export function validateCheckout(input: CheckoutInput): ValidationResult<CheckoutInput> {
  const errors: Record<string, string> = {};
  const L = CHECKOUT_LIMITS;
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) errors.name = 'Indiquez votre nom.';
  else if (name.length > L.name) errors.name = `${L.name} caractères maximum.`;
  const phone = normalizePhone(input.phone);
  if (!phone) errors.phone = 'Numéro ivoirien à 10 chiffres (ex. 07 07 00 00 00).';
  if (!input.zoneId) errors.zoneId = 'Choisissez votre zone de livraison.';
  const city = input.city.trim();
  if (city.length < 2) errors.city = 'Indiquez votre commune ou ville.';
  else if (city.length > L.city) errors.city = `${L.city} caractères maximum.`;
  const address = input.address.trim();
  if (address.length < 4) errors.address = 'Indiquez une adresse ou des repères pour le livreur.';
  else if (address.length > L.address) errors.address = `${L.address} caractères maximum.`;
  const note = input.note.trim();
  if (note.length > L.note) errors.note = `${L.note} caractères maximum.`;
  if (input.payment !== 'cash_on_delivery' && input.payment !== 'mobile_money') errors.payment = 'Choisissez un mode de paiement.';
  if (!input.consent) errors.consent = 'Acceptez les conditions de vente pour commander.';
  return result({ ...input, name, phone: phone ?? input.phone, city, address, note }, errors);
}
