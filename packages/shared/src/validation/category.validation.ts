import type { Category } from '../models';
import { HEX_COLOR } from '../utils/color';
import { result, type ValidationResult } from './result';

export type CategoryInput = Pick<Category, 'name' | 'slug' | 'description' | 'imageUrl' | 'color' | 'isActive'>;

export function validateCategory(input: CategoryInput): ValidationResult<CategoryInput> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = 'Le nom doit faire au moins 2 caractères.';
  else if (name.length > 60) errors.name = 'Le nom ne doit pas dépasser 60 caractères.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) errors.slug = 'Adresse invalide : lettres minuscules, chiffres et tirets.';
  if (input.description.length > 300) errors.description = '300 caractères maximum.';
  if (input.color && !HEX_COLOR.test(input.color)) errors.color = 'Couleur invalide (format #rrggbb).';
  return result({ ...input, name, description: input.description.trim(), color: input.color.toLowerCase() }, errors);
}
