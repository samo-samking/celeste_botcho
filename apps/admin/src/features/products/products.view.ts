// Écran Produits : liste filtrable, actions rapides (publier, archiver, ordre, suppression),
// formulaire complet dans un panneau latéral (product-form.ts).
import { html, nothing, render } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import {
  alertTriangle,
  archive,
  chevronDown,
  chevronUp,
  copy,
  edit,
  eye,
  eyeOff,
  image,
  package as packageIcon,
  plus,
  refresh,
  search,
  star,
  trash,
} from '@celeste/shared/icons';
import type { Product, ProductStatus, WithId } from '@celeste/shared/models';
import { cld } from '@celeste/shared/services/images';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { pageHead, type Page } from '../../app/shell.view';
import { ROUTES } from '../../app/router';
import { confirmDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { openProductForm } from './product-form';
import { ProductsViewModel, type StatusFilter } from './products.viewmodel';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'published', label: 'Publiés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'archived', label: 'Archivés' },
];

/** Bouton icône : même texte pour l'étiquette accessible et la bulle d'aide au survol. */
const iconBtn = (ico: string, label: string, onClick: () => unknown, { danger = false, disabled = false } = {}) => html`
  <button class="icon-btn ${danger ? 'icon-btn--danger' : ''}" type="button" title=${label} ?disabled=${disabled} @click=${onClick}>
    ${icon(ico, { label })}
  </button>
`;

export function productsPage(): Page {
  return {
    title: 'Produits',
    mount(outlet) {
      const vm = new ProductsViewModel();
      void vm.load().then(() => {
        // ouverture directe du formulaire depuis le tableau de bord (/produits?nouveau)
        if (new URLSearchParams(location.search).has('nouveau')) {
          history.replaceState(null, '', location.pathname);
          openProductForm(vm);
        }
      });

      const changeStatus = async (p: WithId<Product>, status: ProductStatus, done: string) => {
        try {
          const errors = await vm.setStatus(p, status);
          if (errors) {
            toast.error(errors.status ?? 'Ce produit ne peut pas changer de statut : ouvrez-le pour compléter sa fiche.');
            return;
          }
          toast.success(done);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const archiveProduct = async (p: WithId<Product>) => {
        const ok =
          p.status !== 'published' ||
          (await confirmDialog({
            title: 'Archiver le produit ?',
            message: `« ${p.name} » ne sera plus visible sur la boutique. Vous pourrez le restaurer à tout moment.`,
            confirmLabel: 'Archiver',
          }));
        if (ok) await changeStatus(p, 'archived', `« ${p.name} » est archivé.`);
      };

      const removeProduct = async (p: WithId<Product>) => {
        const ok = await confirmDialog({
          title: 'Supprimer définitivement ?',
          message: `« ${p.name} » sera supprimé. Cette action est irréversible ; pour simplement le retirer de la boutique, archivez-le.`,
          confirmLabel: 'Supprimer',
          danger: true,
        });
        if (!ok) return;
        try {
          await vm.remove(p);
          toast.success(`« ${p.name} » a été supprimé.`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const row = (p: WithId<Product>, index: number, total: number, canReorder: boolean) => {
        const thumb = p.images?.[0];
        const active = p.variants.filter((v) => v.isActive).length;
        return html`
          <li class="prod ${vm.pending.value === p.id ? 'is-pending' : ''} prod--${p.status}">
            <button class="prod__open" type="button" @click=${() => openProductForm(vm, p)} aria-label="Modifier « ${p.name} »">
              <span class="prod__thumb">
                ${thumb
                  ? html`<img src=${cld(thumb.url, 'c_fill,ar_1:1,w_160')} alt="" loading="lazy"
                      @error=${(e: Event) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />`
                  : html`<span>${icon(image)}</span>`}
              </span>
              <span class="prod__main">
                <span class="prod__name">
                  ${p.name}
                  ${p.isFeatured ? html`<span class="prod__star" title="Produit vedette">${icon(star, { label: 'Vedette' })}</span>` : nothing}
                </span>
                <span class="prod__meta">
                  <span>${p.categoryName || 'Sans catégorie'}</span>
                  <span>${active} format${active > 1 ? 's' : ''}</span>
                  ${p.status === 'published' && !p.inStock ? html`<span class="pill pill--warn">Rupture</span>` : nothing}
                </span>
              </span>
              <span class="prod__price">${p.minPrice ? html`<small>à partir de</small> ${formatFcfa(p.minPrice, { short: true })}` : '—'}</span>
              <span class="pill pill--${p.status}">${vm.statusLabel(p.status)}</span>
            </button>
            <div class="prod__actions">
              ${p.status === 'draft'
                ? iconBtn(eye, `Publier « ${p.name} »`, () => changeStatus(p, 'published', `« ${p.name} » est publié sur la boutique.`))
                : p.status === 'published'
                  ? iconBtn(eyeOff, `Retirer « ${p.name} » de la boutique`, () => changeStatus(p, 'draft', `« ${p.name} » est repassé en brouillon.`))
                  : iconBtn(refresh, `Restaurer « ${p.name} »`, () => changeStatus(p, 'draft', `« ${p.name} » est restauré en brouillon.`))}
              ${p.status !== 'archived' ? iconBtn(archive, `Archiver « ${p.name} »`, () => archiveProduct(p)) : nothing}
              ${canReorder
                ? html`
                    ${iconBtn(chevronUp, `Monter « ${p.name} »`, () => vm.move(p.id, index - 1).catch((e) => toast.error(errorMessage(e))), { disabled: index === 0 })}
                    ${iconBtn(chevronDown, `Descendre « ${p.name} »`, () => vm.move(p.id, index + 1).catch((e) => toast.error(errorMessage(e))), { disabled: index === total - 1 })}
                  `
                : nothing}
              ${iconBtn(edit, `Modifier « ${p.name} »`, () => openProductForm(vm, p))}
              ${iconBtn(copy, `Dupliquer « ${p.name} »`, () => openProductForm(vm, undefined, p))}
              ${p.status !== 'published' ? iconBtn(trash, `Supprimer « ${p.name} »`, () => removeProduct(p), { danger: true }) : nothing}
            </div>
          </li>
        `;
      };

      const toolbar = () => html`
        <div class="toolbar">
          <label class="toolbar__search">
            ${icon(search)}
            <span class="visually-hidden">Rechercher un produit</span>
            <input type="search" placeholder="Rechercher (nom, catégorie, SKU)" .value=${live(vm.search.value)}
              @input=${(e: InputEvent) => (vm.search.value = (e.target as HTMLInputElement).value)} />
          </label>
          <label class="toolbar__select">
            <span class="visually-hidden">Catégorie</span>
            <select .value=${live(vm.categoryId.value)} @change=${(e: Event) => (vm.categoryId.value = (e.target as HTMLSelectElement).value)}>
              <option value="">Toutes les catégories</option>
              ${vm.categories.value.map((c) => html`<option value=${c.id} ?selected=${vm.categoryId.value === c.id}>${c.name}</option>`)}
            </select>
          </label>
          <label class="toolbar__check">
            <input type="checkbox" .checked=${live(vm.outOfStock.value)} @change=${(e: Event) => (vm.outOfStock.value = (e.target as HTMLInputElement).checked)} />
            En rupture
          </label>
        </div>
        <div class="tabs" role="group" aria-label="Filtrer par statut">
          ${STATUS_TABS.map(
            (t) => html`
              <button class="tab ${vm.status.value === t.value ? 'is-active' : ''}" type="button" aria-pressed=${vm.status.value === t.value ? 'true' : 'false'}
                @click=${() => (vm.status.value = t.value)}>
                ${t.label} <span class="tab__count">${vm.counts.value[t.value]}</span>
              </button>
            `,
          )}
        </div>
      `;

      const dispose = effect(() => {
        const items = vm.filtered.value;
        const canReorder = !vm.hasFilters.value;
        const noCategory = !vm.loading.value && !vm.categories.value.length;
        render(
          html`
            ${pageHead(
              'Produits',
              canReorder && items.length > 1
                ? "L'ordre de cette liste est celui de la boutique. Utilisez les flèches pour le changer."
                : 'Ajoutez, modifiez et publiez vos produits.',
              html`<button class="btn btn--primary" type="button" ?disabled=${noCategory} @click=${() => openProductForm(vm)}>${icon(plus)} Nouveau produit</button>`,
            )}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">
                  ${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button>
                </div>`
              : nothing}
            ${noCategory
              ? html`
                  <section class="empty">
                    <span class="empty__icon">${icon(packageIcon)}</span>
                    <h2>Créez d'abord une catégorie</h2>
                    <p>Chaque produit appartient à une catégorie. Commencez par en créer une, puis revenez ajouter vos produits.</p>
                    <a class="btn btn--primary" href="${ROUTES.categories}?nouveau" data-link>${icon(plus)} Créer une catégorie</a>
                  </section>
                `
              : html`
                  ${toolbar()}
                  ${vm.loading.value
                    ? html`<ul class="prod-list" aria-busy="true">${[0, 1, 2].map(() => html`<li class="prod prod--skeleton"><span class="skeleton-line"></span></li>`)}</ul>`
                    : items.length
                      ? html`<ol class="prod-list">${items.map((p, i) => row(p, i, items.length, canReorder))}</ol>`
                      : vm.hasFilters.value
                        ? html`<section class="empty">
                            <span class="empty__icon">${icon(search)}</span>
                            <h2>Aucun produit ne correspond</h2>
                            <button class="btn btn--secondary" type="button" @click=${() => vm.resetFilters()}>Effacer les filtres</button>
                          </section>`
                        : html`<section class="empty">
                            <span class="empty__icon">${icon(packageIcon)}</span>
                            <h2>Aucun produit pour l'instant</h2>
                            <p>Ajoutez votre premier produit : photos, formats et prix, composition et précautions.</p>
                            <button class="btn btn--primary" type="button" @click=${() => openProductForm(vm)}>${icon(plus)} Ajouter un produit</button>
                          </section>`}
                `}
          `,
          outlet,
        );
      });
      return dispose;
    },
  };
}
