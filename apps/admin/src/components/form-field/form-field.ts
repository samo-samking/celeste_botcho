// Champs de formulaire : libellé, icône ou préfixe, saisie (ligne ou zone de texte), compteur,
// élément à droite (ex. afficher le mot de passe), aide et erreur liées par aria-describedby.
import { html, nothing, type TemplateResult } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { live } from 'lit-html/directives/live.js';
import { icon } from '@celeste/shared/icons/icon';

export interface FormFieldOptions {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  /** Zone de texte sur plusieurs lignes. */
  multiline?: boolean;
  rows?: number;
  name?: string;
  autocomplete?: string;
  inputmode?: 'email' | 'text' | 'numeric';
  placeholder?: string;
  /** Icône de la bibliothèque (@celeste/shared/icons). */
  leadingIcon?: string;
  /** Texte fixe avant la saisie (ex. « /catalogue/ »). */
  prefix?: string;
  trailing?: TemplateResult;
  /** Affiche un compteur « 12 / 300 ». */
  maxLength?: number;
  error?: string | null;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
}

export function formField(o: FormFieldOptions) {
  const describedBy = [o.error ? `${o.id}-error` : '', o.hint ? `${o.id}-hint` : '', o.maxLength ? `${o.id}-count` : '']
    .filter(Boolean)
    .join(' ');
  const onInput = (e: InputEvent) => o.onInput((e.target as HTMLInputElement | HTMLTextAreaElement).value);
  const common = {
    describedBy: describedBy || undefined,
    invalid: o.error ? 'true' : 'false',
  };
  const over = o.maxLength !== undefined && o.value.length > o.maxLength;

  return html`
    <div class="field ${o.error ? 'field--error' : ''}">
      <div class="field__top">
        <label class="field__label" for=${o.id}>
          ${o.label}${o.optional ? html` <span class="field__optional">(facultatif)</span>` : nothing}
        </label>
        ${o.maxLength !== undefined
          ? html`<span class="field__count ${over ? 'is-over' : ''}" id="${o.id}-count" aria-live="polite">${o.value.length} / ${o.maxLength}</span>`
          : nothing}
      </div>
      <div class="field__control ${o.multiline ? 'field__control--multiline' : ''}">
        ${o.leadingIcon ? html`<span class="field__icon">${icon(o.leadingIcon)}</span>` : nothing}
        ${o.prefix ? html`<span class="field__prefix">${o.prefix}</span>` : nothing}
        ${o.multiline
          ? html`<textarea
              class="field__input field__input--multiline"
              id=${o.id}
              name=${o.name ?? o.id}
              rows=${o.rows ?? 3}
              placeholder=${ifDefined(o.placeholder)}
              .value=${live(o.value)}
              ?required=${o.required}
              ?disabled=${o.disabled}
              aria-invalid=${common.invalid}
              aria-describedby=${ifDefined(common.describedBy)}
              @input=${onInput}
            ></textarea>`
          : html`<input
              class="field__input"
              id=${o.id}
              name=${o.name ?? o.id}
              type=${o.type ?? 'text'}
              autocomplete=${ifDefined(o.autocomplete)}
              inputmode=${ifDefined(o.inputmode)}
              placeholder=${ifDefined(o.placeholder)}
              .value=${live(o.value)}
              ?required=${o.required}
              ?disabled=${o.disabled}
              aria-invalid=${common.invalid}
              aria-describedby=${ifDefined(common.describedBy)}
              @input=${onInput}
            />`}
        ${o.trailing ?? nothing}
      </div>
      ${o.hint ? html`<p class="field__hint" id="${o.id}-hint">${o.hint}</p>` : nothing}
      ${o.error ? html`<p class="field__error" id="${o.id}-error">${o.error}</p>` : nothing}
    </div>
  `;
}

/** Interrupteur (case à cocher stylée) avec libellé et description. */
export function switchField(o: { id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return html`
    <label class="switch-field" for=${o.id}>
      <span class="switch-field__text">
        <span class="switch-field__label">${o.label}</span>
        ${o.description ? html`<span class="switch-field__desc">${o.description}</span>` : nothing}
      </span>
      <input class="switch" id=${o.id} type="checkbox" role="switch" .checked=${live(o.checked)} ?disabled=${o.disabled}
        @change=${(e: Event) => o.onChange((e.target as HTMLInputElement).checked)} />
    </label>
  `;
}

/** Choix de couleur : teintes proposées, sélecteur libre, code hexadécimal, aperçu sur fond sombre. */
export function colorField(o: {
  id: string;
  label: string;
  value: string;
  presets: readonly { hex: string; name: string }[];
  onChange: (hex: string) => void;
  hint?: string;
  error?: string | null;
  preview?: TemplateResult;
}) {
  const current = o.value.toLowerCase();
  const isPreset = o.presets.some((p) => p.hex === current);
  return html`
    <fieldset class="field color-field ${o.error ? 'field--error' : ''}">
      <legend class="field__label">${o.label}</legend>
      <div class="color-field__swatches" role="group" aria-label="Teintes proposées">
        ${o.presets.map(
          (p) => html`
            <button class="swatch ${p.hex === current ? 'is-selected' : ''}" type="button" style="--swatch: ${p.hex}"
              aria-pressed=${p.hex === current ? 'true' : 'false'} title=${p.name} @click=${() => o.onChange(p.hex)}>
              <span class="visually-hidden">${p.name}</span>
            </button>
          `,
        )}
        <label class="swatch swatch--custom ${!isPreset && current ? 'is-selected' : ''}" title="Couleur personnalisée" style="--swatch: ${current || '#000000'}">
          <span class="visually-hidden">Couleur personnalisée</span>
          <input type="color" .value=${live(current || '#000000')} @input=${(e: InputEvent) => o.onChange((e.target as HTMLInputElement).value)} />
        </label>
        <input class="color-field__hex" id=${o.id} type="text" maxlength="7" spellcheck="false" aria-label="Code de la couleur"
          .value=${live(current)} @change=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value.trim();
            o.onChange(v.startsWith('#') ? v : `#${v}`);
          }} />
      </div>
      ${o.preview ?? nothing}
      ${o.hint ? html`<p class="field__hint">${o.hint}</p>` : nothing}
      ${o.error ? html`<p class="field__error">${o.error}</p>` : nothing}
    </fieldset>
  `;
}
