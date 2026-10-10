// Formulaire de promotion (panneau latéral) : titre, type et valeur, portée et cibles, code facultatif,
// dates, activation ; aperçu des prix avant / après et avertissement en cas de chevauchement.
import { html, nothing } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, search } from '@celeste/shared/icons';
import { PROMO_SCOPE_LABELS, PROMO_TYPE_LABELS, type Promotion, type PromoScope, type PromoType, type WithId } from '@celeste/shared/models';
import type { PromotionInput } from '@celeste/shared/validation/promotion.validation';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { fromDateInput, toDateInput } from '../../app/format';
import { formField, switchField } from '../../components/form-field/form-field';
import { confirmDialog, openDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import type { PromotionsViewModel } from './promotions.viewmodel';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

export function openPromotionForm(vm: PromotionsViewModel, previous?: WithId<Promotion>) {
  const today = new Date();
  const form = {
    title: previous?.title ?? '',
    type: (previous?.type ?? 'percent') as PromoType,
    value: previous ? String(previous.value) : '',
    scope: (previous?.scope ?? 'category') as PromoScope,
    targetIds: new Set(previous?.targetIds ?? []),
    code: previous?.code ?? '',
    start: toDateInput(previous?.startsAt ?? today),
    end: toDateInput(previous?.endsAt ?? new Date(today.getTime() + 7 * 86_400_000)),
    isActive: previous?.isActive ?? true,
  };
  let filter = '';
  let errors: Record<string, string> = {};
  let saving = false;
  const initial = JSON.stringify({ ...form, targetIds: [...form.targetIds] });
  const dirty = () => JSON.stringify({ ...form, targetIds: [...form.targetIds] }) !== initial;

  const input = (): PromotionInput => ({
    title: form.title,
    type: form.type,
    value: form.value === '' ? 0 : Number(form.value),
    scope: form.scope,
    targetIds: [...form.targetIds],
    code: form.code.trim() || null,
    bannerImageUrl: previous?.bannerImageUrl ?? null,
    startsAt: fromDateInput(form.start) ?? new Date(NaN),
    endsAt: (() => {
      const d = fromDateInput(form.end);
      return d ? endOfDay(d) : new Date(NaN);
    })(),
    isActive: form.isActive,
  });

  const submit = async () => {
    saving = true;
    draw();
    try {
      const result = await vm.save(input(), previous);
      saving = false;
      if (result) {
        errors = result;
        draw();
        toast.error('Certains champs sont à corriger.');
        return;
      }
      toast.success(previous ? `« ${form.title.trim()} » a été enregistrée.` : `« ${form.title.trim()} » a été créée.`);
      dialog.close();
    } catch (e) {
      saving = false;
      draw();
      toast.error(errorMessage(e));
    }
  };

  /** Liste des cibles possibles selon la portée. */
  const targets = (): { id: string; label: string; hint?: string }[] => {
    switch (form.scope) {
      case 'all':
        return [];
      case 'category':
        return vm.categories.value.map((c) => ({ id: c.id, label: c.name, hint: c.isActive ? undefined : 'masquée' }));
      case 'product':
        return vm.products.value.map((p) => ({ id: p.id, label: p.name, hint: p.categoryName }));
      case 'variant':
        return vm.products.value.flatMap((p) => p.variants.map((v) => ({ id: v.sku, label: `${p.name} — ${v.label}`, hint: `${v.sku} · ${formatFcfa(v.price, { short: true })}` })));
    }
  };

  const content = () => {
    const list = targets().filter((t) => !filter || normalize(`${t.label} ${t.hint ?? ''}`).includes(normalize(filter)));
    const current = input();
    const valid = Number(form.value) > 0 && (form.scope === 'all' || form.targetIds.size > 0);
    const preview = valid ? vm.preview(current) : [];
    const overlaps = valid && !Number.isNaN(current.startsAt.getTime()) && !Number.isNaN(current.endsAt.getTime()) ? vm.overlaps(current, previous?.id) : [];

    return html`
      <form class="pf promo-form" novalidate @submit=${(e: SubmitEvent) => { e.preventDefault(); void submit(); }}>
        ${formField({ id: 'promo-title', label: 'Titre', value: form.title, maxLength: 60, required: true, placeholder: 'Promo de la rentrée', error: errors.title, onInput: (v) => { form.title = v; draw(); } })}

        <fieldset class="promo-type">
          <legend class="field__label">Type de remise</legend>
          <div class="promo-seg">
            ${(Object.keys(PROMO_TYPE_LABELS) as PromoType[]).map(
              (t) => html`<label class="promo-seg__opt ${form.type === t ? 'is-active' : ''}">
                <input type="radio" name="promo-type" .checked=${form.type === t} @change=${() => { form.type = t; draw(); }} />${PROMO_TYPE_LABELS[t]}</label>`,
            )}
          </div>
        </fieldset>
        ${formField({
          id: 'promo-value',
          label: form.type === 'percent' ? 'Pourcentage de remise' : form.type === 'amount' ? 'Montant déduit (F CFA)' : 'Prix fixe (F CFA)',
          value: form.value,
          inputmode: 'numeric',
          placeholder: form.type === 'percent' ? '15' : '2000',
          required: true,
          error: errors.value,
          hint: form.type === 'percent' ? 'Entre 1 et 90 %.' : form.type === 'fixed_price' ? 'Un prix fixe plus élevé que le prix normal est ignoré.' : undefined,
          onInput: (v) => { form.value = v.replace(/[^\d]/g, ''); draw(); },
        })}

        <div class="field">
          <label class="field__label" for="promo-scope">Produits concernés</label>
          <div class="field__control">
            <select class="field__input field__select" id="promo-scope" .value=${live(form.scope)}
              @change=${(e: Event) => { form.scope = (e.target as HTMLSelectElement).value as PromoScope; form.targetIds = new Set(); filter = ''; draw(); }}>
              ${(Object.keys(PROMO_SCOPE_LABELS) as PromoScope[]).map((s) => html`<option value=${s} ?selected=${form.scope === s}>${PROMO_SCOPE_LABELS[s]}</option>`)}
            </select>
          </div>
        </div>
        ${form.scope !== 'all'
          ? html`<div class="promo-targets">
              <label class="toolbar__search promo-targets__search">${icon(search)}<span class="visually-hidden">Filtrer</span>
                <input type="search" placeholder="Filtrer…" .value=${live(filter)} @input=${(e: InputEvent) => { filter = (e.target as HTMLInputElement).value; draw(); }} /></label>
              <ul class="promo-targets__list" role="group" aria-label="Éléments concernés">
                ${list.map(
                  (t) => html`<li><label class="promo-target">
                    <input type="checkbox" .checked=${form.targetIds.has(t.id)}
                      @change=${(e: Event) => { if ((e.target as HTMLInputElement).checked) form.targetIds.add(t.id); else form.targetIds.delete(t.id); draw(); }} />
                    <span>${t.label}${t.hint ? html` <small>${t.hint}</small>` : nothing}</span></label></li>`,
                )}
                ${list.length ? nothing : html`<li class="set-preview__empty">Aucun élément.</li>`}
              </ul>
              <p class="promo-targets__count">${form.targetIds.size} sélectionné${form.targetIds.size > 1 ? 's' : ''}</p>
              ${errors.targetIds ? html`<p class="field__error">${errors.targetIds}</p>` : nothing}
            </div>`
          : nothing}

        <div class="promo-dates">
          <div class="field">
            <label class="field__label" for="promo-start">Début</label>
            <input class="field__input promo-date" id="promo-start" type="date" .value=${live(form.start)} @change=${(e: Event) => { form.start = (e.target as HTMLInputElement).value; draw(); }} />
            ${errors.startsAt ? html`<p class="field__error">${errors.startsAt}</p>` : nothing}
          </div>
          <div class="field">
            <label class="field__label" for="promo-end">Fin (incluse)</label>
            <input class="field__input promo-date" id="promo-end" type="date" .value=${live(form.end)} @change=${(e: Event) => { form.end = (e.target as HTMLInputElement).value; draw(); }} />
            ${errors.endsAt ? html`<p class="field__error">${errors.endsAt}</p>` : nothing}
          </div>
        </div>

        ${formField({
          id: 'promo-code',
          label: 'Code promo',
          value: form.code,
          optional: true,
          placeholder: 'BIENVENUE',
          hint: 'Vide : la remise s’applique automatiquement. Avec un code : seulement si la cliente le saisit.',
          error: errors.code,
          onInput: (v) => { form.code = v.toUpperCase().replace(/\s+/g, ''); draw(); },
        })}
        ${switchField({ id: 'promo-active', label: 'Promotion active', description: 'Désactivée, elle ne s’applique pas, même pendant ses dates.', checked: form.isActive, onChange: (v) => { form.isActive = v; draw(); } })}

        ${overlaps.length
          ? html`<p class="od-alert">${icon(alertTriangle)}<span><strong>Chevauchement :</strong> ${overlaps.map((o) => `« ${o.title} »`).join(', ')} concerne aussi certains de ces produits sur la même période. La remise la plus avantageuse pour la cliente sera appliquée.</span></p>`
          : nothing}

        <section class="od-card promo-preview">
          <h3 class="od-card__title">Aperçu des prix</h3>
          ${preview.length
            ? html`<table class="od-items">
                <thead><tr><th scope="col">Produit</th><th scope="col">Avant</th><th scope="col">Après</th></tr></thead>
                <tbody>${preview.slice(0, 40).map(
                  (p) => html`<tr><td><strong>${p.product}</strong><small>${p.variant}</small></td><td><s>${formatFcfa(p.before, { short: true })}</s></td>
                    <td class=${p.after < p.before ? 'promo-preview__new' : ''}>${formatFcfa(p.after, { short: true })}</td></tr>`,
                )}</tbody>
              </table>
              ${preview.length > 40 ? html`<p class="od-card__hint">… et ${preview.length - 40} autres formats.</p>` : nothing}`
            : html`<p class="set-preview__empty">${valid ? 'Aucun produit publié concerné.' : 'Indiquez la valeur et les produits concernés pour voir les nouveaux prix.'}</p>`}
        </section>

        <div class="modal__actions">
          <button class="btn btn--secondary" type="button" @click=${() => dialog.dismiss()}>Annuler</button>
          <button class="btn btn--primary" type="submit" ?disabled=${saving}>${saving ? 'Enregistrement…' : previous ? 'Enregistrer' : 'Créer la promotion'}</button>
        </div>
      </form>
    `;
  };

  const dialog = openDialog(previous ? `Modifier « ${previous.title} »` : 'Nouvelle promotion', content(), {
    panel: true,
    beforeClose: () =>
      !dirty() || confirmDialog({ title: 'Abandonner les modifications ?', message: 'Les changements non enregistrés seront perdus.', confirmLabel: 'Abandonner', danger: true }),
  });
  const draw = () => dialog.update(content());
  if (!previous) document.querySelector<HTMLInputElement>('.modal #promo-title')?.focus();
}
