// Écran Catégories : liste dans l'ordre de la boutique (glisser-déposer ou flèches), activation,
// création / modification dans une boîte de dialogue, suppression (refusée si la catégorie a des produits).
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, chevronDown, chevronUp, edit, folder, grip, image, plus, refresh, trash } from '@celeste/shared/icons';
import type { Category, WithId } from '@celeste/shared/models';
import { slugify } from '@celeste/shared/utils/slug';
import { CATEGORY_PRESETS, LIGHT_TEXT, categoryColor, contrastRatio, darkenToContrast } from '@celeste/shared/utils/color';
import { cld } from '@celeste/shared/services/images';
import { pageHead, type Page } from '../../app/shell.view';
import { colorField, formField, switchField } from '../../components/form-field/form-field';
import { ImageUploader } from '../../components/image-uploader/image-uploader';
import { confirmDialog, openDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { CategoriesViewModel } from './categories.viewmodel';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
/** Nom de la teinte proposée (« Or ambré »), ou son code pour une couleur personnalisée. */
const colorName = (hex: string) => CATEGORY_PRESETS.find((p) => p.hex === hex)?.name ?? hex;

export function categoriesPage(): Page {
  return {
    title: 'Catégories',
    mount(outlet) {
      const vm = new CategoriesViewModel();
      void vm.load();
      let dragId: string | null = null;

      // ouverture directe du formulaire depuis le tableau de bord (/categories?nouveau)
      if (new URLSearchParams(location.search).has('nouveau')) {
        history.replaceState(null, '', location.pathname);
        queueMicrotask(() => openForm(vm));
      }

      const row = (c: WithId<Category>, index: number, total: number) => html`
        <li class="cat ${c.isActive ? '' : 'is-inactive'} ${vm.pending.value === c.id ? 'is-pending' : ''}"
          style="--cat-color: ${categoryColor(c.color, index)}"
          draggable="true"
          @dragstart=${(e: DragEvent) => {
            dragId = c.id;
            e.dataTransfer?.setData('text/plain', c.id);
            (e.currentTarget as HTMLElement).classList.add('is-dragging');
          }}
          @dragend=${(e: DragEvent) => {
            dragId = null;
            (e.currentTarget as HTMLElement).classList.remove('is-dragging');
          }}
          @dragover=${(e: DragEvent) => {
            if (!dragId) return;
            e.preventDefault();
            (e.currentTarget as HTMLElement).classList.add('is-drop-target');
          }}
          @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove('is-drop-target')}
          @drop=${(e: DragEvent) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).classList.remove('is-drop-target');
            if (dragId && dragId !== c.id) void vm.move(dragId, index).catch((err) => toast.error(errorMessage(err)));
          }}>
          <span class="cat__grip" aria-hidden="true" title="Glisser pour réordonner">${icon(grip)}</span>
          <div class="cat__thumb">
            ${c.imageUrl
              ? html`<img src=${cld(c.imageUrl, 'c_fill,g_auto,ar_3:2,w_240')} alt="" loading="lazy"
                  @error=${(e: Event) => (e.target as HTMLElement).replaceWith(Object.assign(document.createElement('span'), { className: 'cat__thumb-missing', textContent: '?' }))} />`
              : html`<span>${icon(image)}</span>`}
          </div>
          <div class="cat__main">
            <p class="cat__name">${c.name}</p>
            <p class="cat__meta">
              <span class="cat__color" title="Couleur de la vitrine">
                <span class="cat__swatch" aria-hidden="true"></span>${colorName(categoryColor(c.color, index))}
              </span>
              <span>/${c.slug}</span>
              <span class="cat__count">${plural(c.productCount, 'produit publié', 'produits publiés')}</span>
              ${c.isActive ? nothing : html`<span class="pill pill--muted">Masquée</span>`}
            </p>
          </div>
          <div class="cat__actions">
            <label class="cat__toggle">
              <span class="visually-hidden">Afficher « ${c.name} » sur la boutique</span>
              <input class="switch" type="checkbox" role="switch" .checked=${c.isActive} ?disabled=${vm.pending.value === c.id}
                @change=${() =>
                  vm
                    .toggle(c)
                    .then(() => toast.success(`« ${c.name} » est maintenant ${c.isActive ? 'masquée' : 'visible'} sur la boutique.`))
                    .catch((err) => toast.error(errorMessage(err)))} />
            </label>
            <button class="icon-btn" type="button" ?disabled=${index === 0} @click=${() => vm.move(c.id, index - 1).catch((err) => toast.error(errorMessage(err)))}>
              ${icon(chevronUp, { label: `Monter « ${c.name} »` })}
            </button>
            <button class="icon-btn" type="button" ?disabled=${index === total - 1} @click=${() => vm.move(c.id, index + 1).catch((err) => toast.error(errorMessage(err)))}>
              ${icon(chevronDown, { label: `Descendre « ${c.name} »` })}
            </button>
            <button class="icon-btn" type="button" @click=${() => openForm(vm, c)}>${icon(edit, { label: `Modifier « ${c.name} »` })}</button>
            <button class="icon-btn icon-btn--danger" type="button" @click=${() => removeCategory(vm, c)}>
              ${icon(trash, { label: `Supprimer « ${c.name} »` })}
            </button>
          </div>
        </li>
      `;

      const dispose = effect(() => {
        const list = vm.list.value;
        render(
          html`
            ${pageHead(
              'Catégories',
              "L'ordre de cette liste est celui de la boutique. Glissez une catégorie ou utilisez les flèches pour le changer.",
              html`<button class="btn btn--primary" type="button" @click=${() => openForm(vm)}>${icon(plus)} Nouvelle catégorie</button>`,
            )}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">
                  ${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load()}>${icon(refresh)} Réessayer</button>
                </div>`
              : nothing}
            ${vm.loading.value
              ? html`<ul class="cat-list" aria-busy="true">${[0, 1, 2].map(() => html`<li class="cat cat--skeleton"><span class="skeleton-line"></span></li>`)}</ul>`
              : list.length
                ? html`<ol class="cat-list">${list.map((c, i) => row(c, i, list.length))}</ol>`
                : html`
                    <section class="empty">
                      <span class="empty__icon">${icon(folder)}</span>
                      <h2>Aucune catégorie pour l'instant</h2>
                      <p>Les catégories regroupent vos produits sur la boutique, par exemple « Toffi Bassin & Fesses » ou « Soins ».</p>
                      <button class="btn btn--primary" type="button" @click=${() => openForm(vm)}>${icon(plus)} Créer la première catégorie</button>
                    </section>
                  `}
          `,
          outlet,
        );
      });
      return dispose;
    },
  };
}

async function removeCategory(vm: CategoriesViewModel, c: WithId<Category>) {
  const ok = await confirmDialog({
    title: 'Supprimer la catégorie ?',
    message: `« ${c.name} » sera supprimée définitivement. Si elle contient des produits, la suppression sera refusée : vous pourrez la masquer à la place.`,
    confirmLabel: 'Supprimer',
    danger: true,
  });
  if (!ok) return;
  try {
    await vm.remove(c);
    toast.success(`« ${c.name} » a été supprimée.`);
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

/** Formulaire de création (sans `previous`) ou de modification, dans une boîte de dialogue. */
function openForm(vm: CategoriesViewModel, previous?: WithId<Category>) {
  const form = {
    name: previous?.name ?? '',
    slug: previous?.slug ?? '',
    description: previous?.description ?? '',
    isActive: previous?.isActive ?? true,
    // existante : sa couleur (ou celle qu'elle affiche déjà) ; nouvelle : première teinte libre
    color: previous
      ? categoryColor(previous.color, vm.list.value.findIndex((c) => c.id === previous.id))
      : (CATEGORY_PRESETS.find((p) => !vm.list.value.some((c) => c.color === p.hex)) ?? CATEGORY_PRESETS[0]).hex as string,
  };
  let slugEdited = !!previous; // en création, l'adresse suit le nom tant qu'on ne la modifie pas
  let errors: Record<string, string> = {};
  let saving = false;
  const uploader = new ImageUploader({
    id: 'category-image',
    folder: 'celeste/categories',
    max: 1,
    initial: previous?.imageUrl ? [{ url: previous.imageUrl, width: 0, height: 0, alt: '' }] : [],
  });

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (uploader.busy) {
      errors = { image: "Patientez : l'image est en cours d'envoi." };
      return draw();
    }
    saving = true;
    draw();
    try {
      const result = await vm.save(
        { name: form.name, slug: form.slug, description: form.description, imageUrl: uploader.photos[0]?.url ?? '', color: form.color, isActive: form.isActive },
        previous,
      );
      if (result) {
        errors = result;
        saving = false;
        draw();
        dialog.update(content()); // affiche les erreurs
        document.querySelector<HTMLElement>(`.modal #${Object.keys(result)[0] === 'slug' ? 'category-slug' : 'category-name'}`)?.focus();
        return;
      }
      toast.success(previous ? `« ${form.name.trim()} » a été modifiée.` : `« ${form.name.trim()} » a été créée.`);
      dialog.close();
    } catch (err) {
      saving = false;
      draw();
      toast.error(errorMessage(err));
    }
  };

  const content = () => html`
    <form class="form-grid" novalidate @submit=${submit}>
      ${formField({
        id: 'category-name',
        label: 'Nom',
        value: form.name,
        placeholder: 'Toffi Bassin & Fesses',
        maxLength: 60,
        error: errors.name,
        required: true,
        onInput: (v) => {
          form.name = v;
          if (!slugEdited) form.slug = slugify(v);
          draw();
        },
      })}
      ${formField({
        id: 'category-slug',
        label: 'Adresse sur la boutique',
        value: form.slug,
        prefix: '/catalogue/',
        hint: "Générée à partir du nom. Évitez de la changer une fois la catégorie en ligne : les anciens liens partagés ne marcheraient plus.",
        error: errors.slug,
        onInput: (v) => {
          slugEdited = true;
          form.slug = slugify(v) || v.toLowerCase();
          draw();
        },
      })}
      ${formField({
        id: 'category-description',
        label: 'Description',
        value: form.description,
        multiline: true,
        rows: 3,
        maxLength: 300,
        optional: true,
        placeholder: 'Une phrase qui présente la catégorie sur la boutique.',
        error: errors.description,
        onInput: (v) => {
          form.description = v;
          draw();
        },
      })}
      <div class="field">
        <span class="field__label">Image de couverture <span class="field__optional">(facultatif)</span></span>
        ${uploader.template()}
        ${errors.image ? html`<p class="field__error">${errors.image}</p>` : nothing}
      </div>
      ${colorField({
        id: 'category-color',
        label: 'Couleur de la vitrine',
        value: form.color,
        presets: CATEGORY_PRESETS,
        error: errors.color,
        hint: "Teinte du fond de la vitrine de l'accueil quand cette catégorie est affichée. Elle est assombrie automatiquement si le texte manque de contraste.",
        onChange: (hex) => {
          form.color = hex;
          draw();
        },
        preview: (() => {
          const valid = /^#[0-9a-f]{6}$/i.test(form.color);
          const tint = valid ? darkenToContrast(form.color) : '#2a2015';
          const ratio = contrastRatio(tint, LIGHT_TEXT);
          return html`
            <div class="tint-preview" style="--tint: ${tint}; --tint-accent: ${valid ? form.color : 'var(--gold)'}" aria-hidden="true">
              <span class="tint-preview__kicker">Catégorie</span>
              <span class="tint-preview__title">${form.name.trim() || 'Nom de la catégorie'}</span>
              <span class="tint-preview__row">
                <span class="tint-preview__btn">Commander sur WhatsApp</span>
                <span class="tint-preview__ratio">
                  Contraste ${ratio.toFixed(1).replace('.', ',')}:1 ${ratio >= 4.5 ? '✓' : '⚠'}${valid && tint !== form.color.toLowerCase() ? ' · teinte assombrie pour le texte' : ''}
                </span>
              </span>
            </div>
          `;
        })(),
      })}
      ${switchField({
        id: 'category-active',
        label: 'Visible sur la boutique',
        description: 'Une catégorie masquée et ses produits restent dans l’admin.',
        checked: form.isActive,
        onChange: (v) => {
          form.isActive = v;
          draw();
        },
      })}
      <div class="modal__actions">
        <button class="btn btn--secondary" type="button" @click=${() => dialog.close()}>Annuler</button>
        <button class="btn btn--primary" type="submit" ?disabled=${saving}>
          ${saving ? 'Enregistrement…' : previous ? 'Enregistrer' : 'Créer la catégorie'}
        </button>
      </div>
    </form>
  `;

  const dialog = openDialog(previous ? `Modifier « ${previous.name} »` : 'Nouvelle catégorie', content(), {
    panel: true,
    onClose: () => {
      stopWatching();
      uploader.dispose();
    },
  });
  const draw = () => dialog.update(content());
  // l'envoi de l'image (progression, fin) redessine le formulaire
  const stopWatching = effect(() => {
    void uploader.items.value;
    draw();
  });
  document.querySelector<HTMLInputElement>('.modal #category-name')?.focus();
}
