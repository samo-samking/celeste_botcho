// Écran Journal (propriétaire) : qui a fait quoi et quand ; filtres par type d'action et par auteur ;
// bouton « Exporter les données » (sauvegarde manuelle hebdomadaire conseillée).
import { html, nothing, render } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect, signal } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, download, history, refresh } from '@celeste/shared/icons';
import { pageHead, type Page } from '../../app/shell.view';
import { formatDateTime } from '../../app/format';
import { errorMessage, toast } from '../../components/toast/toast';
import { ACTION_GROUPS, ACTION_LABELS, JournalViewModel } from './journal.viewmodel';

export function journalPage(): Page {
  return {
    title: 'Journal',
    mount(outlet) {
      const vm = new JournalViewModel();
      void vm.load();
      const exporting = signal(false);

      const exportData = async () => {
        exporting.value = true;
        try {
          const { name, json, counts } = await vm.exportData();
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          Object.assign(document.createElement('a'), { href: url, download: name }).click();
          URL.revokeObjectURL(url);
          toast.success(`Sauvegarde téléchargée : ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ')}.`);
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          exporting.value = false;
        }
      };

      const dispose = effect(() => {
        const list = vm.shown.value;
        render(
          html`
            ${pageHead(
              'Journal',
              'Toutes les actions faites dans l’administration : prix, publications, commandes, réglages…',
              html`<button class="btn btn--secondary" type="button" ?disabled=${exporting.value} @click=${exportData}>${icon(download)} ${exporting.value ? 'Préparation…' : 'Exporter les données'}</button>`,
            )}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button></div>`
              : nothing}
            <div class="toolbar log-filters">
              <label class="toolbar__select">
                <span class="visually-hidden">Type d’action</span>
                <select .value=${live(vm.group.value)} @change=${(e: Event) => (vm.group.value = (e.target as HTMLSelectElement).value)}>
                  <option value="">Toutes les actions</option>
                  ${Object.entries(ACTION_GROUPS).map(([k, label]) => html`<option value=${k} ?selected=${vm.group.value === k}>${label}</option>`)}
                </select>
              </label>
              <label class="toolbar__select">
                <span class="visually-hidden">Auteur</span>
                <select .value=${live(vm.actor.value)} @change=${(e: Event) => (vm.actor.value = (e.target as HTMLSelectElement).value)}>
                  <option value="">Tous les comptes</option>
                  ${[...vm.admins.value.values()].map((a) => html`<option value=${a.id} ?selected=${vm.actor.value === a.id}>${a.displayName}</option>`)}
                </select>
              </label>
            </div>
            ${vm.loading.value && !vm.logs.value.length
              ? html`<ul class="promo-list" aria-busy="true">${[0, 1, 2].map(() => html`<li class="promo promo--skeleton"><span class="skeleton-line"></span></li>`)}</ul>`
              : list.length
                ? html`<ol class="log-list">
                    ${list.map(
                      (l) => html`<li class="log">
                        <time class="log__at">${formatDateTime(l.at)}</time>
                        <div class="log__main">
                          <span class="log__action">${ACTION_LABELS[l.action] ?? l.action}</span>
                          <span class="log__summary">${l.summary}</span>
                        </div>
                        <span class="log__actor">${vm.actorName(l.actorUid)}</span>
                      </li>`,
                    )}
                  </ol>`
                : html`<section class="empty"><span class="empty__icon">${icon(history)}</span><h2>Aucune action ${vm.group.value || vm.actor.value ? 'pour ce filtre' : 'pour l’instant'}</h2>
                    ${vm.hasMore.value ? html`<p>Les filtres portent sur les actions déjà chargées : chargez la suite pour chercher plus loin.</p>` : nothing}</section>`}
            ${vm.hasMore.value
              ? html`<button class="btn btn--secondary order-more" type="button" ?disabled=${vm.loading.value} @click=${() => vm.load(true)}>${vm.loading.value ? 'Chargement…' : 'Charger les actions plus anciennes'}</button>`
              : nothing}
          `,
          outlet,
        );
      });
      return dispose;
    },
  };
}
