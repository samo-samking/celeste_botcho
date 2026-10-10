// Écran Comptes admin (propriétaire) : qui a accès, rôle, dernière connexion ; renommer, désactiver
// ou réactiver un compte. L'ajout d'un compte passe par la console Firebase + `npm run set-admin`
// (le rôle est une donnée sécurisée que le navigateur ne peut pas attribuer).
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, edit, info, lock, refresh, users } from '@celeste/shared/icons';
import type { Admin, WithId } from '@celeste/shared/models';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { pageHead, type Page } from '../../app/shell.view';
import { formatRelative } from '../../app/format';
import { confirmDialog, promptDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { AdminsViewModel } from './admins.viewmodel';

const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Gestionnaire' } as const;
const ROLE_RIGHTS = {
  owner: 'Tout, y compris Configuration, Livraison, Comptes et Journal.',
  manager: 'Produits, catégories, promotions, commandes et messages.',
} as const;

export function adminsPage(user: AdminSession): Page {
  return {
    title: 'Comptes admin',
    mount(outlet) {
      const vm = new AdminsViewModel();
      void vm.load();

      const toggle = async (a: WithId<Admin>) => {
        if (a.isActive) {
          const ok = await confirmDialog({
            title: `Désactiver ${a.displayName} ?`,
            message: 'Cette personne sera déconnectée à sa prochaine action et ne pourra plus se reconnecter. Vous pourrez la réactiver à tout moment.',
            confirmLabel: 'Désactiver',
            danger: true,
          });
          if (!ok) return;
        }
        try {
          await vm.setActive(a, !a.isActive);
          toast.success(a.isActive ? `${a.displayName} est désactivé(e).` : `${a.displayName} est réactivé(e).`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const rename = async (a: WithId<Admin>) => {
        const name = await promptDialog({ title: 'Renommer le compte', message: `Nom affiché pour ${a.email}.`, label: 'Nom affiché', placeholder: a.displayName, confirmLabel: 'Renommer' });
        if (!name || name === a.displayName) return;
        try {
          await vm.rename(a, name.slice(0, 60));
          toast.success('Nom mis à jour.');
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const card = (a: WithId<Admin>) => {
        const self = a.id === user.uid;
        return html`
          <li class="adm ${a.isActive ? '' : 'is-off'} ${vm.pending.value === a.id ? 'is-pending' : ''}">
            <span class="sidebar__avatar adm__avatar" aria-hidden="true">${(a.displayName || a.email).slice(0, 1).toUpperCase()}</span>
            <div class="adm__main">
              <p class="adm__name">${a.displayName}${self ? html` <small>(vous)</small>` : nothing}</p>
              <p class="adm__email">${a.email}</p>
              <p class="adm__meta">
                <span class="pill adm__role adm__role--${a.role}">${ROLE_LABELS[a.role]}</span>
                ${a.isActive ? nothing : html`<span class="pill pill--muted">Désactivé</span>`}
                <span>Dernière connexion : ${a.lastLoginAt ? formatRelative(a.lastLoginAt) : 'jamais'}</span>
              </p>
            </div>
            <div class="prod__actions">
              <button class="icon-btn" type="button" title="Renommer" @click=${() => rename(a)}>${icon(edit, { label: `Renommer ${a.displayName}` })}</button>
              ${self || a.role === 'owner'
                ? html`<span class="adm__locked" title="Le compte propriétaire ne peut pas être désactivé ici">${icon(lock)}</span>`
                : html`<button class="btn btn--sm ${a.isActive ? 'btn--danger-outline' : 'btn--secondary'}" type="button" @click=${() => toggle(a)}>
                    ${a.isActive ? 'Désactiver' : 'Réactiver'}</button>`}
            </div>
          </li>
        `;
      };

      const dispose = effect(() => {
        render(
          html`
            ${pageHead('Comptes admin', 'Les personnes qui ont accès à cette administration.')}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button></div>`
              : nothing}
            ${vm.loading.value
              ? html`<ul class="promo-list" aria-busy="true">${[0, 1].map(() => html`<li class="promo promo--skeleton"><span class="skeleton-line"></span></li>`)}</ul>`
              : vm.admins.value.length
                ? html`<ul class="adm-list">${vm.admins.value.map(card)}</ul>`
                : html`<section class="empty"><span class="empty__icon">${icon(users)}</span><h2>Aucun compte</h2></section>`}

            <section class="set-card adm-help">
              <h2 class="set-card__title">${icon(info)} Les deux rôles</h2>
              <dl class="adm-roles">
                ${(['owner', 'manager'] as const).map((r) => html`<div><dt>${ROLE_LABELS[r]}</dt><dd>${ROLE_RIGHTS[r]}</dd></div>`)}
              </dl>
              <h2 class="set-card__title">Ajouter un gestionnaire</h2>
              <ol class="adm-steps">
                <li>Console Firebase › <strong>Authentication</strong> › <strong>Ajouter un utilisateur</strong> : son e-mail et un mot de passe provisoire.</li>
                <li>Sur l’ordinateur du projet : <code>npm run set-admin -- son@email.com manager</code></li>
                <li>Envoyez-lui l’adresse de l’admin ; elle pourra changer son mot de passe avec « Mot de passe oublié ».</li>
              </ol>
              <p class="set-card__intro">Pour des raisons de sécurité, le rôle ne s’attribue pas depuis le navigateur.</p>
            </section>
          `,
          outlet,
        );
      });
      return dispose;
    },
  };
}
