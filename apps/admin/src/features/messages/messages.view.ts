// Écran Messages : boîte de réception en temps réel (nouveau / lu / traité). Ouvrir un message le
// passe en « lu » ; réponse par WhatsApp (message pré-rempli) ou par e-mail si l'adresse est fournie.
import { html, nothing, render } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, check, inbox, mail, package as packageIcon, phone, refresh, search, trash, whatsapp } from '@celeste/shared/icons';
import { MESSAGE_STATUS_LABELS, type Message, type MessageStatus, type WithId } from '@celeste/shared/models';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { buildCustomerLink } from '@celeste/shared/services/whatsapp';
import { formatPhone } from '@celeste/shared/utils/phone';
import { pageHead, type Page } from '../../app/shell.view';
import { alertsControl } from '../../app/alerts-control';
import { formatDateTime, formatRelative } from '../../app/format';
import { confirmDialog, openDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { MessagesViewModel } from './messages.viewmodel';

const FILTERS: { value: MessageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'read', label: 'Lus' },
  { value: 'done', label: 'Traités' },
];

export function messagesPage(user: AdminSession): Page {
  return {
    title: 'Messages',
    mount(outlet) {
      const vm = new MessagesViewModel();
      vm.start();

      const openMessage = (m: WithId<Message>) => {
        if (m.status === 'new') void vm.setStatus(m, 'read').catch(() => undefined); // ouvert = lu
        let current: WithId<Message> = { ...m, status: m.status === 'new' ? 'read' : m.status };
        const first = m.name.split(/\s+/)[0] ?? m.name;
        const product = m.productId ? vm.products.get(m.productId) : undefined;

        const setStatus = async (status: MessageStatus, done: string) => {
          try {
            await vm.setStatus(current, status);
            current = { ...current, status };
            draw();
            toast.success(done);
          } catch (e) {
            toast.error(errorMessage(e));
          }
        };
        const remove = async () => {
          const ok = await confirmDialog({ title: 'Supprimer ce message ?', message: 'Il sera effacé définitivement.', confirmLabel: 'Supprimer', danger: true });
          if (!ok) return;
          try {
            await vm.remove(current);
            dialog.close();
            toast.success('Message supprimé.');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        };

        const content = () => html`
          <div class="msg-detail">
            <div class="msg-detail__head">
              <span class="msg-pill msg-pill--${current.status}">${MESSAGE_STATUS_LABELS[current.status]}</span>
              <span class="msg-detail__date">${formatDateTime(current.createdAt)}</span>
            </div>
            <section class="od-card">
              <p class="od-customer__name">${current.name}</p>
              <p class="od-customer__line">${icon(phone)} <a href="tel:${current.phone}">${formatPhone(current.phone)}</a></p>
              ${current.email ? html`<p class="od-customer__line">${icon(mail)} <a href="mailto:${current.email}">${current.email}</a></p>` : nothing}
              ${product ? html`<p class="od-customer__line">${icon(packageIcon)} Au sujet de : <strong>${product.name}</strong></p>` : nothing}
            </section>
            <section class="od-card">
              <h3 class="od-card__title">${current.subject}</h3>
              <p class="msg-detail__body">${current.body}</p>
            </section>
            <div class="msg-detail__reply">
              <a class="btn btn--primary" href=${buildCustomerLink(current.phone, `Bonjour ${first}, ici Céleste Bôtchô. Merci pour votre message « ${current.subject} ». `)} target="_blank" rel="noopener">
                ${icon(whatsapp)} Répondre sur WhatsApp
              </a>
              ${current.email
                ? html`<a class="btn btn--secondary" href="mailto:${current.email}?subject=${encodeURIComponent(`Re : ${current.subject}`)}">${icon(mail)} Répondre par e-mail</a>`
                : nothing}
            </div>
            <div class="modal__actions">
              ${user.role === 'owner' ? html`<button class="btn btn--danger-outline" type="button" @click=${remove}>${icon(trash)} Supprimer</button>` : nothing}
              ${current.status === 'done'
                ? html`<button class="btn btn--secondary" type="button" @click=${() => setStatus('read', 'Message remis à traiter.')}>Remettre à traiter</button>`
                : html`<button class="btn btn--secondary" type="button" @click=${() => setStatus('new', 'Message marqué comme non lu.')}>Marquer non lu</button>
                    <button class="btn btn--primary" type="button" @click=${() => setStatus('done', 'Message traité.')}>${icon(check)} Marquer comme traité</button>`}
            </div>
          </div>
        `;
        const dialog = openDialog(`Message de ${m.name}`, content(), { panel: true });
        const draw = () => dialog.update(content());
      };

      const row = (m: WithId<Message>) => html`
        <li>
          <button class="msg-row msg-row--${m.status}" type="button" @click=${() => openMessage(m)}>
            <span class="msg-row__dot" aria-hidden="true"></span>
            <span class="msg-row__main">
              <span class="msg-row__top"><strong>${m.name}</strong><span class="msg-row__time">${formatRelative(m.createdAt)}</span></span>
              <span class="msg-row__subject">${m.subject}</span>
              <span class="msg-row__excerpt">${m.body}</span>
            </span>
            <span class="msg-pill msg-pill--${m.status}">${MESSAGE_STATUS_LABELS[m.status]}</span>
          </button>
        </li>
      `;

      const dispose = effect(() => {
        const list = vm.shown.value;
        render(
          html`
            ${pageHead('Messages', 'Questions envoyées depuis le formulaire de contact de la boutique.', alertsControl())}
            ${vm.error.value ? html`<div class="callout callout--error" role="status">${icon(alertTriangle)}<span>${vm.error.value}</span></div>` : nothing}
            <div class="toolbar">
              <label class="toolbar__search">
                ${icon(search)}
                <span class="visually-hidden">Rechercher un message</span>
                <input type="search" placeholder="Rechercher (nom, téléphone, texte)" .value=${live(vm.search.value)}
                  @input=${(e: InputEvent) => (vm.search.value = (e.target as HTMLInputElement).value)} />
              </label>
            </div>
            <div class="tabs" role="group" aria-label="Filtrer par statut">
              ${FILTERS.map(
                (f) => html`<button class="tab ${vm.filter.value === f.value ? 'is-active' : ''} ${f.value === 'new' && vm.counts.value.new ? 'tab--alert' : ''}" type="button"
                  aria-pressed=${vm.filter.value === f.value ? 'true' : 'false'} @click=${() => (vm.filter.value = f.value)}>
                  ${f.label} <span class="tab__count">${vm.counts.value[f.value]}</span></button>`,
              )}
            </div>
            ${vm.loading.value
              ? html`<ol class="order-list" aria-busy="true">${[0, 1, 2].map(() => html`<li class="order-row order-row--skeleton"><span class="skeleton-line"></span></li>`)}</ol>`
              : list.length
                ? html`<ol class="msg-list">${list.map(row)}</ol>`
                : html`<section class="empty"><span class="empty__icon">${icon(inbox)}</span>
                    <h2>${vm.messages.value.length ? 'Aucun message ne correspond' : 'Aucun message pour l’instant'}</h2>
                    ${vm.messages.value.length ? html`<button class="btn btn--secondary" type="button" @click=${() => { vm.filter.value = 'all'; vm.search.value = ''; }}>${icon(refresh)} Tout afficher</button>` : nothing}
                  </section>`}
          `,
          outlet,
        );
      });

      return () => {
        dispose();
        vm.dispose();
      };
    },
  };
}
