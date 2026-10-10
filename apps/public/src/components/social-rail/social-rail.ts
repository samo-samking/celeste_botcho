// Barre des réseaux sociaux fixée à gauche de l'écran (grands écrans), cachée pendant le défilement :
// Facebook, TikTok, Instagram, WhatsApp. Un réseau sans lien n'est pas affiché ; sans aucun lien, pas de barre.
import { html, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { facebook, instagram, tiktok, whatsapp } from '@celeste/shared/icons';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { effect } from '@preact/signals-core';
import { WHATSAPP_MESSAGES } from '../../pages/home/config';
import { siteContact } from '../../stores/settings.store';

/** Délai (ms) sans défilement avant que la barre réapparaisse. */
const SHOW_AFTER = 400;

export function mountSocialRail() {
  const nav = document.createElement('nav');
  nav.className = 'social-rail';
  nav.setAttribute('aria-label', 'Réseaux sociaux');
  document.body.append(nav);

  // liens de la Configuration (admin) : la barre se met à jour quand ils arrivent
  effect(() => {
    const { socials, whatsappNumber } = siteContact.value;
    const links = [
      { href: socials.facebook, label: 'Céleste Bôtchô sur Facebook', ico: facebook },
      { href: socials.tiktok, label: 'Céleste Bôtchô sur TikTok', ico: tiktok },
      { href: socials.instagram, label: 'Céleste Bôtchô sur Instagram', ico: instagram },
      { href: buildContactLink(whatsappNumber, WHATSAPP_MESSAGES.general), label: 'Nous écrire sur WhatsApp', ico: whatsapp },
    ].filter((l) => l.href);
    nav.hidden = !links.length;
    render(
      html`
        <ul>
          ${links.map(
            (l) => html`<li>
              <a href=${l.href} target="_blank" rel="noopener" aria-label=${l.label} title=${l.label}>${icon(l.ico)}</a>
            </li>`,
          )}
        </ul>
      `,
      nav,
    );
  });

  // cachée pendant le défilement, de retour dès qu'on s'arrête (n'importe où dans la page)
  let idle = 0;
  window.addEventListener(
    'scroll',
    () => {
      nav.classList.add('is-hidden');
      window.clearTimeout(idle);
      idle = window.setTimeout(() => nav.classList.remove('is-hidden'), SHOW_AFTER);
    },
    { passive: true },
  );
}
