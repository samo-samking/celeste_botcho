// Écran Promotions : onglets En cours / Programmées / Terminées / Désactivées ; actions rapides
// (activer, désactiver, modifier, supprimer) ; formulaire dans un panneau latéral.
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, calendar, edit, eye, eyeOff, percent, plus, refresh, tag, trash } from '@celeste/shared/icons';
import { PROMO_SCOPE_LABELS, type Promotion, type WithId } from '@celeste/shared/models';
import type { PromoState } from '@celeste/shared/domain/promo';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { pageHead, type Page } from '../../app/shell.view';
import { formatDate } from '../../app/format';
import { confirmDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { openPromotionForm } from './promotion-form';
import { PromotionsViewModel } from './promotions.viewmodel';

const TABS: { value: PromoState; label: string; empty: string }[] = [
  { value: 'running', label: 'En cours', empty: 'Aucune promotion en cours' },
  { value: 'scheduled', label: 'Programmées', empty: 'Aucune promotion programmée' },
  { value: 'ended', label: 'Terminées', empty: 'Aucune promotion terminée' },
  { value: 'inactive', label: 'Désactivées', empty: 'Aucune promotion désactivée' },
];

export function promotionsPage(): Page {
  return {
    title: 'Promotions',
    mount(outlet) {
      const vm = new PromotionsViewModel();
      void vm.load();

      const targetsLabel = (p: WithId<Promotion>) => {
        if (p.scope === 'all') return 'Tout le site';
        const names =
          p.scope === 'category'
            ? p.targetIds.map((id) => vm.categories.value.find((c) => c.id === id)?.name)
            : p.scope === 'product'
              ? p.targetIds.map((id) => vm.products.value.find((x) => x.id === id)?.name)
              : p.targetIds;
        const known = names.filter(Boolean) as string[];
        return `${PROMO_SCOPE_LABELS[p.scope]} : ${known.slice(0, 3).join(', ')}${known.length > 3 ? ` +${known.length - 3}` : ''}`;
      };

      const toggle = async (p: WithId<Promotion>) => {
        try {
          await vm.setActive(p, !p.isActive);
          toast.success(p.isActive ? `« ${p.title} » est désactivée.` : `« ${p.title} » est activée.`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };
      const remove = async (p: WithId<Promotion>) => {
        const ok = await confirmDialog({ title: 'Supprimer la promotion ?', message: `« ${p.title} » sera supprimée définitivement. Pour simplement l’arrêter, désactivez-la.`, confirmLabel: 'Supprimer', danger: true });
        if (!ok) return;
        try {
          await vm.remove(p);
          toast.success(`« ${p.title} » a été supprimée.`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const card = (p: WithId<Promotion>) => {
        const count = vm.preview(p).length;
        return html`
          <li class="promo ${vm.pending.value === p.id ? 'is-pending' : ''}">
            <span class="promo__badge">${PromotionsViewModel.label(p, (n) => formatFcfa(n, { short: true }))}</span>
            <div class="promo__main">
              <p class="promo__title">${p.title} ${p.code ? html`<span class="promo__code">${icon(tag)} ${p.code}</span>` : nothing}</p>
              <p class="promo__meta">${targetsLabel(p)} · ${count} format${count > 1 ? 's' : ''} publié${count > 1 ? 's' : ''}</p>
              <p class="promo__meta">${icon(calendar)} du ${formatDate(p.startsAt)} au ${formatDate(p.endsAt)}</p>
            </div>
            <div class="prod__actions">
              <button class="icon-btn" type="button" title=${p.isActive ? 'Désactiver' : 'Activer'} @click=${() => toggle(p)}>
                ${icon(p.isActive ? eyeOff : eye, { label: p.isActive ? `Désactiver « ${p.title} »` : `Activer « ${p.title} »` })}</button>
              <button class="icon-btn" type="button" title="Modifier" @click=${() => openPromotionForm(vm, p)}>${icon(edit, { label: `Modifier « ${p.title} »` })}</button>
              <button class="icon-btn icon-btn--danger" type="button" title="Supprimer" @click=${() => remove(p)}>${icon(trash, { label: `Supprimer « ${p.title} »` })}</button>
            </div>
          </li>
        `;
      };

      const dispose = effect(() => {
        const groups = vm.byState.value;
        const current = TABS.find((t) => t.value === vm.tab.value)!;
        render(
          html`
            ${pageHead(
              'Promotions',
              'Remises automatiques ou avec code, sur tout le site, une catégorie, un produit ou un format.',
              html`<button class="btn btn--primary" type="button" ?disabled=${vm.loading.value} @click=${() => openPromotionForm(vm)}>${icon(plus)} Nouvelle promotion</button>`,
            )}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button></div>`
              : nothing}
            <div class="tabs" role="group" aria-label="Filtrer par état">
              ${TABS.map(
                (t) => html`<button class="tab ${vm.tab.value === t.value ? 'is-active' : ''}" type="button" aria-pressed=${vm.tab.value === t.value ? 'true' : 'false'}
                  @click=${() => (vm.tab.value = t.value)}>${t.label} <span class="tab__count">${groups[t.value].length}</span></button>`,
              )}
            </div>
            ${vm.loading.value
              ? html`<ul class="promo-list" aria-busy="true">${[0, 1].map(() => html`<li class="promo promo--skeleton"><span class="skeleton-line"></span></li>`)}</ul>`
              : groups[vm.tab.value].length
                ? html`<ul class="promo-list">${groups[vm.tab.value].map(card)}</ul>`
                : html`<section class="empty"><span class="empty__icon">${icon(percent)}</span><h2>${current.empty}</h2>
                    ${vm.tab.value === 'running' ? html`<button class="btn btn--primary" type="button" @click=${() => openPromotionForm(vm)}>${icon(plus)} Créer une promotion</button>` : nothing}</section>`}
          `,
          outlet,
        );
      });
      return dispose;
    },
  };
}
