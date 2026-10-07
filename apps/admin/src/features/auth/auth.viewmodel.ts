// ViewModel de l'écran de connexion (§4.2) : connexion e-mail + mot de passe, mot de passe oublié,
// message d'erreur générique, attente imposée après 5 échecs (Firebase limite aussi côté serveur).
import { computed, signal } from '@preact/signals-core';
import { requestPasswordReset } from '@celeste/shared/services/auth.service';
import { accessMessage, messageFor, signIn } from '../../app/auth.guard';

export const MAX_FAILURES = 5;
export const LOCK_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginMode = 'login' | 'reset' | 'reset-sent';

export class LoginViewModel {
  readonly mode = signal<LoginMode>('login');
  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false); // n'affiche les erreurs de champ qu'après un essai
  readonly error = signal<string | null>(accessMessage.peek());
  readonly failures = signal(0);
  readonly lockedUntil = signal(0);
  readonly now = signal(Date.now());
  private timer: number | undefined;

  constructor() {
    accessMessage.value = null; // message de déconnexion forcée : affiché une seule fois
  }

  readonly emailError = computed(() => {
    if (!this.submitted.value) return null;
    const v = this.email.value.trim();
    if (!v) return 'Saisissez votre adresse e-mail.';
    return EMAIL_RE.test(v) ? null : 'Adresse e-mail invalide.';
  });
  readonly passwordError = computed(() =>
    this.submitted.value && this.mode.value === 'login' && !this.password.value ? 'Saisissez votre mot de passe.' : null,
  );
  readonly lockSeconds = computed(() => Math.max(0, Math.ceil((this.lockedUntil.value - this.now.value) / 1000)));

  setMode(mode: LoginMode) {
    this.mode.value = mode;
    this.submitted.value = false;
    this.error.value = null;
  }

  async login() {
    this.submitted.value = true;
    if (this.emailError.value || this.passwordError.value || this.lockSeconds.value > 0 || this.submitting.value) return false;
    this.submitting.value = true;
    this.error.value = null;
    try {
      await signIn(this.email.value, this.password.value);
      this.failures.value = 0;
      return true;
    } catch (e) {
      this.error.value = messageFor(e);
      this.password.value = '';
      this.failures.value++;
      if (this.failures.value >= MAX_FAILURES) this.lock();
      return false;
    } finally {
      this.submitting.value = false;
    }
  }

  async sendReset() {
    this.submitted.value = true;
    if (this.emailError.value || this.submitting.value) return;
    this.submitting.value = true;
    this.error.value = null;
    try {
      await requestPasswordReset(this.email.value);
      this.mode.value = 'reset-sent';
    } catch (e) {
      this.error.value = messageFor(e);
    } finally {
      this.submitting.value = false;
    }
  }

  private lock() {
    this.failures.value = 0;
    this.lockedUntil.value = Date.now() + LOCK_SECONDS * 1000;
    this.now.value = Date.now();
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.now.value = Date.now();
      if (this.lockSeconds.value === 0) window.clearInterval(this.timer);
    }, 1000);
  }

  dispose() {
    window.clearInterval(this.timer);
  }
}
