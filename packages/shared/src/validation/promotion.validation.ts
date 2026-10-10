// Promotion : vérifications avant enregistrement (écran Promotions).
import type { Promotion } from '../models';
import { result, type ValidationResult } from './result';

export type PromotionInput = Omit<Promotion, 'createdAt'>;

export function validatePromotion(input: PromotionInput): ValidationResult<PromotionInput> {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  if (title.length < 2) errors.title = 'Donnez un titre à la promotion.';
  else if (title.length > 60) errors.title = '60 caractères maximum.';

  if (!Number.isInteger(input.value) || input.value <= 0) errors.value = 'Valeur entière supérieure à 0.';
  else if (input.type === 'percent' && input.value > 90) errors.value = '90 % maximum.';
  else if (input.type !== 'percent' && input.value > 1_000_000) errors.value = 'Montant trop élevé.';

  if (input.scope !== 'all' && !input.targetIds.length) errors.targetIds = 'Choisissez au moins un élément concerné.';

  const code = input.code?.trim().toUpperCase().replace(/\s+/g, '') || null;
  if (code && !/^[A-Z0-9-]{3,20}$/.test(code)) errors.code = 'De 3 à 20 lettres, chiffres ou tirets.';

  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) errors.startsAt = 'Date de début invalide.';
  if (!(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime())) errors.endsAt = 'Date de fin invalide.';
  else if (!errors.startsAt && input.endsAt <= input.startsAt) errors.endsAt = 'La fin doit être après le début.';

  return result({ ...input, title, code, targetIds: input.scope === 'all' ? [] : [...new Set(input.targetIds)] }, errors);
}
