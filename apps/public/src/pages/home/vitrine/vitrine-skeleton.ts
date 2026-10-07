// Squelette de la vitrine, affiché tout de suite (sans charger Firebase) en attendant les données.
import { html } from 'lit-html';

export function vitrineSkeleton() {
  return html`
    <div class="vitrine__inner vitrine__inner--loading" aria-busy="true">
      <h2 class="visually-hidden" id="vitrine-title">Nos produits par catégorie</h2>
      <div class="vitrine__tabs">${[0, 1, 2].map(() => html`<span class="sk sk--tab"></span>`)}</div>
      <div class="vitrine__copy">
        <span class="sk sk--line sk--short"></span><span class="sk sk--title"></span>
        <span class="sk sk--line"></span><span class="sk sk--line sk--short"></span>
      </div>
      <div class="vitrine__stage"><span class="sk sk--disc"></span></div>
      <span class="visually-hidden" role="status">Chargement des produits…</span>
    </div>
  `;
}
