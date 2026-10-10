// Tableau de bord : chiffres du catalogue, raccourcis, guide de démarrage tant que le catalogue est vide.
import { html, nothing, render, svg } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, arrowRight, bell, chat, check, clipboardList, fileDraft, folder, package as packageIcon, percent, plus, receipt, refresh } from '@celeste/shared/icons';
import { ORDER_STATUS_LABELS, type Order, type WithId } from '@celeste/shared/models';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { newMessages, newOrders, push, togglePush } from '../../app/live';
import { toast } from '../../components/toast/toast';
import { formatRelative } from '../../app/format';
import { openOrderDetail } from '../orders/order-detail';
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

      const stat = (label: string, value: number | string | undefined, ico: string, hint: string, tone = '', href?: string) => html`
        <article class="stat ${tone} ${href ? 'stat--link' : ''}">
          ${href ? html`<a class="stat__link" href=${href} data-link aria-label=${label}></a>` : nothing}
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

      /** Graphique en barres (SVG, sans bibliothèque) : une barre par jour, hauteur = nombre de commandes. */
      const chart = (days: { date: Date; count: number; total: number }[]) => {
        const max = Math.max(1, ...days.map((d) => d.count));
        const W = 600, H = 140, gap = 4, bw = (W - gap * 29) / 30;
        const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
        return html`
          <svg class="dash-chart" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Commandes par jour sur les 30 derniers jours">
            ${days.map((d, i) => {
              const h = d.count ? Math.max(4, (d.count / max) * H) : 2;
              return svgBar(i * (bw + gap), H - h, bw, h, d.count ? '' : 'is-empty', `${fmt.format(d.date)} : ${d.count} commande${d.count > 1 ? 's' : ''}${d.total ? `, ${formatFcfa(d.total)}` : ''}`);
            })}
            <text x="0" y=${H + 14} class="dash-chart__label">${fmt.format(days[0]!.date)}</text>
            <text x=${W} y=${H + 14} text-anchor="end" class="dash-chart__label">Aujourd’hui</text>
          </svg>
        `;
      };

      const latestRow = (o: WithId<Order>) => html`
        <li>
          <button class="dash-latest__row" type="button" @click=${() => openOrderDetail(o, new Map(), () => void vm.load())}>
            <span><strong>${o.customer.name}</strong><small>${o.orderNumber} · ${formatRelative(o.createdAt)}</small></span>
            <span class="dash-latest__side"><strong>${formatFcfa(o.total, { short: true })}</strong><span class="order-pill order-pill--${o.status}">${ORDER_STATUS_LABELS[o.status]}</span></span>
          </button>
        </li>
      `;

      const dispose = effect(() => {
        const s = vm.stats.value;
        const sales = vm.sales.value;
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

            ${push.value === 'off'
              ? html`<div class="callout callout--info dash-push">
                  ${icon(bell)}<span><strong>Soyez prévenue à chaque commande</strong>, même quand l’admin est fermé : activez les alertes sur ce téléphone ou cet ordinateur.</span>
                  <button class="btn btn--primary btn--sm" type="button" @click=${async () => {
                    const msg = await togglePush();
                    if (push.value === 'on') toast.success(msg);
                    else toast.error(msg);
                  }}>Activer les alertes</button>
                </div>`
              : nothing}
            <section class="stats" aria-label="Chiffres des ventes" aria-busy=${vm.loading.value ? 'true' : 'false'}>
              ${stat('Nouvelles commandes', newOrders.value, clipboardList, 'À confirmer', newOrders.value ? 'stat--hot' : '', ROUTES.orders)}
              ${stat("Commandes du jour", sales?.ordersToday, receipt, 'Hors annulées', '', ROUTES.orders)}
              ${stat('Chiffre du mois', sales ? formatFcfa(sales.monthRevenue, { short: true }) : undefined, receipt, `${sales?.monthDelivered ?? 0} commande${(sales?.monthDelivered ?? 0) > 1 ? 's' : ''} livrée${(sales?.monthDelivered ?? 0) > 1 ? 's' : ''}`)}
              ${stat('Messages non lus', newMessages.value, chat, 'Formulaire de contact', newMessages.value ? 'stat--hot' : '', ROUTES.messages)}
            </section>
            <section class="stats" aria-label="Chiffres du catalogue" aria-busy=${vm.loading.value ? 'true' : 'false'}>
              ${stat('Produits publiés', s?.published, packageIcon, 'Visibles sur la boutique')}
              ${stat('Brouillons', s?.drafts, fileDraft, 'En préparation, non visibles')}
              ${stat('En rupture', s?.outOfStock, alertTriangle, 'Publiés mais indisponibles', s?.outOfStock ? 'stat--warn' : '')}
              ${stat('Promos en cours', sales?.activePromos, percent, 'Remises appliquées', '', ROUTES.promotions)}
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

            <div class="dash-grid">
              <section class="panel" aria-labelledby="chart-title">
                <h2 class="panel__title" id="chart-title">Commandes sur 30 jours</h2>
                <p class="panel__text">${sales ? `${sales.days.reduce((n, d) => n + d.count, 0)} commandes (hors annulées), ${formatFcfa(sales.days.reduce((n, d) => n + d.total, 0))}` : '…'}</p>
                ${sales ? chart(sales.days) : html`<span class="skeleton-line"></span>`}
              </section>
              <section class="panel" aria-labelledby="latest-title">
                <div class="dash-panel-head">
                  <h2 class="panel__title" id="latest-title">Dernières commandes</h2>
                  <a class="btn btn--secondary btn--sm" href=${ROUTES.orders} data-link>Toutes ${icon(arrowRight)}</a>
                </div>
                ${sales?.latest.length
                  ? html`<ul class="dash-latest">${sales.latest.map(latestRow)}</ul>`
                  : html`<p class="panel__text">${vm.loading.value ? '…' : 'Aucune commande pour l’instant.'}</p>`}
              </section>
            </div>
          `,
          outlet,
        );
      });

      return dispose;
    },
  };
}

/** Barre du graphique (lit-html : les éléments SVG doivent être créés avec le gabarit `svg`). */
function svgBar(x: number, y: number, w: number, h: number, cls: string, title: string) {
  return svg`<rect class="dash-chart__bar ${cls}" x=${x} y=${y} width=${w} height=${h} rx="3"><title>${title}</title></rect>`;
}
