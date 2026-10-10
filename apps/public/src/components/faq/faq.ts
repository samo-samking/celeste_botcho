// Questions fréquentes de l'accueil : accordéon natif (<details name> : une question ouverte à la fois,
// clavier et lecteurs d'écran gérés par le navigateur), sur deux colonnes sur ordinateur.
// Les questions viennent de Configuration › FAQ (questions par défaut tant qu'aucune n'est saisie).
import { html } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { plus } from '@celeste/shared/icons';
import type { FaqItem } from '@celeste/shared/models';

export function faqSection(items: FaqItem[]) {
  if (!items.length) return html``;
  const half = Math.ceil(items.length / 2);
  const column = (list: FaqItem[], offset: number) => html`
    <div class="faq__col">
      ${list.map(
        (f, i) => html`
          <details class="faq__item" name="faq" ?open=${offset + i === 0}>
            <summary class="faq__question">
              <span>${f.question}</span>
              <span class="faq__icon" aria-hidden="true">${icon(plus)}</span>
            </summary>
            <div class="faq__answer"><p>${f.answer}</p></div>
          </details>
        `,
      )}
    </div>
  `;
  return html`
    <section class="home-section faq" id="faq" aria-labelledby="faq-titre">
      <div class="container">
        <p class="home-section__kicker">Vos questions</p>
        <h2 class="home-section__title title-gold" id="faq-titre">Questions fréquentes</h2>
        <div class="faq__grid">${column(items.slice(0, half), 0)} ${column(items.slice(half), half)}</div>
      </div>
    </section>
  `;
}
