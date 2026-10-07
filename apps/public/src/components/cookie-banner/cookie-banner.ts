// Bandeau de consentement aux cookies, monté sur toutes les pages (main.ts).
// Ordinateur : barre flottante centrée en bas. Mobile : feuille accrochée au bas de l'écran.
// « Tout refuser » et « Tout accepter » ont le même poids : refuser doit être aussi simple qu'accepter.
// Un cookie animé (Lottie, 9 Ko) joue deux fois puis s'arrête ; l'icône cookie le remplace en attendant.
// Tout élément [data-cookie-settings] (lien du pied de page) rouvre les réglages.
import { html, nothing, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { cookie } from '@celeste/shared/icons';
import cookieAnimationUrl from '@celeste/shared/lotties/cookie.json?url';
import { consent, consentPanelOpen, saveConsent } from '../../stores/consent.store';
import { mountLottie } from '../lottie/lottie-player';

const LEAVE_MS = 280;
/** Image fixe de l'animation : le cookie croqué. */
const STILL_FRAME = 60;

let customizing = false;
let leaving = false;
let host: HTMLElement;
let lottieHost: HTMLElement | null = null;
let stopLottie: (() => void) | null = null;

function template() {
  const current = consent.value;
  if (current !== null && !consentPanelOpen.value) return nothing;
  const analyticsChecked = current?.analytics ?? false;

  return html`
    <section class="cookie-banner ${customizing ? 'is-customizing' : ''} ${leaving ? 'is-leaving' : ''}" role="dialog" aria-modal="false"
      aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <span class="cookie-banner__handle" aria-hidden="true"></span>
      <div class="cookie-banner__visual" aria-hidden="true">${icon(cookie)}</div>
      <div class="cookie-banner__body">
        <h2 class="cookie-banner__title" id="cookie-title">Un petit cookie ?</h2>
        <p class="cookie-banner__text" id="cookie-text">
          Quelques cookies font fonctionner la boutique (panier, sécurité). Avec votre accord, nous mesurons aussi l'audience.
          Jamais de publicité.
        </p>
      </div>

      ${customizing
        ? html`
            <form class="cookie-banner__options" @submit=${onSave}>
              <label class="cookie-option">
                <span>
                  <span class="cookie-option__name">Indispensables</span>
                  <span class="cookie-option__desc">Panier, sécurité. Toujours actifs.</span>
                </span>
                <input class="cookie-switch" type="checkbox" role="switch" checked disabled />
              </label>
              <label class="cookie-option">
                <span>
                  <span class="cookie-option__name">Mesure d'audience</span>
                  <span class="cookie-option__desc">Pages vues, anonymisées.</span>
                </span>
                <input class="cookie-switch" type="checkbox" role="switch" name="analytics" .checked=${analyticsChecked} />
              </label>
              <div class="cookie-banner__save">
                <button class="btn btn--primary btn--sm" type="submit">Enregistrer mes choix</button>
              </div>
            </form>
          `
        : html`
            <div class="cookie-banner__actions">
              <button class="cookie-banner__link" type="button" @click=${openCustomize}>Personnaliser</button>
              <button class="btn btn--secondary btn--sm" type="button" @click=${() => choose(false)}>Tout refuser</button>
              <button class="btn btn--primary btn--sm" type="button" @click=${() => choose(true)}>Tout accepter</button>
            </div>
          `}
    </section>
  `;
}

/** Enregistre le choix après l'animation de sortie (immédiat si les animations sont réduites). */
function choose(analytics: boolean) {
  if (leaving) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish(analytics);
  leaving = true;
  rerender();
  window.setTimeout(() => finish(analytics), LEAVE_MS);
}

function finish(analytics: boolean) {
  leaving = false;
  customizing = false;
  saveConsent({ analytics });
}

function onSave(e: SubmitEvent) {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  choose((form.elements.namedItem('analytics') as HTMLInputElement).checked);
}

function openCustomize() {
  customizing = true;
  rerender();
  host.querySelector<HTMLInputElement>('input[name="analytics"]')?.focus();
}

/** Monte le cookie animé quand le bandeau apparaît, l'arrête quand il disparaît. */
function syncAnimation() {
  const visual = host.querySelector<HTMLElement>('.cookie-banner__visual');
  if (visual === lottieHost) return;
  stopLottie?.();
  stopLottie = null;
  lottieHost = visual;
  if (visual) void mountLottie(visual, cookieAnimationUrl, { stillFrame: STILL_FRAME, plays: 2 }).then((stop) => (stopLottie = stop));
}

const rerender = () => {
  render(template(), host);
  syncAnimation();
};

export function mountCookieBanner() {
  host = document.createElement('div');
  host.className = 'cookie-banner-host';
  document.body.append(host);
  effect(rerender);

  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest?.('[data-cookie-settings]')) return;
    e.preventDefault();
    customizing = true;
    consentPanelOpen.value = true;
    host.querySelector<HTMLInputElement>('input[name="analytics"]')?.focus();
  });
}
