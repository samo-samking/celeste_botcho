// Écran Livraison : zones (Abidjan par commune, expédition vers l'intérieur…), mode, tarif, ordre.
// Aperçu de ce que verra la cliente à la commande. Lecture seule pour un gestionnaire.
import { html, nothing, render } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, chevronDown, chevronUp, lock, mapPin, plus, refresh, trash, truck } from '@celeste/shared/icons';
import type { DeliveryMode } from '@celeste/shared/models';
import { DELIVERY_MODE_LABELS } from '@celeste/shared/domain/delivery';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { pageHead, type Page } from '../../app/shell.view';
import { confirmDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { DeliveryViewModel, newZone, type ZoneRow } from './delivery.viewmodel';

const digits = (v: string) => v.replace(/[^\d]/g, '');

export function deliveryPage(user: AdminSession): Page {
  return {
    title: 'Livraison',
    mount(outlet) {
      const vm = new DeliveryViewModel();
      const canEdit = user.role === 'owner';
      void vm.load();

      const err = (k: string) => vm.errors.value[k];
      const add = (mode: DeliveryMode) => {
        const row = newZone(mode);
        vm.rows.push(row);
        vm.touch();
        queueMicrotask(() => document.getElementById(`zone-${row.key}-name`)?.focus());
      };
      const save = async () => {
        try {
          if (await vm.save()) toast.success('Zones de livraison enregistrées.');
          else toast.error('Certaines zones sont à corriger.');
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };
      const cancel = async () => {
        if (await confirmDialog({ title: 'Annuler les modifications ?', message: 'Les changements non enregistrés seront perdus.', confirmLabel: 'Annuler les modifications', danger: true })) {
          await vm.load();
        }
      };
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (vm.dirty.value) e.preventDefault();
      };
      window.addEventListener('beforeunload', onBeforeUnload);

      const row = (r: ZoneRow, i: number) => html`
        <li class="zone">
          <div class="zone__field zone__field--name">
            <label for="zone-${r.key}-name">Zone</label>
            <input id="zone-${r.key}-name" class="vr__input" type="text" maxlength="60" placeholder="Abidjan — Cocody" .value=${live(r.name)}
              ?disabled=${!canEdit} aria-invalid=${err(`zones.${i}.name`) ? 'true' : 'false'}
              @input=${(e: InputEvent) => { r.name = (e.target as HTMLInputElement).value; vm.touch(); }} />
            ${err(`zones.${i}.name`) ? html`<span class="vr__error">${err(`zones.${i}.name`)}</span>` : nothing}
          </div>
          <div class="zone__field">
            <label for="zone-${r.key}-mode">Mode</label>
            <select id="zone-${r.key}-mode" class="vr__input" .value=${live(r.mode)} ?disabled=${!canEdit}
              @change=${(e: Event) => { r.mode = (e.target as HTMLSelectElement).value as DeliveryMode; vm.touch(); }}>
              <option value="local" ?selected=${r.mode === 'local'}>Main propre</option>
              <option value="shipping" ?selected=${r.mode === 'shipping'}>Expédition</option>
            </select>
          </div>
          <div class="zone__field">
            <label for="zone-${r.key}-fee">Tarif (F CFA)</label>
            <input id="zone-${r.key}-fee" class="vr__input vr__input--price" type="text" inputmode="numeric" placeholder="1500" .value=${live(r.fee)}
              ?disabled=${!canEdit} aria-invalid=${err(`zones.${i}.fee`) ? 'true' : 'false'}
              @input=${(e: InputEvent) => { r.fee = digits((e.target as HTMLInputElement).value); vm.touch(); }} />
            ${err(`zones.${i}.fee`)
              ? html`<span class="vr__error">${err(`zones.${i}.fee`)}</span>`
              : r.fee !== '' ? html`<span class="vr__hint">${Number(r.fee) === 0 ? 'Gratuite' : formatFcfa(Number(r.fee))}</span>` : nothing}
          </div>
          ${canEdit
            ? html`<div class="zone__tools">
                <button class="icon-btn" type="button" ?disabled=${i === 0} @click=${() => vm.move(i, i - 1)}>${icon(chevronUp, { label: `Monter « ${r.name || 'zone'} »` })}</button>
                <button class="icon-btn" type="button" ?disabled=${i === vm.rows.length - 1} @click=${() => vm.move(i, i + 1)}>${icon(chevronDown, { label: `Descendre « ${r.name || 'zone'} »` })}</button>
                <button class="icon-btn icon-btn--danger" type="button" @click=${() => { vm.rows.splice(i, 1); vm.touch(); }}>${icon(trash, { label: `Supprimer « ${r.name || 'zone'} »` })}</button>
              </div>`
            : nothing}
        </li>
      `;

      /** Aperçu : ce que la cliente choisira à la commande. */
      const preview = () => {
        const valid = vm.rows.filter((r) => r.name.trim() && r.fee !== '');
        const group = (mode: DeliveryMode) => {
          const list = valid.filter((r) => r.mode === mode);
          return list.length
            ? html`<p class="zone-preview__mode">${icon(mode === 'local' ? mapPin : truck)} ${DELIVERY_MODE_LABELS[mode]}</p>
                <ul class="zone-preview__list">
                  ${list.map((r) => html`<li><span>${r.name.trim()}</span><strong>${Number(r.fee) === 0 ? 'Gratuite' : formatFcfa(Number(r.fee))}</strong></li>`)}
                </ul>`
            : nothing;
        };
        return html`
          <section class="set-card">
            <h2 class="set-card__title">Ce que verra la cliente</h2>
            <p class="set-card__intro">Au moment de commander, elle choisit sa zone ; les frais s'ajoutent au total.</p>
            ${valid.length ? html`${group('local')}${group('shipping')}` : html`<p class="set-preview__empty">Aucune zone : la commande en ligne ne pourra pas être passée.</p>`}
          </section>
        `;
      };

      const dispose = effect(() => {
        void vm.version.value;
        render(
          html`
            ${pageHead('Livraison', 'Zones de livraison et d’expédition, et leurs tarifs.')}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button></div>`
              : nothing}
            ${canEdit ? nothing : html`<p class="callout callout--info">${icon(lock)}<span>Seule la propriétaire peut modifier les zones et les tarifs.</span></p>`}
            ${vm.loading.value
              ? html`<div class="set-card set-card--skeleton" aria-busy="true"><span class="skeleton-line"></span><span class="skeleton-line"></span></div>`
              : html`
                  <div class="set-panel">
                    <section class="set-card">
                      <h2 class="set-card__title">Zones</h2>
                      <p class="set-card__intro">
                        « Main propre » : vous ou un livreur remettez le colis (ex. communes d’Abidjan).
                        « Expédition » : envoi par car ou transporteur vers l’intérieur du pays. L’ordre est celui de la liste proposée à la cliente.
                      </p>
                      ${vm.rows.length ? html`<ol class="zone-list">${vm.rows.map(row)}</ol>` : html`<p class="set-preview__empty">Aucune zone pour l’instant.</p>`}
                      ${err('zones') ? html`<p class="field__error">${err('zones')}</p>` : nothing}
                      ${canEdit
                        ? html`<div class="zone-add">
                            <button class="btn btn--secondary btn--sm" type="button" @click=${() => add('local')}>${icon(plus)} Zone de livraison</button>
                            <button class="btn btn--secondary btn--sm" type="button" @click=${() => add('shipping')}>${icon(plus)} Zone d’expédition</button>
                          </div>`
                        : nothing}
                    </section>
                    ${preview()}
                  </div>
                  ${canEdit
                    ? html`<div class="set-bar ${vm.dirty.value || vm.saving.value ? 'is-visible' : ''}" role="region" aria-label="Enregistrement">
                        <p class="set-bar__text">${Object.keys(vm.errors.value).length ? 'Zones à corriger' : 'Modifications non enregistrées'}</p>
                        <button class="btn btn--secondary" type="button" ?disabled=${vm.saving.value} @click=${cancel}>Annuler</button>
                        <button class="btn btn--primary" type="button" ?disabled=${vm.saving.value} @click=${save}>${vm.saving.value ? 'Enregistrement…' : 'Enregistrer'}</button>
                      </div>`
                    : nothing}
                `}
          `,
          outlet,
        );
      });
      return () => {
        dispose();
        window.removeEventListener('beforeunload', onBeforeUnload);
      };
    },
  };
}
