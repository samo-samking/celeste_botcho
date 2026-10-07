// À écrire en Phase 1 (§1.2–1.6 du programme) — les todo s'affichent dans le rapport de tests.
import { describe, it } from 'vitest';

describe('promo', () => {
  it.todo('isPromoActive : promo expirée');
  it.todo('isPromoActive : promo future');
  it.todo('applicablePromos selon le scope (all, category, product, variant), sans code');
  it.todo('bestPrice : deux promos qui se chevauchent, la meilleure gagne');
  it.todo('bestPrice : fixed_price supérieur au prix est ignoré');
  it.todo('bestPrice : jamais sous 0, arrondi à la dizaine inférieure');
  it.todo('findPromoByCode : insensible à la casse, code invalide refusé');
});
