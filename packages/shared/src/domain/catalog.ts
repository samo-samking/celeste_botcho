// Règles du catalogue : champs calculés d'un produit, SKU automatique, conditions de publication.
import type { Product, Variant } from '../models';

/** Plus petit prix parmi les formats actifs (0 si aucun). */
export function minActivePrice(variants: Variant[]): number {
  const prices = variants.filter((v) => v.isActive).map((v) => v.price);
  return prices.length ? Math.min(...prices) : 0;
}

/** Disponible si au moins un format actif a du stock (stock null = non suivi = disponible). */
export function isInStock(variants: Variant[]): boolean {
  return variants.some((v) => v.isActive && (v.stock === null || v.stock > 0));
}

/** Préfixe de SKU à partir du nom : 'Toffi Bassin & Fesses' → 'TOF-BF'. */
export function skuPrefix(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length > 1);
  if (!words.length) return 'PRD';
  const head = words[0]!.slice(0, 3);
  const tail = words
    .slice(1)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
  return tail ? `${head}-${tail}` : head;
}

/** SKU d'un format : 'TOF-BF-030'. */
export function buildSku(productName: string, quantity: number): string {
  return `${skuPrefix(productName)}-${String(Math.max(0, Math.round(quantity))).padStart(3, '0')}`;
}

/** Ce qui manque pour publier (vide = publiable). Messages en français, pour l'admin. */
export function publicationIssues(p: Pick<Product, 'name' | 'categoryId' | 'images' | 'variants' | 'composition' | 'precautions'>): string[] {
  const issues: string[] = [];
  if (!p.name.trim()) issues.push('un nom');
  if (!p.categoryId) issues.push('une catégorie');
  if (!p.images.length) issues.push('au moins une photo');
  if (!p.variants.some((v) => v.isActive)) issues.push('au moins un format actif');
  if (!p.composition.trim()) issues.push('la composition');
  if (!p.precautions.trim()) issues.push('les précautions');
  return issues;
}
