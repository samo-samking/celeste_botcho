// Catégorie de produits (architecture §4). Dates en Date côté application (converties par les repositories).
export interface Category {
  name: string; // 'Toffi Bassin & Fesses'
  slug: string; // 'toffi-bassin-fesses'
  description: string;
  imageUrl: string;
  /** Couleur de la vitrine de l'accueil (#rrggbb) ; vide = teinte de la palette selon la position. */
  color: string;
  sortOrder: number;
  isActive: boolean;
  /** Nombre de produits publiés, tenu à jour par productRepository dans le même batch. */
  productCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}
