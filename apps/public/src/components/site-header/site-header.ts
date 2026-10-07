// En-tête fixe et transparent : logo, menu, bouton WhatsApp compact.
// setHeaderState() montre le bouton WhatsApp (fin du hero) et pose un fond une fois le hero dépassé.
// trackSections() souligne l'entrée du menu dont la section est à l'écran.
import { html } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { whatsapp } from '@celeste/shared/icons';

export interface HeaderLink {
  href: string;
  label: string;
}

export function siteHeader(links: HeaderLink[], whatsappHref: string) {
  return html`
    <header class="site-header">
      <div class="site-header__inner">
        <a class="site-header__brand" href="/" aria-label="Céleste Bôtchô, accueil">
          <img src="/brand/logo-hd.webp" alt="" width="426" height="168" fetchpriority="high" />
        </a>
        <nav class="site-header__nav" aria-label="Menu principal">
          <ul>
            ${links.map((l) => html`<li><a class="site-header__link" href=${l.href}>${l.label}</a></li>`)}
          </ul>
        </nav>
        <a class="site-header__wa btn btn--primary btn--sm" href=${whatsappHref} target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          ${icon(whatsapp)} <span>WhatsApp</span>
        </a>
      </div>
    </header>
  `;
}

export function setHeaderState(header: HTMLElement, { showWhatsapp, solid }: { showWhatsapp: boolean; solid: boolean }) {
  header.classList.toggle('is-solid', solid);
  const wa = header.querySelector<HTMLElement>('.site-header__wa');
  if (!wa || wa.classList.contains('is-visible') === showWhatsapp) return;
  wa.classList.toggle('is-visible', showWhatsapp);
  // invisible = hors de la navigation clavier et des lecteurs d'écran
  wa.tabIndex = showWhatsapp ? 0 : -1;
  wa.toggleAttribute('aria-hidden', !showWhatsapp);
}

/** Met en évidence le lien dont la section occupe le milieu de l'écran. */
export function trackSections(header: HTMLElement) {
  const links = [...header.querySelectorAll<HTMLAnchorElement>('.site-header__link')];
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter((s): s is HTMLElement => !!s);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = byId.get(entry.target.id);
        if (!link) continue;
        link.classList.toggle('is-current', entry.isIntersecting);
        if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -45% 0px' }, // bande de 10 % au milieu de l'écran
  );
  sections.forEach((s) => observer.observe(s));
  return () => observer.disconnect();
}
