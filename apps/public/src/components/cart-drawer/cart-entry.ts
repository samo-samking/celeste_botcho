// Bouton panier de l'en-tête : compteur à jour (sans Firebase) ; le panneau du panier
// (qui charge le catalogue) n'est importé qu'à la première ouverture.
import { effect } from '@preact/signals-core';
import { cartCount, cartOpen } from '../../stores/cart.store';

export function initCart(root: ParentNode = document) {
  const button = root.querySelector<HTMLButtonElement>('.site-header__cart');
  if (button) {
    const badge = button.querySelector<HTMLElement>('.site-header__badge')!;
    effect(() => {
      const n = cartCount.value;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = n === 0;
      button.setAttribute('aria-label', n ? `Panier, ${n} article${n > 1 ? 's' : ''}` : 'Panier, vide');
    });
  }

  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest?.('[data-cart-open]')) cartOpen.value = true;
  });

  let loaded = false;
  effect(() => {
    if (!cartOpen.value || loaded) return;
    loaded = true;
    void import('./cart-drawer').then((m) => m.mountCartDrawer());
  });
}
