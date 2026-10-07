import { MAX_IMAGES, MAX_VARIANTS, type Product } from '../models';
import { publicationIssues } from '../domain/catalog';
import { result, type ValidationResult } from './result';

export type ProductInput = Omit<Product, 'categoryName' | 'minPrice' | 'inStock' | 'createdAt' | 'updatedAt'>;

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 155;

/** Erreurs par champ ; `variants.0.price` désigne le prix du 1er format. */
export function validateProduct(input: ProductInput): ValidationResult<ProductInput> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = 'Le nom doit faire au moins 2 caractères.';
  else if (name.length > 80) errors.name = 'Le nom ne doit pas dépasser 80 caractères.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) errors.slug = 'Adresse invalide : lettres minuscules, chiffres et tirets.';
  if (!input.categoryId) errors.categoryId = 'Choisissez une catégorie.';
  if (input.shortDescription.length > 160) errors.shortDescription = '160 caractères maximum.';
  if (input.images.length > MAX_IMAGES) errors.images = `${MAX_IMAGES} photos maximum.`;

  if (!input.variants.length) errors.variants = 'Ajoutez au moins un format.';
  if (input.variants.length > MAX_VARIANTS) errors.variants = `${MAX_VARIANTS} formats maximum.`;
  const skus = new Set<string>();
  input.variants.forEach((v, i) => {
    if (!v.label.trim()) errors[`variants.${i}.label`] = 'Libellé requis.';
    if (!Number.isInteger(v.price) || v.price <= 0) errors[`variants.${i}.price`] = 'Prix entier supérieur à 0.';
    if (!Number.isInteger(v.quantity) || v.quantity <= 0) errors[`variants.${i}.quantity`] = 'Quantité entière supérieure à 0.';
    if (v.stock !== null && (!Number.isInteger(v.stock) || v.stock < 0)) errors[`variants.${i}.stock`] = 'Stock entier positif, ou vide.';
    if (!v.sku.trim()) errors[`variants.${i}.sku`] = 'SKU requis.';
    else if (skus.has(v.sku)) errors[`variants.${i}.sku`] = 'SKU en double.';
    skus.add(v.sku);
  });

  if (input.seo.title.length > SEO_TITLE_MAX) errors['seo.title'] = `${SEO_TITLE_MAX} caractères maximum.`;
  if (input.seo.description.length > SEO_DESCRIPTION_MAX) errors['seo.description'] = `${SEO_DESCRIPTION_MAX} caractères maximum.`;

  if (input.status === 'published') {
    const issues = publicationIssues(input);
    if (issues.length) errors.status = `Pour publier, il manque : ${issues.join(', ')}.`;
  }
  return result({ ...input, name }, errors);
}
