// Formulaire produit dans un panneau latéral large : informations, photos, formats et prix,
// santé et usage, mise en avant, référencement. « Publier » reste grisé tant qu'il manque
// quelque chose, et la liste des manques est affichée. Fermer avec des modifications non
// enregistrées demande confirmation.
import { html, nothing } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, eye, eyeOff, plus, trash } from '@celeste/shared/icons';
import { MAX_IMAGES, MAX_VARIANTS, type Product, type ProductStatus, type Variant, type WithId } from '@celeste/shared/models';
import { buildSku, publicationIssues } from '@celeste/shared/domain/catalog';
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, type ProductInput } from '@celeste/shared/validation/product.validation';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { slugify } from '@celeste/shared/utils/slug';
import { cld } from '@celeste/shared/services/images';
import { formField, switchField } from '../../components/form-field/form-field';
import { ImageUploader } from '../../components/image-uploader/image-uploader';
import { confirmDialog, openDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import type { ProductsViewModel } from './products.viewmodel';

interface VariantRow {
  key: number;
  sku: string;
  /** SKU saisi à la main (ou format déjà enregistré) : on ne le recalcule plus. */
  skuLocked: boolean;
  label: string;
  quantity: string;
  price: string;
  stock: string;
  isActive: boolean;
  /** URL de la photo du format (une des photos du produit), null = photo principale. */
  image: string | null;
}

const SECTIONS = [
  ['infos', 'Informations'],
  ['photos', 'Photos'],
  ['formats', 'Formats et prix'],
  ['sante', 'Santé et usage'],
  ['avant', 'Mise en avant'],
  ['seo', 'Référencement'],
] as const;

let rowKey = 0;
const digits = (v: string) => v.replace(/[^\d]/g, '');

/** Fait défiler la seule zone de contenu du panneau (scrollIntoView ferait aussi glisser l'en-tête). */
function scrollPanelTo(el: HTMLElement, align: 'start' | 'center') {
  const body = el.closest<HTMLElement>('.modal__body');
  if (!body) return;
  const nav = body.querySelector<HTMLElement>('.pf-nav')?.offsetHeight ?? 0;
  const offset = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
  const top = align === 'start' ? offset - nav - 8 : offset - body.clientHeight / 2 + el.offsetHeight / 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
}

/**
 * Ouvre le formulaire : nouveau produit, modification (`previous`) ou copie d'un produit existant
 * (`copyOf` : nouveau brouillon prérempli, nom « (copie) », adresse et SKU régénérés).
 */
export function openProductForm(vm: ProductsViewModel, previous?: WithId<Product>, copyOf?: WithId<Product>) {
  const source = previous ?? copyOf;
  // copie : premier nom et première adresse libres (« (copie) », « (copie 2) »…)
  let copyName = '';
  if (copyOf) {
    const slugs = new Set(vm.list.value.map((p) => p.slug));
    for (let n = 1; ; n++) {
      const suffix = n === 1 ? 'copie' : `copie ${n}`;
      copyName = `${copyOf.name.slice(0, 80 - suffix.length - 3)} (${suffix})`;
      if (!slugs.has(slugify(copyName))) break;
    }
  }
  const form = {
    name: copyOf ? copyName : (previous?.name ?? ''),
    slug: copyOf ? slugify(copyName) : (previous?.slug ?? ''),
    categoryId: source?.categoryId ?? (vm.categoryId.value || vm.categories.value[0]?.id || ''),
    shortDescription: source?.shortDescription ?? '',
    description: source?.description ?? '',
    composition: source?.composition ?? '',
    usage: source?.usage ?? '',
    precautions: source?.precautions ?? '',
    isFeatured: copyOf ? false : (previous?.isFeatured ?? false),
    seoTitle: copyOf ? '' : (previous?.seo?.title ?? ''),
    seoDescription: copyOf ? '' : (previous?.seo?.description ?? ''),
  };
  let rows: VariantRow[] = (source?.variants ?? []).map((v) => ({
    key: ++rowKey,
    sku: copyOf ? '' : v.sku,
    skuLocked: !copyOf, // copie : SKU recalculés à partir du nouveau nom
    label: v.label,
    quantity: String(v.quantity),
    price: String(v.price),
    stock: v.stock === null ? '' : String(v.stock),
    isActive: v.isActive,
    image: v.image ?? null,
  }));
  if (!rows.length) rows = [newRow()];
  let slugEdited = !!previous;
  let errors: Record<string, string> = {};
  let saving: ProductStatus | null = null;
  /** Erreur technique à l'enregistrement (réseau, droits), affichée dans le panneau. */
  let saveError: string | null = null;
  /** Titre du récapitulatif : manques pour publier, ou erreurs à l'enregistrement. */
  let summaryFor: 'publish' | 'save' = 'save';

  const uploader = new ImageUploader({ id: 'product-photos', folder: 'celeste/produits', max: MAX_IMAGES, withAlt: true, initial: source?.images ?? [] });

  function newRow(): VariantRow {
    return { key: ++rowKey, sku: '', skuLocked: false, label: '', quantity: '', price: '', stock: '', isActive: true, image: null };
  }
  const refreshSkus = () =>
    rows.forEach((r) => {
      // quantité vide = 1 (« Pot », « Flacon ») : le SKU se génère quand même (…-001)
      if (!r.skuLocked) r.sku = form.name.trim() ? buildSku(form.name, r.quantity ? Number(r.quantity) : 1) : '';
    });

  if (copyOf) refreshSkus();

  const variants = (): Variant[] =>
    rows.map((r) => ({
      sku: r.sku.trim().toUpperCase(),
      label: r.label.trim(),
      quantity: r.quantity === '' ? 1 : Number(r.quantity), // vide = 1 unité
      price: r.price === '' ? 0 : Number(r.price),
      stock: r.stock.trim() === '' ? null : Number(r.stock),
      isActive: r.isActive,
      image: r.image && uploader.photos.some((p) => p.url === r.image) ? r.image : null,
    }));

  const input = (status: ProductStatus): ProductInput => ({
    name: form.name,
    slug: form.slug,
    categoryId: form.categoryId,
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    composition: form.composition.trim(),
    usage: form.usage.trim(),
    precautions: form.precautions.trim(),
    images: uploader.photos,
    variants: variants(),
    status,
    isFeatured: form.isFeatured,
    sortOrder: previous?.sortOrder ?? 0,
    seo: { title: form.seoTitle.trim(), description: form.seoDescription.trim() },
  });

  const snapshot = () =>
    JSON.stringify({
      form,
      rows: rows.map((r) => [r.sku, r.label, r.quantity, r.price, r.stock, r.isActive, r.image]),
      photos: uploader.photos,
    });
  const initial = copyOf ? '' : snapshot(); // une copie n'est pas encore enregistrée

  /**
   * Fiches créées avant le lien photo ↔ format : si les photos suivent les formats (une par format,
   * éventuellement précédées d'une photo d'ensemble), on propose ce rapprochement, à vérifier.
   */
  let suggested = false;
  if (rows.length > 1 && rows.every((r) => !r.image)) {
    const photos = uploader.photos;
    const offset = photos.length === rows.length + 1 ? 1 : photos.length === rows.length ? 0 : -1;
    if (offset >= 0) {
      rows.forEach((r, i) => (r.image = photos[i + offset]!.url));
      suggested = true;
    }
  }
  const dirty = () => snapshot() !== initial;

  const issues = () =>
    publicationIssues({
      name: form.name,
      categoryId: form.categoryId,
      images: uploader.photos,
      variants: variants().filter((v) => v.price > 0),
      composition: form.composition,
      precautions: form.precautions,
    });

  /** « Publier » alors qu'il manque quelque chose : on dit quoi, champ par champ, au lieu de ne rien faire. */
  const MISSING_FIELDS: Record<string, [string, string]> = {
    'un nom': ['name', 'Indiquez le nom du produit.'],
    'une catégorie': ['categoryId', 'Choisissez une catégorie.'],
    'au moins une photo': ['images', 'Ajoutez au moins une photo (envoi terminé).'],
    'au moins un format actif': ['variants', 'Ajoutez au moins un format actif avec un prix.'],
    'la composition': ['composition', 'Renseignez la composition.'],
    'les précautions': ['precautions', 'Renseignez les précautions et contre-indications.'],
  };
  function explainMissing() {
    saveError = null;
    summaryFor = 'publish';
    errors = Object.fromEntries(issues().map((m) => MISSING_FIELDS[m] ?? ['status', `Il manque : ${m}.`]));
    draw();
    const summary = document.querySelector<HTMLElement>('.modal .form-error');
    if (summary) {
      scrollPanelTo(summary, 'center');
      summary.focus({ preventScroll: true });
    }
    toast.error('Impossible de publier pour l’instant : voir ce qui manque au-dessus des boutons.');
  }

  async function submit(status: ProductStatus) {
    if (uploader.busy) {
      toast.info("Patientez : des photos sont encore en cours d'envoi.");
      return;
    }
    saving = status;
    summaryFor = 'save';
    errors = {};
    saveError = null;
    draw();
    // le récapitulatif des erreurs est juste au-dessus des boutons : on l'amène à l'écran
    const showSummary = () => {
      const summary = document.querySelector<HTMLElement>('.modal .form-error');
      if (!summary) return;
      scrollPanelTo(summary, 'center');
      summary.focus({ preventScroll: true });
    };
    try {
      const result = await vm.save(input(status), previous);
      saving = null;
      if (result) {
        errors = result;
        draw();
        showSummary();
        toast.error('Certains champs sont à corriger : voir le récapitulatif au-dessus des boutons.');
        return;
      }
      const name = form.name.trim();
      toast.success(
        status === 'published' && previous?.status !== 'published'
          ? `« ${name} » est publié sur la boutique.`
          : status === 'draft' && previous?.status === 'published'
            ? `« ${name} » est repassé en brouillon.`
            : previous
              ? `« ${name} » a été enregistré.`
              : `« ${name} » a été créé en brouillon.`,
      );
      dialog.close();
    } catch (e) {
      saving = null;
      saveError = errorMessage(e);
      draw();
      showSummary();
      toast.error(saveError);
    }
  }

  // --- Sections ------------------------------------------------------------------------
  const section = (id: string, title: string, body: unknown, intro?: string) => html`
    <section class="pf-section" id="pf-${id}" aria-labelledby="pf-${id}-title">
      <h3 class="pf-section__title" id="pf-${id}-title">${title}</h3>
      ${intro ? html`<p class="pf-section__intro">${intro}</p>` : nothing}
      ${body}
    </section>
  `;

  const infos = () => html`
    ${formField({
      id: 'product-name',
      label: 'Nom du produit',
      value: form.name,
      placeholder: 'Toffi Bassin & Fesses',
      maxLength: 80,
      required: true,
      error: errors.name,
      onInput: (v) => {
        form.name = v;
        if (!slugEdited) form.slug = slugify(v);
        refreshSkus();
        draw();
      },
    })}
    ${formField({
      id: 'product-slug',
      label: 'Adresse sur la boutique',
      value: form.slug,
      prefix: '/produit/',
      hint: 'Générée à partir du nom. Évitez de la changer une fois le produit en ligne : les liens partagés ne marcheraient plus.',
      error: errors.slug,
      onInput: (v) => {
        slugEdited = true;
        form.slug = slugify(v) || v.toLowerCase();
        draw();
      },
    })}
    <div class="field ${errors.categoryId ? 'field--error' : ''}">
      <label class="field__label" for="product-category">Catégorie</label>
      <div class="field__control">
        <select class="field__input field__select" id="product-category" .value=${live(form.categoryId)}
          aria-invalid=${errors.categoryId ? 'true' : 'false'}
          @change=${(e: Event) => {
            form.categoryId = (e.target as HTMLSelectElement).value;
            draw();
          }}>
          <option value="">Choisir une catégorie…</option>
          ${vm.categories.value.map(
            (c) => html`<option value=${c.id} ?selected=${form.categoryId === c.id}>${c.name}${c.isActive ? '' : ' (masquée)'}</option>`,
          )}
        </select>
      </div>
      ${errors.categoryId ? html`<p class="field__error">${errors.categoryId}</p>` : nothing}
    </div>
    ${formField({
      id: 'product-short',
      label: 'Description courte',
      value: form.shortDescription,
      multiline: true,
      rows: 2,
      maxLength: 160,
      optional: true,
      placeholder: 'Une phrase qui donne envie, affichée sur les cartes produit.',
      error: errors.shortDescription,
      onInput: (v) => {
        form.shortDescription = v;
        draw();
      },
    })}
    ${formField({
      id: 'product-description',
      label: 'Description détaillée',
      value: form.description,
      multiline: true,
      rows: 5,
      optional: true,
      placeholder: 'Bienfaits, goût, conseils… (sans promesse médicale)',
      onInput: (v) => {
        form.description = v;
        draw();
      },
    })}
  `;

  /** Photo montrée sur la boutique quand ce format est choisi : une des photos du produit. */
  const photoPicker = (r: VariantRow, i: number) => {
    const photos = uploader.photos;
    if (!photos.length) return nothing;
    const choose = (url: string | null) => {
      r.image = url;
      suggested = false;
      draw();
    };
    return html`
      <div class="vr__photos" role="group" aria-label="Photo du format ${i + 1}">
        <span class="vr__photos-label">Photo du format</span>
        <button class="vr__photo vr__photo--none ${r.image ? '' : 'is-selected'}" type="button" aria-pressed=${r.image ? 'false' : 'true'}
          title="Photo principale du produit" @click=${() => choose(null)}>Principale</button>
        ${photos.map(
          (p, n) => html`
            <button class="vr__photo ${r.image === p.url ? 'is-selected' : ''}" type="button" aria-pressed=${r.image === p.url ? 'true' : 'false'}
              title=${p.alt || `Photo ${n + 1}`} @click=${() => choose(p.url)}>
              <img src=${cld(p.url, 'c_fill,ar_1:1,w_96')} alt="Photo ${n + 1}${p.alt ? ` : ${p.alt}` : ''}" loading="lazy" />
            </button>
          `,
        )}
      </div>
    `;
  };

  const variantRow = (r: VariantRow, i: number) => {
    const err = (f: string) => errors[`variants.${i}.${f}`];
    const fieldErr = (f: string) => (err(f) ? html`<span class="vr__error">${err(f)}</span>` : nothing);
    return html`
      <li class="vr ${r.isActive ? '' : 'is-off'}">
        <div class="vr__cell vr__cell--label">
          <label for="v-${r.key}-label">Libellé</label>
          <input id="v-${r.key}-label" class="vr__input" type="text" placeholder="30 boules" .value=${live(r.label)}
            aria-invalid=${err('label') ? 'true' : 'false'}
            @input=${(e: InputEvent) => {
              r.label = (e.target as HTMLInputElement).value;
              // « 30 boules » → quantité 30 si elle est vide
              const n = r.label.match(/\d+/)?.[0];
              if (n && !r.quantity) {
                r.quantity = n;
                refreshSkus();
              }
              draw();
            }} />
          ${fieldErr('label')}
        </div>
        <div class="vr__cell">
          <label for="v-${r.key}-qty">Quantité</label>
          <input id="v-${r.key}-qty" class="vr__input" type="text" inputmode="numeric" placeholder="1" .value=${live(r.quantity)}
            aria-invalid=${err('quantity') ? 'true' : 'false'}
            @input=${(e: InputEvent) => {
              r.quantity = digits((e.target as HTMLInputElement).value);
              refreshSkus();
              draw();
            }} />
          ${fieldErr('quantity')}
        </div>
        <div class="vr__cell">
          <label for="v-${r.key}-price">Prix (F CFA)</label>
          <input id="v-${r.key}-price" class="vr__input vr__input--price" type="text" inputmode="numeric" placeholder="2500" .value=${live(r.price)}
            aria-invalid=${err('price') ? 'true' : 'false'}
            @input=${(e: InputEvent) => {
              r.price = digits((e.target as HTMLInputElement).value);
              draw();
            }} />
          ${err('price') ? fieldErr('price') : r.price ? html`<span class="vr__hint">${formatFcfa(Number(r.price))}</span>` : nothing}
        </div>
        <div class="vr__cell">
          <label for="v-${r.key}-stock">Stock</label>
          <input id="v-${r.key}-stock" class="vr__input" type="text" inputmode="numeric" placeholder="Non suivi" .value=${live(r.stock)}
            aria-invalid=${err('stock') ? 'true' : 'false'}
            @input=${(e: InputEvent) => {
              r.stock = digits((e.target as HTMLInputElement).value);
              draw();
            }} />
          ${err('stock') ? fieldErr('stock') : r.stock === '0' ? html`<span class="vr__hint vr__hint--warn">Rupture</span>` : nothing}
        </div>
        <div class="vr__cell vr__cell--sku">
          <label for="v-${r.key}-sku">SKU</label>
          <input id="v-${r.key}-sku" class="vr__input vr__input--sku" type="text" placeholder="Auto" .value=${live(r.sku)}
            aria-invalid=${err('sku') ? 'true' : 'false'}
            @input=${(e: InputEvent) => {
              r.sku = (e.target as HTMLInputElement).value.toUpperCase();
              r.skuLocked = r.sku.trim() !== ''; // SKU effacé : il se régénère automatiquement
              if (!r.skuLocked) refreshSkus();
              draw();
            }} />
          ${fieldErr('sku')}
        </div>
        <div class="vr__tools">
          <button class="icon-btn" type="button" aria-pressed=${r.isActive ? 'true' : 'false'} @click=${() => {
            r.isActive = !r.isActive;
            draw();
          }}>
            ${icon(r.isActive ? eye : eyeOff, { label: r.isActive ? `Masquer le format ${i + 1}` : `Réactiver le format ${i + 1}` })}
          </button>
          <button class="icon-btn icon-btn--danger" type="button" ?disabled=${rows.length === 1} @click=${() => {
            rows = rows.filter((x) => x !== r);
            draw();
          }}>
            ${icon(trash, { label: `Supprimer le format ${i + 1}` })}
          </button>
        </div>
        ${photoPicker(r, i)}
      </li>
    `;
  };

  const formats = () => html`
    ${suggested
      ? html`<p class="pf-suggest">${icon(alertCircle)}<span>Chaque format a reçu la photo qui lui correspond dans l’ordre de vos photos. Vérifiez sous chaque format, puis enregistrez.</span></p>`
      : nothing}
    <ol class="vr-list">${rows.map(variantRow)}</ol>
    ${errors.variants ? html`<p class="field__error">${errors.variants}</p>` : nothing}
    ${rows.length < MAX_VARIANTS
      ? html`<button class="btn btn--secondary btn--sm pf-add" type="button" @click=${() => {
          rows = [...rows, newRow()];
          draw();
          queueMicrotask(() => document.querySelector<HTMLInputElement>(`#v-${rows.at(-1)!.key}-label`)?.focus());
        }}>${icon(plus)} Ajouter un format</button>`
      : html`<p class="pf-section__intro">${MAX_VARIANTS} formats maximum.</p>`}
  `;

  const sante = () => html`
    ${formField({
      id: 'product-composition',
      error: errors.composition,
      label: 'Composition',
      value: form.composition,
      multiline: true,
      rows: 3,
      placeholder: 'Ingrédients, dans l’ordre de l’étiquette.',
      hint: 'Obligatoire pour publier.',
      onInput: (v) => {
        form.composition = v;
        draw();
      },
    })}
    ${formField({
      id: 'product-usage',
      label: "Mode d'emploi",
      value: form.usage,
      multiline: true,
      rows: 3,
      optional: true,
      placeholder: 'Quantité, moment de la journée, durée conseillée…',
      onInput: (v) => {
        form.usage = v;
        draw();
      },
    })}
    ${formField({
      id: 'product-precautions',
      error: errors.precautions,
      label: 'Précautions et contre-indications',
      value: form.precautions,
      multiline: true,
      rows: 3,
      placeholder: 'Déconseillé aux femmes enceintes ou allaitantes, aux mineures…',
      hint: 'Obligatoire pour publier.',
      onInput: (v) => {
        form.precautions = v;
        draw();
      },
    })}
  `;

  const seoPreview = () => {
    const title = (form.seoTitle || form.name || 'Nom du produit').trim();
    const desc = (form.seoDescription || form.shortDescription || 'La description apparaîtra ici.').trim();
    return html`
      <div class="serp" aria-label="Aperçu dans Google">
        <p class="serp__url">celestebotcho.com › produit › ${form.slug || '…'}</p>
        <p class="serp__title">${title} — Céleste Bôtchô</p>
        <p class="serp__desc">${desc.length > SEO_DESCRIPTION_MAX ? `${desc.slice(0, SEO_DESCRIPTION_MAX)}…` : desc}</p>
      </div>
    `;
  };

  const seo = () => html`
    ${formField({
      id: 'seo-title',
      label: 'Titre pour Google',
      value: form.seoTitle,
      placeholder: form.name || 'Par défaut : le nom du produit',
      maxLength: SEO_TITLE_MAX,
      optional: true,
      error: errors['seo.title'],
      onInput: (v) => {
        form.seoTitle = v;
        draw();
      },
    })}
    ${formField({
      id: 'seo-description',
      label: 'Description pour Google et WhatsApp',
      value: form.seoDescription,
      multiline: true,
      rows: 2,
      maxLength: SEO_DESCRIPTION_MAX,
      optional: true,
      placeholder: 'Par défaut : la description courte',
      error: errors['seo.description'],
      onInput: (v) => {
        form.seoDescription = v;
        draw();
      },
    })}
    ${seoPreview()}
  `;

  // --- Récapitulatif des erreurs, juste au-dessus des boutons ------------------------------
  const FIELD_LABELS: Record<string, [string, string]> = {
    name: ['Nom du produit', 'product-name'],
    slug: ['Adresse sur la boutique', 'product-slug'],
    categoryId: ['Catégorie', 'product-category'],
    shortDescription: ['Description courte', 'product-short'],
    images: ['Photos', 'pf-photos'],
    variants: ['Formats', 'pf-formats'],
    'seo.title': ['Titre pour Google', 'seo-title'],
    'seo.description': ['Description pour Google', 'seo-description'],
    status: ['Publication', 'pf-sante'],
    composition: ['Composition', 'product-composition'],
    precautions: ['Précautions', 'product-precautions'],
  };
  const VARIANT_FIELDS: Record<string, [string, string]> = {
    label: ['Libellé', 'label'],
    quantity: ['Quantité', 'qty'],
    price: ['Prix', 'price'],
    stock: ['Stock', 'stock'],
    sku: ['SKU', 'sku'],
  };
  /** [libellé lisible, id de l'élément à atteindre, message] pour chaque erreur. */
  const errorList = (): [string, string, string][] =>
    Object.entries(errors).map(([key, message]) => {
      const v = key.match(/^variants\.(\d+)\.(\w+)$/);
      if (v) {
        const [label, suffix] = VARIANT_FIELDS[v[2]!] ?? [v[2]!, 'label'];
        return [`Format ${Number(v[1]) + 1} · ${label}`, `v-${rows[Number(v[1])]?.key}-${suffix}`, message];
      }
      const [label, id] = FIELD_LABELS[key] ?? [key, 'pf-infos'];
      return [label, id, message];
    });

  const errorSummary = () => {
    const list = errorList();
    if (!list.length && !saveError) return nothing;
    return html`
      <div class="form-error" role="alert" tabindex="-1">
        ${icon(alertCircle)}
        <div>
          <strong>${saveError
            ? "L'enregistrement a échoué"
            : summaryFor === 'publish'
              ? `${list.length > 1 ? `${list.length} éléments manquent` : 'Il manque un élément'} pour publier`
              : `${list.length > 1 ? `${list.length} points à corriger` : 'Un point à corriger'} avant d'enregistrer`}</strong>
          ${saveError ? html`<p>${saveError}</p>` : nothing}
          <ul>
            ${list.map(
              ([label, id, message]) => html`<li>
                <a href="#${id}" @click=${(e: MouseEvent) => {
                  e.preventDefault();
                  const target = document.getElementById(id);
                  if (!target) return;
                  scrollPanelTo(target, 'center');
                  target.focus?.({ preventScroll: true });
                }}>${label}</a> : ${message}
              </li>`,
            )}
          </ul>
        </div>
      </div>
    `;
  };

  // --- Ensemble ------------------------------------------------------------------------
  const content = () => {
    const missing = issues();
    const status = previous?.status ?? 'draft';
    return html`
      <form class="pf" novalidate @submit=${(e: SubmitEvent) => e.preventDefault()}>
        <nav class="pf-nav" aria-label="Sections du formulaire">
          ${SECTIONS.map(
            ([id, label]) => html`<a href="#pf-${id}" @click=${(e: MouseEvent) => {
              e.preventDefault();
              const target = document.getElementById(`pf-${id}`);
              if (target) scrollPanelTo(target, 'start');
            }}>${label}</a>`,
          )}
        </nav>

        ${section('infos', 'Informations', infos())}
        ${section(
          'photos',
          'Photos',
          html`${uploader.template()}${errors.images ? html`<p class="field__error">${errors.images}</p>` : nothing}`,
          `De 1 à ${MAX_IMAGES} photos. La première est la photo principale. Décrivez chaque photo en quelques mots (pour les personnes malvoyantes et pour Google).`,
        )}
        ${section('formats', 'Formats et prix', formats(), 'Un format par contenance (ex. 30, 55, 115 boules). Choisissez la photo de chaque format : elle s’affiche quand la cliente clique dessus. Laissez le stock vide si vous ne le suivez pas ; « 0 » = rupture.')}
        ${section('sante', 'Santé et usage', sante(), 'Ces informations protègent vos clientes et sont exigées avant publication. Aucune promesse médicale.')}
        ${section(
          'avant',
          'Mise en avant',
          switchField({
            id: 'product-featured',
            label: 'Produit vedette',
            description: "Mis en avant sur la page d'accueil.",
            checked: form.isFeatured,
            onChange: (v) => {
              form.isFeatured = v;
              draw();
            },
          }),
        )}
        ${section('seo', 'Référencement', seo(), 'Comment le produit apparaît dans Google et dans les aperçus de liens WhatsApp.')}

        ${errorSummary()}
        ${missing.length && status !== 'published' && !Object.keys(errors).length && !saveError
          ? html`<p class="pf-missing">${icon(alertCircle)}<span>Pour publier, il manque : <strong>${missing.join(', ')}</strong>.</span></p>`
          : nothing}

        <div class="modal__actions">
          <button class="btn btn--secondary" type="button" @click=${() => dialog.dismiss()}>Annuler</button>
          ${status === 'published'
            ? html`
                <button class="btn btn--secondary" type="button" ?disabled=${!!saving} @click=${() => submit('draft')}>
                  ${saving === 'draft' ? 'Enregistrement…' : 'Repasser en brouillon'}
                </button>
                <button class="btn btn--primary" type="button" ?disabled=${!!saving} @click=${() => submit('published')}>
                  ${saving === 'published' ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              `
            : html`
                <button class="btn btn--secondary" type="button" ?disabled=${!!saving} @click=${() => submit(status)}>
                  ${saving === status ? 'Enregistrement…' : status === 'archived' ? 'Enregistrer' : 'Enregistrer le brouillon'}
                </button>
                <button class="btn btn--primary ${missing.length ? 'is-incomplete' : ''}" type="button" ?disabled=${!!saving}
                  @click=${() => (missing.length ? explainMissing() : submit('published'))}
                  title=${missing.length ? `Il manque : ${missing.join(', ')}` : ''}>
                  ${saving === 'published' ? 'Publication…' : 'Publier'}
                </button>
              `}
        </div>
      </form>
    `;
  };

  const title = previous ? `Modifier « ${previous.name} »` : copyOf ? `Copie de « ${copyOf.name} »` : 'Nouveau produit';
  const dialog = openDialog(title, content(), {
    panel: true,
    wide: true,
    beforeClose: () =>
      !dirty() ||
      confirmDialog({
        title: 'Abandonner les modifications ?',
        message: 'Les changements non enregistrés seront perdus.',
        confirmLabel: 'Abandonner',
        danger: true,
      }),
    onClose: () => {
      stopWatching();
      uploader.dispose();
    },
  });
  const draw = () => dialog.update(content());
  const stopWatching = effect(() => {
    void uploader.items.value; // progression et fin des envois de photos
    draw();
  });
  if (!previous) {
    const name = document.querySelector<HTMLInputElement>('.modal #product-name');
    name?.focus();
    if (copyOf) name?.select(); // on renomme la copie tout de suite
  }
}
