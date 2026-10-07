// Hero : les trois vrais pots, posés en bas à droite sur une ligne dorée (desktop),
// ou en petit au-dessus du texte du bloc 3 (mobile).
// Apparition un par un entre HERO_PRODUCTS_TIMING.debut et .fin (opacité 0→1, translateY 30px→0,
// décalage entre chaque) ; ils restent ensuite visibles (desktop) ou sortent avec le bloc 3 (mobile).
import { html, type TemplateResult } from 'lit-html';
import { HERO, HERO_BLOCKS, HERO_PRODUCTS_TIMING, MOBILE_QUERY, type HeroProduct } from '../config';

const OFFSET = 30; // px
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Bloc de texte avec lequel les produits disparaissent sur mobile (« Trois formats »). */
const COMPANION_BLOCK = HERO_BLOCKS.find((b) => b.debut === HERO_PRODUCTS_TIMING.debut);

/** État du produit n° i (fonction pure, réversible). */
export function productState(i: number, count: number, p: number, mobile: boolean) {
  const { debut, fin, decalage } = HERO_PRODUCTS_TIMING;
  const duration = Math.max(0.01, fin - debut - (count - 1) * decalage);
  let t = smooth(clamp01((p - (debut + i * decalage)) / duration));
  if (mobile && COMPANION_BLOCK) t *= 1 - smooth(clamp01((p - COMPANION_BLOCK.fin) / HERO.fade));
  return { opacity: t, y: OFFSET * (1 - t) };
}

export function heroProductsTemplate(products: HeroProduct[]): TemplateResult {
  return html`
    <div class="hero__products">
      ${products.map(
        (prod) => html`
          <figure class="hero-pot" style="--pot-size: ${prod.size}">
            <img class="hero-pot__img" src=${prod.src} alt=${prod.alt} width=${prod.width} height=${prod.height} loading="lazy" decoding="async" />
            <span class="hero-pot__reflect" aria-hidden="true">
              <img src=${prod.src} alt="" width=${prod.width} height=${prod.height} loading="lazy" decoding="async" />
            </span>
          </figure>
        `,
      )}
    </div>
  `;
}

export function createHeroProducts(sticky: HTMLElement) {
  const container = sticky.querySelector<HTMLElement>('.hero__products')!;
  const text = sticky.querySelector<HTMLElement>('.hero__text')!;
  const pots = [...container.querySelectorAll<HTMLElement>('.hero-pot')];
  const mobileMq = matchMedia(MOBILE_QUERY);

  // mobile : les pots se placent juste au-dessus du bloc de texte
  new ResizeObserver(() => sticky.style.setProperty('--hero-text-h', `${text.offsetHeight}px`)).observe(text);

  return {
    update(p: number | null) {
      if (p === null) container.style.removeProperty('--line-opacity');
      pots.forEach((pot, i) => {
        if (p === null) {
          pot.style.removeProperty('opacity');
          pot.style.removeProperty('transform');
          return;
        }
        const { opacity, y } = productState(i, pots.length, p, mobileMq.matches);
        pot.style.opacity = opacity.toFixed(3);
        pot.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        if (i === 0) container.style.setProperty('--line-opacity', opacity.toFixed(3)); // la ligne dorée arrive avec le 1er pot
      });
    },
  };
}
