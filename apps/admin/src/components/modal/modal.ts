// Boîtes de dialogue sur l'élément <dialog> natif (focus piégé, Échap, retour du focus gérés par le navigateur).
import { html, nothing, render, type TemplateResult } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, close } from '@celeste/shared/icons';

export interface DialogHandle {
  /** Redessine le contenu (après un changement d'état). */
  update(content: TemplateResult): void;
  /** Ferme sans condition (après un enregistrement réussi). */
  close(): void;
  /** Fermeture « Annuler » : passe par beforeClose. */
  dismiss(): void;
}

/** Ouvre une boîte de dialogue ; `onClose` est appelé quelle que soit la façon de la fermer.
 *  `panel` : panneau latéral pleine hauteur qui glisse depuis la droite (formulaires). */
export function openDialog(
  title: string,
  content: TemplateResult,
  {
    wide = false,
    panel = false,
    onClose,
    beforeClose,
  }: {
    wide?: boolean;
    panel?: boolean;
    onClose?: () => void;
    /** Appelé avant une fermeture demandée par la personne (croix, Échap, fond) ; false = rester ouvert. */
    beforeClose?: () => boolean | Promise<boolean>;
  } = {},
): DialogHandle {
  const dialog = document.createElement('dialog');
  dialog.className = `modal${wide ? ' modal--wide' : ''}${panel ? ' modal--panel' : ''}`;
  dialog.setAttribute('aria-labelledby', 'modal-title');
  document.body.append(dialog);

  // Fermeture animée : la classe is-closing lance l'animation de sortie (modal.css),
  // la vraie fermeture a lieu à la fin de celle-ci. Instantanée si les animations sont réduites.
  let closing = false;
  let asking = false;
  /** Fermeture demandée par la personne : passe d'abord par beforeClose (ex. « abandonner les modifications ? »). */
  const userClose = async () => {
    if (closing || asking) return;
    if (beforeClose) {
      asking = true;
      const ok = await beforeClose();
      asking = false;
      if (!ok) return;
    }
    requestClose();
  };
  const requestClose = () => {
    if (closing || !dialog.open) return;
    closing = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return dialog.close();
    dialog.classList.add('is-closing');
    const finish = () => dialog.open && dialog.close();
    dialog.addEventListener('animationend', (e) => e.target === dialog && finish());
    window.setTimeout(finish, 450); // filet de sécurité si l'animation ne se déclenche pas
  };

  const draw = (body: TemplateResult) =>
    render(
      html`
        <div class="modal__head">
          <h2 class="modal__title" id="modal-title">${title}</h2>
          <button class="modal__close" type="button" @click=${userClose}>${icon(close, { label: 'Fermer' })}</button>
        </div>
        <div class="modal__body">${body}</div>
      `,
      dialog,
    );

  draw(content);
  dialog.addEventListener('close', () => {
    onClose?.();
    // les notifications placées dans ce panneau reviennent dans la page avant sa suppression
    const toasts = dialog.querySelector('.toasts');
    if (toasts) document.body.append(toasts);
    dialog.remove();
  });
  // Échap : on remplace la fermeture immédiate du navigateur par la fermeture animée
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    void userClose();
  });
  // clic sur le fond = fermer
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) void userClose();
  });
  // panneau : seul son contenu défile ; si le navigateur le fait défiler (focus sur un élément
  // hors de la zone visible), on le remet en place
  if (panel) {
    dialog.addEventListener('scroll', () => {
      if (dialog.scrollTop || dialog.scrollLeft) dialog.scrollTo(0, 0);
    });
  }
  dialog.showModal();

  return { update: draw, close: requestClose, dismiss: () => void userClose() };
}

/** Confirmation : résout true si la personne confirme. */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = false,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    let confirmed = false;
    const handle = openDialog(
      title,
      html`
        <div class="confirm">
          ${danger ? html`<span class="confirm__icon">${icon(alertTriangle)}</span>` : nothing}
          <p>${message}</p>
        </div>
        <div class="modal__actions">
          <button class="btn btn--secondary" type="button" @click=${() => handle.close()}>Annuler</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" @click=${() => {
            confirmed = true;
            handle.close();
          }}>${confirmLabel}</button>
        </div>
      `,
      { onClose: () => resolve(confirmed) },
    );
  });
}

/** Saisie d'un texte (ex. motif d'annulation) : résout le texte, ou null si la personne annule. */
export function promptDialog({
  title,
  message,
  label,
  placeholder = '',
  confirmLabel = 'Valider',
  danger = false,
  required = true,
  suggestions = [],
}: {
  title: string;
  message: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  danger?: boolean;
  required?: boolean;
  /** Réponses courantes proposées en un clic. */
  suggestions?: string[];
}): Promise<string | null> {
  return new Promise((resolve) => {
    let value = '';
    let result: string | null = null;
    let showError = false;
    const submit = () => {
      if (required && !value.trim()) {
        showError = true;
        draw();
        document.getElementById('prompt-input')?.focus();
        return;
      }
      result = value.trim();
      handle.close();
    };
    const body = () => html`
      <form class="prompt" novalidate @submit=${(e: SubmitEvent) => { e.preventDefault(); submit(); }}>
        <p class="prompt__message">${message}</p>
        <label class="field__label" for="prompt-input">${label}</label>
        <textarea id="prompt-input" class="field__input field__input--multiline prompt__input" rows="3" maxlength="300" placeholder=${placeholder}
          aria-invalid=${showError ? 'true' : 'false'}
          @input=${(e: InputEvent) => { value = (e.target as HTMLTextAreaElement).value; if (showError) { showError = false; draw(); } }}>${value}</textarea>
        ${showError ? html`<p class="field__error">Ce champ est obligatoire.</p>` : nothing}
        ${suggestions.length
          ? html`<div class="prompt__chips">${suggestions.map(
              (s) => html`<button class="chip" type="button" @click=${() => {
                value = s;
                showError = false;
                const input = document.getElementById('prompt-input') as HTMLTextAreaElement | null;
                if (input) input.value = s;
                draw();
              }}>${s}</button>`,
            )}</div>`
          : nothing}
        <div class="modal__actions">
          <button class="btn btn--secondary" type="button" @click=${() => handle.close()}>Annuler</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="submit">${confirmLabel}</button>
        </div>
      </form>
    `;
    const draw = () => handle.update(body());
    const handle = openDialog(title, body(), { onClose: () => resolve(result) });
    queueMicrotask(() => document.getElementById('prompt-input')?.focus());
  });
}
