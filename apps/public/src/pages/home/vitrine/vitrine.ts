// État de la vitrine : index de catégorie et index de produit, et les déplacements possibles.
// Logique pure : la vue (vitrine-view.ts) traduit chaque déplacement en animation.

export type Move =
  | { kind: 'product'; cat: number; from: number; to: number; dir: 1 | -1 }
  | { kind: 'category'; fromCat: number; toCat: number; toProduct: number; dir: 1 | -1 };

export class VitrineState {
  cat = 0;
  product = 0;

  /** Nombre de produits de chaque catégorie. */
  constructor(private readonly sizes: number[]) {}

  get categories() {
    return this.sizes.length;
  }
  size(cat = this.cat) {
    return this.sizes[cat] ?? 0;
  }

  /** Produit suivant ; après le dernier, premier produit de la catégorie suivante (en boucle). */
  next(): Move | null {
    if (this.product < this.size() - 1) return this.apply({ kind: 'product', cat: this.cat, from: this.product, to: this.product + 1, dir: 1 });
    if (this.categories < 2) return null;
    return this.apply({ kind: 'category', fromCat: this.cat, toCat: (this.cat + 1) % this.categories, toProduct: 0, dir: 1 });
  }

  /** Produit précédent ; avant le premier, dernier produit de la catégorie précédente (en boucle). */
  prev(): Move | null {
    if (this.product > 0) return this.apply({ kind: 'product', cat: this.cat, from: this.product, to: this.product - 1, dir: -1 });
    if (this.categories < 2) return null;
    const toCat = (this.cat - 1 + this.categories) % this.categories;
    return this.apply({ kind: 'category', fromCat: this.cat, toCat, toProduct: this.size(toCat) - 1, dir: -1 });
  }

  /** Onglet : premier produit de la catégorie choisie. */
  goTo(cat: number): Move | null {
    if (cat === this.cat || cat < 0 || cat >= this.categories) return null;
    return this.apply({ kind: 'category', fromCat: this.cat, toCat: cat, toProduct: 0, dir: cat > this.cat ? 1 : -1 });
  }

  private apply(move: Move): Move {
    if (move.kind === 'product') this.product = move.to;
    else {
      this.cat = move.toCat;
      this.product = move.toProduct;
    }
    return move;
  }
}

/** État visuel d'un produit selon son écart avec le produit actif. */
export function itemState(index: number, active: number): 'before' | 'active' | 'next' | 'hidden' {
  const gap = index - active;
  if (gap < 0) return 'before';
  if (gap === 0) return 'active';
  if (gap === 1) return 'next';
  return 'hidden';
}
