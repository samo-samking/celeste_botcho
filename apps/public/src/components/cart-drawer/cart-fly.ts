// Ajout au panier : la photo du produit s'envole jusqu'à l'icône du panier, le compteur rebondit,
// une bulle « Ajouté » apparaît, et l'ajout est annoncé aux lecteurs d'écran.
// Sans animation (prefers-reduced-motion) : seulement la bulle et l'annonce.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function announce(text: string) {
  let live = document.getElementById('cart-live');
  if (!live) {
    live = Object.assign(document.createElement('p'), { id: 'cart-live', className: 'visually-hidden' });
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  live.textContent = '';
  window.setTimeout(() => (live!.textContent = text), 50); // relu même si le texte est identique
}

function bubble(target: HTMLElement) {
  target.querySelector('.cart-bubble')?.remove();
  const b = Object.assign(document.createElement('span'), { className: 'cart-bubble', textContent: 'Ajouté !' });
  b.setAttribute('aria-hidden', 'true');
  target.append(b);
  window.setTimeout(() => b.remove(), 1600);
}

export function flyToCart(img: HTMLImageElement | null, message: string) {
  const target = document.querySelector<HTMLElement>('.site-header__cart');
  announce(message);
  if (!target) return;

  const pop = () => {
    target.classList.remove('is-popping');
    void target.offsetWidth;
    target.classList.add('is-popping');
    bubble(target);
  };
  if (!img || reduced()) return pop();

  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width) return pop();

  const ghost = img.cloneNode() as HTMLImageElement;
  ghost.removeAttribute('data-src');
  ghost.alt = '';
  ghost.className = 'cart-ghost';
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.08, (to.width * 0.9) / from.width);
  ghost
    .animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 60}px) scale(${(1 + scale) / 2})`, opacity: 0.95, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2 },
      ],
      { duration: 700, easing: 'cubic-bezier(0.55, 0, 0.35, 1)' },
    )
    .finished.then(() => {
      ghost.remove();
      pop();
    });
}
