// Écran de connexion de l'admin.
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, arrowLeft, check, eye, eyeOff, loader, lock, mail } from '@celeste/shared/icons';
import { formField } from '../../components/form-field/form-field';
import { navigate, ROUTES } from '../../app/router';
import { LoginViewModel } from './auth.viewmodel';

const PUBLIC_SITE = 'https://celestebotcho-322a5.web.app';

export function mountLogin(container: HTMLElement): () => void {
  const vm = new LoginViewModel();

  const errorBox = () =>
    vm.error.value
      ? html`<div class="auth__alert" role="alert">${icon(alertCircle)}<span>${vm.error.value}</span></div>`
      : nothing;

  const submitLabel = (idle: string, busy: string) =>
    vm.submitting.value ? html`${icon(loader, { class: 'icon--spin' })} ${busy}` : idle;

  const emailField = () =>
    formField({
      id: 'email',
      label: 'Adresse e-mail',
      type: 'email',
      inputmode: 'email',
      autocomplete: 'username',
      leadingIcon: mail,
      value: vm.email.value,
      onInput: (v) => (vm.email.value = v),
      error: vm.emailError.value,
      required: true,
    });

  const loginForm = () => {
    const locked = vm.lockSeconds.value > 0;
    return html`
      <form class="auth__form" novalidate @submit=${async (e: SubmitEvent) => {
        e.preventDefault();
        if (await vm.login()) navigate(ROUTES.home, { replace: true });
        else container.querySelector<HTMLInputElement>(vm.emailError.value ? '#email' : '#password')?.focus();
      }}>
        ${errorBox()} ${emailField()}
        ${formField({
          id: 'password',
          label: 'Mot de passe',
          type: vm.showPassword.value ? 'text' : 'password',
          autocomplete: 'current-password',
          leadingIcon: lock,
          value: vm.password.value,
          onInput: (v) => (vm.password.value = v),
          error: vm.passwordError.value,
          required: true,
          trailing: html`
            <button class="field__action" type="button" aria-pressed=${vm.showPassword.value ? 'true' : 'false'}
              @click=${() => (vm.showPassword.value = !vm.showPassword.value)}>
              ${icon(vm.showPassword.value ? eyeOff : eye, { label: vm.showPassword.value ? 'Masquer le mot de passe' : 'Afficher le mot de passe' })}
            </button>
          `,
        })}
        <div class="auth__row">
          <button class="auth__link" type="button" @click=${() => vm.setMode('reset')}>Mot de passe oublié ?</button>
        </div>
        <button class="btn btn--primary auth__submit" type="submit" ?disabled=${vm.submitting.value || locked}>
          ${locked ? `Réessayez dans ${vm.lockSeconds.value} s` : submitLabel('Se connecter', 'Connexion…')}
        </button>
        ${locked
          ? html`<p class="auth__note" role="status">Trop d'essais : patientez quelques secondes avant de réessayer.</p>`
          : nothing}
      </form>
    `;
  };

  const resetForm = () => html`
    <form class="auth__form" novalidate @submit=${(e: SubmitEvent) => {
      e.preventDefault();
      void vm.sendReset();
    }}>
      <p class="auth__lead">Saisissez l'adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
      ${errorBox()} ${emailField()}
      <button class="btn btn--primary auth__submit" type="submit" ?disabled=${vm.submitting.value}>
        ${submitLabel('Envoyer le lien', 'Envoi…')}
      </button>
      <button class="auth__link auth__back" type="button" @click=${() => vm.setMode('login')}>${icon(arrowLeft)} Retour à la connexion</button>
    </form>
  `;

  const resetSent = () => html`
    <div class="auth__form" role="status">
      <div class="auth__success">${icon(check)}</div>
      <p class="auth__lead">
        Si un compte existe pour <strong>${vm.email.value.trim()}</strong>, un e-mail vient d'être envoyé. Pensez à regarder dans
        les courriers indésirables.
      </p>
      <button class="btn btn--secondary auth__submit" type="button" @click=${() => vm.setMode('login')}>Retour à la connexion</button>
    </div>
  `;

  const titles = {
    login: ['Espace administration', 'Connectez-vous pour gérer la boutique.'],
    reset: ['Mot de passe oublié', 'Recevez un lien de réinitialisation par e-mail.'],
    'reset-sent': ['Vérifiez vos e-mails', ''],
  } as const;

  const dispose = effect(() => {
    const [title, subtitle] = titles[vm.mode.value];
    render(
      html`
        <main class="auth">
          <div class="auth__visual" aria-hidden="true">
            <div class="auth__visual-caption">
              <span class="auth__visual-kicker">Espace équipe</span>
              <span class="auth__visual-title">Plus de volume,<br />plus de confiance</span>
            </div>
          </div>
          <div class="auth__panel">
          <div class="auth__glow" aria-hidden="true"></div>
          <section class="auth__card" aria-labelledby="auth-title">
            <img class="auth__logo" src="/brand/logo-hd.webp" alt="Céleste Bôtchô" width="426" height="168" />
            <span class="auth__rule" aria-hidden="true"></span>
            <h1 class="auth__title" id="auth-title">${title}</h1>
            ${subtitle ? html`<p class="auth__subtitle">${subtitle}</p>` : nothing}
            ${vm.mode.value === 'login' ? loginForm() : vm.mode.value === 'reset' ? resetForm() : resetSent()}
          </section>
          <p class="auth__footer">
            Accès réservé à l'équipe Céleste Bôtchô · <a href=${PUBLIC_SITE}>Voir la boutique</a>
          </p>
          </div>
        </main>
      `,
      container,
    );
  });

  container.querySelector<HTMLInputElement>('#email')?.focus();

  return () => {
    dispose();
    vm.dispose();
  };
}
