// Coque de l'admin : menu latéral (panneau coulissant sur mobile), compte, zone de contenu.
// Chaque écran est monté dans la zone de contenu par show(path) ; les entrées « Bientôt » sont
// visibles pour montrer la suite, et la section Administration est réservée à la propriétaire.
import { html, nothing, render, type TemplateResult } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import {
  chat,
  clipboardList,
  close,
  dashboard,
  externalLink,
  folder,
  history,
  logout,
  menu,
  package as packageIcon,
  percent,
  settings,
  truck,
  users,
} from '@celeste/shared/icons';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { signOut } from './auth.guard';
import { navigate, ROUTES } from './router';

const PUBLIC_SITE = 'https://celestebotcho-322a5.web.app';
const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Gestionnaire' } as const;

interface NavItem {
  label: string;
  icon: string;
  path?: string; // absent = bientôt
}
interface NavSection {
  title: string;
  ownerOnly?: boolean;
  items: NavItem[];
}

const NAV: NavSection[] = [
  { title: 'Pilotage', items: [{ label: 'Tableau de bord', icon: dashboard, path: ROUTES.home }] },
  {
    title: 'Catalogue',
    items: [
      { label: 'Produits', icon: packageIcon, path: ROUTES.products },
      { label: 'Catégories', icon: folder, path: ROUTES.categories },
      { label: 'Promotions', icon: percent },
    ],
  },
  {
    title: 'Ventes',
    items: [
      { label: 'Commandes', icon: clipboardList },
      { label: 'Messages', icon: chat },
      { label: 'Livraison', icon: truck },
    ],
  },
  {
    title: 'Administration',
    ownerOnly: true,
    items: [
      { label: 'Configuration', icon: settings },
      { label: 'Comptes admin', icon: users },
      { label: 'Journal', icon: history },
    ],
  },
];

export interface Page {
  title: string;
  /** Monte l'écran dans `outlet` ; renvoie une fonction de nettoyage. */
  mount(outlet: HTMLElement): () => void;
}

export interface ShellHandle {
  show(path: string, page: Page): void;
  destroy(): void;
}

export function mountShell(container: HTMLElement, user: AdminSession): ShellHandle {
  let currentPath = '';
  let drawerOpen = false;
  let pageCleanup: (() => void) | null = null;

  const isActive = (path: string) => (path === ROUTES.home ? currentPath === path : currentPath.startsWith(path));

  const navItem = (item: NavItem): TemplateResult =>
    item.path
      ? html`
          <li>
            <a class="nav__link ${isActive(item.path) ? 'is-active' : ''}" href=${item.path} data-link
              aria-current=${isActive(item.path) ? 'page' : 'false'}>
              ${icon(item.icon)}<span>${item.label}</span>
            </a>
          </li>
        `
      : html`
          <li>
            <span class="nav__link is-soon" aria-disabled="true">
              ${icon(item.icon)}<span>${item.label}</span><span class="nav__soon">Bientôt</span>
            </span>
          </li>
        `;

  const setDrawer = (open: boolean) => {
    drawerOpen = open;
    draw();
    if (open) container.querySelector<HTMLElement>('.sidebar .nav__link')?.focus();
    else container.querySelector<HTMLElement>('.topbar__menu')?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && drawerOpen) setDrawer(false);
  };
  document.addEventListener('keydown', onKey);

  function draw() {
    render(
      html`
        <a class="skip-link" href="#contenu">Aller au contenu</a>
        <div class="shell ${drawerOpen ? 'is-drawer-open' : ''}">
          <header class="topbar">
            <button class="topbar__menu" type="button" aria-controls="sidebar" aria-expanded=${drawerOpen ? 'true' : 'false'}
              @click=${() => setDrawer(!drawerOpen)}>
              ${icon(drawerOpen ? close : menu, { label: drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu' })}
            </button>
            <a class="topbar__brand" href=${ROUTES.home} data-link aria-label="Tableau de bord">
              <img src="/brand/logo-hd.webp" alt="" width="426" height="168" />
            </a>
          </header>

          <aside class="sidebar" id="sidebar" aria-label="Navigation de l'administration">
            <a class="sidebar__brand" href=${ROUTES.home} data-link aria-label="Tableau de bord">
              <img src="/brand/logo-hd.webp" alt="" width="426" height="168" />
            </a>
            <nav class="nav">
              ${NAV.filter((s) => !s.ownerOnly || user.role === 'owner').map(
                (section) => html`
                  <p class="nav__title">${section.title}</p>
                  <ul class="nav__list">${section.items.map(navItem)}</ul>
                `,
              )}
            </nav>
            <div class="sidebar__account">
              <span class="sidebar__avatar" aria-hidden="true">${(user.displayName || user.email).slice(0, 1).toUpperCase()}</span>
              <span class="sidebar__user">
                <span class="sidebar__name">${user.displayName}</span>
                <span class="sidebar__role">${ROLE_LABELS[user.role]}</span>
              </span>
            </div>
            <div class="sidebar__actions">
              <a class="sidebar__action" href=${PUBLIC_SITE} target="_blank" rel="noopener">
                ${icon(externalLink)}<span>Voir la boutique</span>
              </a>
              <button class="sidebar__action" type="button" @click=${async () => {
                await signOut();
                navigate(ROUTES.login, { replace: true });
              }}>
                ${icon(logout)}<span>Se déconnecter</span>
              </button>
            </div>
          </aside>
          ${drawerOpen ? html`<div class="shell__scrim" @click=${() => setDrawer(false)}></div>` : nothing}

          <main class="shell__content" id="contenu" tabindex="-1"></main>
        </div>
      `,
      container,
    );
  }

  draw();

  return {
    show(path: string, page: Page) {
      if (path === currentPath && pageCleanup) return; // écran déjà affiché
      currentPath = path;
      drawerOpen = false;
      draw();
      pageCleanup?.();
      const outlet = container.querySelector<HTMLElement>('.shell__content')!;
      render(nothing, outlet);
      pageCleanup = page.mount(outlet);
      document.title = `${page.title} — Admin Céleste Bôtchô`;
      outlet.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
      // annonce le changement d'écran aux lecteurs d'écran : focus sur le titre
      outlet.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    },
    destroy() {
      pageCleanup?.();
      document.removeEventListener('keydown', onKey);
      render(nothing, container);
    },
  };
}

/** En-tête d'écran commun : titre (focusable pour les lecteurs d'écran), sous-titre, actions. */
export function pageHead(title: string, subtitle?: string, actions?: TemplateResult) {
  return html`
    <div class="page-head">
      <div>
        <h1 class="page-head__title" tabindex="-1">${title}</h1>
        ${subtitle ? html`<p class="page-head__subtitle">${subtitle}</p>` : nothing}
      </div>
      ${actions ? html`<div class="page-head__actions">${actions}</div>` : nothing}
    </div>
  `;
}
