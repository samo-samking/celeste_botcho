// Données de la vitrine : catégories visibles et leurs produits publiés, dans l'ordre de l'admin.
// Le catalogue est partagé avec le panier (une seule lecture Firestore par visite).
import { categoryColor, darkenToContrast, lightenToContrast } from '@celeste/shared/utils/color';
import { loadCatalog, type CatalogProduct } from '../../../stores/catalog.store';

export interface VitrineCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Teinte choisie dans l'admin (soulignement, flèches). */
  color: string;
  /** Teinte assombrie : centre du dégradé et fond du bouton, texte clair lisible dessus (AA). */
  tint: string;
  /** Teinte éclaircie : texte coloré lisible sur le fond sombre (AA). */
  accentText: string;
  products: CatalogProduct[];
}

export async function loadVitrine(): Promise<VitrineCategory[]> {
  const { categories, products } = await loadCatalog();
  return categories
    .map((c, index) => {
      const color = categoryColor(c.color, index);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? '',
        color,
        tint: darkenToContrast(color),
        accentText: lightenToContrast(color),
        products: products.filter((p) => p.categoryId === c.id),
      };
    })
    .filter((c) => c.products.length > 0); // une catégorie sans produit n'apparaît pas
}
