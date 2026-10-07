// Hero : les cinq blocs de texte, superposés, un seul visible à la fois.
// Chaque bloc entre sur `fade` de p après `debut` (opacité 0→1, translateY 24px→0)
// et sort sur `fade` après `fin` (1→0, 0→-24px). Un bloc qui commence à 0 est visible
// d'emblée ; un bloc qui finit à 1 reste affiché jusqu'au bout du hero.
import { html, nothing, type TemplateResult } from 'lit-html';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { icon } from '@celeste/shared/icons/icon';
import { chevronDown, whatsapp } from '@celeste/shared/icons';
import { HERO, WHATSAPP_MESSAGES, WHATSAPP_NUMBER, type HeroBlock } from '../config';

const OFFSET = 24; // px

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** État d'un bloc pour la progression p (fonction pure, réversible). */
export function blockState(block: HeroBlock, p: number, fade = HERO.fade) {
  const enter = block.debut <= 0 ? 1 : smooth(clamp01((p - block.debut) / fade));
  const exit = block.fin >= 1 ? 0 : smooth(clamp01((p - block.fin) / fade));
  return { opacity: enter * (1 - exit), y: OFFSET * (1 - enter) - OFFSET * exit };
}

function blockContent(block: HeroBlock, index: number): TemplateResult {
  const Heading = index === 0 ? 'h1' : 'h2';
  const titleId = `hero-block-${index + 1}`;
  return html`
    <div class="hero-block hero-block--${block.variante ?? 'default'}" data-index=${index} role="group" aria-labelledby=${titleId}>
      ${block.surtitre ? html`<p class="hero-block__kicker">${block.surtitre}</p>` : nothing}
      ${Heading === 'h1'
        ? html`<h1 class="hero-block__title title-gold" id=${titleId}>${block.titre}</h1>`
        : html`<h2 class="hero-block__title title-gold" id=${titleId}>${block.titre}</h2>`}
      ${block.variante !== 'cta' && block.texte ? html`<p class="hero-block__text">${block.texte}</p>` : nothing}
      ${block.variante === 'intro'
        ? html`<p class="hero-block__hint" aria-hidden="true">Faites défiler ${icon(chevronDown, { class: 'hero-block__hint-icon' })}</p>`
        : nothing}
      ${block.variante === 'cta'
        ? html`
            <div class="hero-block__actions">
              <a class="btn btn--primary" href=${buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.general)} target="_blank" rel="noopener">
                ${icon(whatsapp)} Commander sur WhatsApp
              </a>
              <a class="btn btn--secondary" href="#produits">Voir les produits</a>
            </div>
            ${block.texte ? html`<p class="hero-block__note">${block.texte}</p>` : nothing}
          `
        : nothing}
    </div>
  `;
}

export function heroTextTemplate(blocks: HeroBlock[]): TemplateResult {
  return html`<div class="hero__text">${blocks.map(blockContent)}</div>`;
}

/** Applique l'état des blocs à chaque progression ; null = styles retirés (animation désactivée). */
export function createHeroText(container: HTMLElement, blocks: HeroBlock[], scrollToProgress: (p: number) => void) {
  const els = [...container.querySelectorAll<HTMLElement>('.hero-block')];
  let animated = false;

  // Au clavier, un lien d'un bloc masqué reçoit le focus : on fait défiler jusqu'à ce bloc.
  els.forEach((el, i) => {
    el.addEventListener('focusin', () => {
      const block = blocks[i]!;
      if (animated && Number(el.style.opacity) < 0.99) {
        scrollToProgress(block.fin >= 1 ? 1 : (block.debut + block.fin) / 2);
      }
    });
  });

  return {
    update(p: number | null) {
      animated = p !== null;
      els.forEach((el, i) => {
        if (p === null) {
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
          el.style.removeProperty('pointer-events');
          return;
        }
        const { opacity, y } = blockState(blocks[i]!, p);
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      });
    },
  };
}
