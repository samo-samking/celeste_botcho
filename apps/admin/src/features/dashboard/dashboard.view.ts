// Tableau de bord : chiffres du catalogue, raccourcis, guide de démarrage tant que le catalogue est vide.
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, arrowRight, check, fileDraft, folder, package as packageIcon, plus, refresh } from '@celeste/shared/icons';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { pageHead, type Page } from '../../app/shell.view';
import { ROUTES } from '../../app/router';
import { DashboardViewModel } from './dashboard.viewmodel';

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
const greeting = () => (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir');
const today = () =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

export function dashboardPage(user: AdminSession): Page {
  return {
    title: 'Tableau de bord',
    mount(outlet) {
      const vm = new DashboardViewModel();
      void vm.load();

      const stat = (label: string, value: number | undefined, ico: string, hint: string, tone = '') => html`
        <article class="stat ${tone}">
          <span class="stat__icon">${icon(ico)}</span>
          <p class="stat__label">${label}</p>
          <p class="stat__value">${vm.loading.value ? html`<span class="skeleton-line"></span>` : value ?? 0}</p>
          <p class="stat__hint">${hint}</p>
        </article>
      `;

      const step = (done: boolean, n: number, title: string, text: string, href: string, cta: string) => html`
        <li class="step ${done ? 'is-done' : ''}">
          <span class="step__badge" aria-hidden="true">${done ? icon(check) : n}</span>
          <div class="step__body">
            <p class="step__title">${title}<span class="visually-hidden">${done ? ' (fait)' : ' (à faire)'}</span></p>
            <p class="step__text">${text}</p>
          </div>
          ${done ? nothing : html`<a class="btn btn--secondary btn--sm" href=${href} data-link>${cta} ${icon(arrowRight)}</a>`}
        </li>
      `;

      const dispose = effect(() => {
        const s = vm.stats.value;
        const steps = vm.steps.value;
        const allDone = steps.category && steps.product && steps.published;
        render(
          html`
            ${pageHead(
              `${greeting()} ${firstName(user.displayName)}`,
              `Voici l'état de votre boutique — ${today()}.`,
              html`
                <a class="btn btn--secondary" href="${ROUTES.categories}?nouveau" data-link>${icon(folder)} Nouvelle catégorie</a>
                <a class="btn btn--primary" href="${ROUTES.products}?nouveau" data-link>${icon(plus)} Ajouter un produit</a>
              `,
            )}

            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">
                  ${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button>
                </div>`
              : nothing}

            <section class="stats" aria-label="Chiffres du catalogue" aria-busy=${vm.loading.value ? 'true' : 'false'}>
              ${stat('Produits publiés', s?.published, packageIcon, 'Visibles sur la boutique')}
              ${stat('Brouillons', s?.drafts, fileDraft, 'En préparation, non visibles')}
              ${stat('En rupture', s?.outOfStock, alertTriangle, 'Publiés mais indisponibles', s?.outOfStock ? 'stat--warn' : '')}
              ${stat('Catégories actives', s?.activeCategories, folder, `${s?.categories ?? 0} au total`)}
            </section>

            ${!vm.loading.value && !allDone
              ? html`
                  <section class="panel" aria-labelledby="start-title">
                    <h2 class="panel__title" id="start-title">Pour bien démarrer</h2>
                    <p class="panel__text">Trois étapes pour mettre votre catalogue en ligne.</p>
                    <ol class="steps">
                      ${step(steps.category, 1, 'Créez vos catégories', 'Par exemple « Toffi Bassin & Fesses » ou « Soins ».', ROUTES.categories, 'Catégories')}
                      ${step(steps.product, 2, 'Ajoutez vos produits', 'Photos, formats et prix, composition et précautions.', ROUTES.products, 'Produits')}
                      ${step(steps.published, 3, 'Publiez', 'Un produit publié apparaît aussitôt sur la boutique.', ROUTES.products, 'Publier')}
                    </ol>
                  </section>
                `
              : nothing}

            <section class="panel panel--muted" aria-labelledby="soon-title">
              <h2 class="panel__title" id="soon-title">Bientôt dans votre espace</h2>
              <p class="panel__text">Commandes, messages des clientes, promotions et livraison arrivent aux prochaines étapes.</p>
            </section>
          `,
          outlet,
        );
      });

      return dispose;
    },
  };
}

/** Écran pas encore construit. */
export function soonPage(title: string, text: string, ico: string): Page {
  return {
    title,
    mount(outlet) {
      render(
        html`
          ${pageHead(title)}
          <section class="soon">
            <span class="soon__icon">${icon(ico)}</span>
            <h2>Cet écran arrive à la prochaine étape</h2>
            <p>${text}</p>
            <a class="btn btn--secondary" href=${ROUTES.home} data-link>Retour au tableau de bord</a>
          </section>
        `,
        outlet,
      );
      return () => undefined;
    },
  };
}
