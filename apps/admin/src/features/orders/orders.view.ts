// Écran Commandes : « En cours » en temps réel (nouvelles en tête, mises en évidence à leur arrivée),
// « Historique » filtré par statut et période, recherche par numéro ou téléphone, export CSV,
// réglage des alertes (son, notifications). Le détail s'ouvre dans un panneau latéral.
import { html, nothing, render } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, chevronRight, clipboardList, close, download, refresh, search } from '@celeste/shared/icons';
import { ACTIVE_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus, type WithId } from '@celeste/shared/models';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { formatPhone } from '@celeste/shared/utils/phone';
import { pageHead, type Page } from '../../app/shell.view';
import { formatRelative, fromDateInput, toDateInput } from '../../app/format';
import { alertsControl } from '../../app/alerts-control';
import { errorMessage, toast } from '../../components/toast/toast';
import { openOrderDetail } from './order-detail';
import { OrdersViewModel, type Period } from './orders.viewmodel';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: 'month', label: 'Ce mois' },
  { value: 'all', label: 'Tout' },
  { value: 'custom', label: 'Dates…' },
];

export function ordersPage(): Page {
  return {
    title: 'Commandes',
    mount(outlet) {
      const vm = new OrdersViewModel();
      vm.startLive(() => undefined); // son et notification : gérés pour toute la session (app/live.ts)

      const open = (o: WithId<Order>) => {
        vm.fresh.value = new Set([...vm.fresh.value].filter((id) => id !== o.id));
        openOrderDetail(o, vm.products, () => void vm.refreshAfterChange());
      };

      const doSearch = async () => {
        try {
          const hint = await vm.runSearch();
          if (hint) toast.info(hint);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const exportCsv = async () => {
        try {
          const { name, csv, count } = await vm.exportCsv();
          if (!count) return toast.info('Aucune commande sur cette période.');
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          const a = Object.assign(document.createElement('a'), { href: url, download: name });
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`${count} commande${count > 1 ? 's' : ''} exportée${count > 1 ? 's' : ''} (${name}).`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const row = (o: WithId<Order>) => {
        const count = o.items.reduce((n, i) => n + i.qty, 0);
        return html`
          <li>
            <button class="order-row ${vm.fresh.value.has(o.id) ? 'is-fresh' : ''} order-row--${o.status}" type="button" @click=${() => open(o)}>
              <span class="order-row__main">
                <span class="order-row__number">${o.orderNumber}</span>
                <span class="order-row__customer">${o.customer.name} · ${formatPhone(o.customer.phone)}</span>
                <span class="order-row__meta">${count} article${count > 1 ? 's' : ''} · ${o.delivery.zoneName}</span>
              </span>
              <span class="order-row__side">
                <span class="order-row__total">${formatFcfa(o.total, { short: true })}</span>
                <span class="order-row__time">${formatRelative(o.createdAt)}</span>
              </span>
              <span class="order-pill order-pill--${o.status}">${ORDER_STATUS_LABELS[o.status]}</span>
              ${icon(chevronRight, { class: 'order-row__chevron' })}
            </button>
          </li>
        `;
      };

      const list = (orders: WithId<Order>[], empty: string) =>
        orders.length
          ? html`<ol class="order-list">${orders.map(row)}</ol>`
          : html`<section class="empty"><span class="empty__icon">${icon(clipboardList)}</span><h2>${empty}</h2></section>`;

      const skeleton = html`<ol class="order-list" aria-busy="true">${[0, 1, 2].map(() => html`<li class="order-row order-row--skeleton"><span class="skeleton-line"></span></li>`)}</ol>`;

      const activeTab = () => {
        const counts = Object.fromEntries(ACTIVE_STATUSES.map((s) => [s, vm.active.value.filter((o) => o.status === s).length])) as Record<OrderStatus, number>;
        return html`
          <div class="tabs" role="group" aria-label="Filtrer par statut">
            <button class="tab ${vm.activeFilter.value === 'all' ? 'is-active' : ''}" type="button" aria-pressed=${vm.activeFilter.value === 'all' ? 'true' : 'false'}
              @click=${() => (vm.activeFilter.value = 'all')}>Toutes <span class="tab__count">${vm.active.value.length}</span></button>
            ${ACTIVE_STATUSES.map(
              (s) => html`<button class="tab ${vm.activeFilter.value === s ? 'is-active' : ''} ${s === 'new' && counts.new ? 'tab--alert' : ''}" type="button"
                aria-pressed=${vm.activeFilter.value === s ? 'true' : 'false'} @click=${() => (vm.activeFilter.value = s)}>
                ${ORDER_STATUS_LABELS[s]} <span class="tab__count">${counts[s]}</span></button>`,
            )}
          </div>
          ${vm.activeError.value ? html`<div class="callout callout--error" role="status">${icon(alertTriangle)}<span>${vm.activeError.value}</span></div>` : nothing}
          ${vm.activeLoading.value ? skeleton : list(vm.activeShown.value, vm.activeFilter.value === 'all' ? 'Aucune commande en cours' : `Aucune commande « ${ORDER_STATUS_LABELS[vm.activeFilter.value as OrderStatus].toLowerCase()} »`)}
        `;
      };

      const historyTab = () => html`
        <div class="toolbar order-filters">
          <label class="toolbar__select">
            <span class="visually-hidden">Statut</span>
            <select .value=${live(vm.status.value)} @change=${(e: Event) => { vm.status.value = (e.target as HTMLSelectElement).value as OrderStatus | ''; void vm.loadHistory(); }}>
              <option value="">Tous les statuts</option>
              ${(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => html`<option value=${s} ?selected=${vm.status.value === s}>${ORDER_STATUS_LABELS[s]}</option>`)}
            </select>
          </label>
          <div class="order-periods" role="group" aria-label="Période">
            ${PERIODS.map(
              (p) => html`<button class="chip ${vm.period.value === p.value ? 'is-active' : ''}" type="button" aria-pressed=${vm.period.value === p.value ? 'true' : 'false'}
                @click=${() => { vm.period.value = p.value; if (p.value !== 'custom') void vm.loadHistory(); }}>${p.label}</button>`,
            )}
          </div>
          ${vm.period.value === 'custom'
            ? html`<div class="order-dates">
                <label>Du <input type="date" .value=${live(vm.customFrom.value ? toDateInput(vm.customFrom.value) : '')}
                  @change=${(e: Event) => { vm.customFrom.value = fromDateInput((e.target as HTMLInputElement).value); void vm.loadHistory(); }} /></label>
                <label>au <input type="date" .value=${live(vm.customTo.value ? toDateInput(vm.customTo.value) : '')}
                  @change=${(e: Event) => { vm.customTo.value = fromDateInput((e.target as HTMLInputElement).value); void vm.loadHistory(); }} /></label>
              </div>`
            : nothing}
          <button class="btn btn--secondary btn--sm order-export" type="button" @click=${exportCsv}>${icon(download)} Exporter (Excel)</button>
        </div>
        ${vm.historyError.value
          ? html`<div class="callout callout--error" role="alert">${icon(alertTriangle)}<span>${vm.historyError.value}</span>
              <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.loadHistory()}>${icon(refresh)} Réessayer</button></div>`
          : nothing}
        ${vm.historyLoading.value && !vm.history.value.length ? skeleton : list(vm.history.value, 'Aucune commande sur cette période')}
        ${vm.hasMore.value
          ? html`<button class="btn btn--secondary order-more" type="button" ?disabled=${vm.historyLoading.value} @click=${() => vm.loadHistory(true)}>
              ${vm.historyLoading.value ? 'Chargement…' : 'Afficher plus'}</button>`
          : nothing}
      `;

      const dispose = effect(() => {
        const results = vm.searchResults.value;
        render(
          html`
            ${pageHead('Commandes', 'Les nouvelles commandes apparaissent ici en direct.', alertsControl())}
            <form class="toolbar order-search" role="search" @submit=${(e: SubmitEvent) => { e.preventDefault(); void doSearch(); }}>
              <label class="toolbar__search">
                ${icon(search)}
                <span class="visually-hidden">Rechercher une commande</span>
                <input type="search" placeholder="Numéro (CB-…) ou téléphone de la cliente" .value=${live(vm.search.value)}
                  @input=${(e: InputEvent) => { vm.search.value = (e.target as HTMLInputElement).value; if (!vm.search.value) vm.clearSearch(); }} />
              </label>
              <button class="btn btn--secondary" type="submit" ?disabled=${vm.searching.value}>${vm.searching.value ? 'Recherche…' : 'Rechercher'}</button>
            </form>

            ${results
              ? html`
                  <div class="order-results__head">
                    <h2 class="order-results__title">${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${vm.search.value.trim()} »</h2>
                    <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.clearSearch()}>${icon(close)} Effacer la recherche</button>
                  </div>
                  ${list(results, 'Aucune commande trouvée')}
                `
              : html`
                  <div class="tabs order-tabs" role="tablist" aria-label="Vue">
                    <button class="tab ${vm.tab.value === 'active' ? 'is-active' : ''}" type="button" role="tab" aria-selected=${vm.tab.value === 'active' ? 'true' : 'false'}
                      @click=${() => (vm.tab.value = 'active')}>En cours ${vm.newCount.value ? html`<span class="tab__count tab__count--alert">${vm.newCount.value} nouvelle${vm.newCount.value > 1 ? 's' : ''}</span>` : nothing}</button>
                    <button class="tab ${vm.tab.value === 'history' ? 'is-active' : ''}" type="button" role="tab" aria-selected=${vm.tab.value === 'history' ? 'true' : 'false'}
                      @click=${() => { vm.tab.value = 'history'; if (!vm.history.value.length) void vm.loadHistory(); }}>Historique</button>
                  </div>
                  ${vm.tab.value === 'active' ? activeTab() : historyTab()}
                `}
          `,
          outlet,
        );
      });

      return () => {
        dispose();
        vm.stopLive();
      };
    },
  };
}
