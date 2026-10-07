// Produit et ses formats (architecture §4). Les formats sont un tableau : une fiche = une lecture.
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductImage {
  url: string; // URL Cloudinary (secure_url)
  width: number;
  height: number;
  alt: string;
}

export interface Variant {
  sku: string; // 'TOF-BF-030'
  label: string; // '30 boules'
  quantity: number; // 30
  price: number; // FCFA, entier
  stock: number | null; // null = stock non suivi
  isActive: boolean;
}

export interface Product {
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string; // dénormalisé
  shortDescription: string;
  description: string;
  composition: string; // obligatoire pour publier
  usage: string; // mode d'emploi
  precautions: string; // obligatoire pour publier
  images: ProductImage[]; // 1 à 8 pour publier
  variants: Variant[]; // 1 à 6
  minPrice: number; // plus petit prix actif (calculé)
  status: ProductStatus;
  isFeatured: boolean;
  inStock: boolean; // au moins un format disponible (calculé)
  sortOrder: number;
  seo: { title: string; description: string };
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const MAX_VARIANTS = 6;
export const MAX_IMAGES = 8;
