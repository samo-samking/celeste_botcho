// Point d'entrée de l'admin : styles, garde d'accès, routes.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './components/form-field/form-field.css';
import './components/toast/toast.css';
import './components/modal/modal.css';
import './features/auth/auth.css';
import './app/shell.css';
import './features/dashboard/dashboard.css';
import './components/image-uploader/image-uploader.css';
import './features/categories/categories.css';
import './features/products/products.css';

import { html, render } from 'lit-html';
import { effect } from '@preact/signals-core';
import type { AdminSession } from '@celeste/shared/services/auth.service';
import { authReady, initAuthGuard, session } from './app/auth.guard';
import { navigate, ROUTES, startRouter } from './app/router';
import { mountShell, type Page, type ShellHandle } from './app/shell.view';
import { mountLogin } from './features/auth/auth.view';
import { dashboardPage } from './features/dashboard/dashboard.view';
import { categoriesPage } from './features/categories/categories.view';
import { productsPage } from './features/products/products.view';

const app = document.getElementById('app')!;
let screen = ''; // 'loading' | 'login' | 'shell:<uid>'
let cleanup: (() => void) | null = null;
let shell: ShellHandle | null = null;

function setScreen(key: string, mount: () => () => void) {
  if (key === screen) return;
  cleanup?.();
  shell = null;
  screen = key;
  cleanup = mount();
}

/** Écran correspondant à l'URL, dans la coque. */
function pageFor(path: string, user: AdminSession): Page {
  if (path === ROUTES.products) return productsPage();
  if (path === ROUTES.categories) return categoriesPage();
  return dashboardPage(user);
}

function route(path: string) {
  if (!authReady.value) {
    return setScreen('loading', () => {
      render(html`<div class="app-loading" role="status"><span class="visually-hidden">Chargement…</span></div>`, app);
      return () => undefined;
    });
  }
  const user = session.value;
  if (path === ROUTES.login) {
    if (user) return navigate(ROUTES.home, { replace: true });
    return setScreen('login', () => mountLogin(app));
  }
  if (!user) return navigate(ROUTES.login, { replace: true });

  setScreen(`shell:${user.uid}`, () => {
    shell = mountShell(app, user);
    return () => shell?.destroy();
  });
  // adresse inconnue : retour au tableau de bord
  const known = [ROUTES.home, ROUTES.products, ROUTES.categories].some((r) => path === r || (r !== '/' && path.startsWith(`${r}/`)));
  if (!known) return navigate(ROUTES.home, { replace: true });
  shell?.show(path, pageFor(path, user));
}

initAuthGuard();
startRouter(route);
// relance la route quand l'état de connexion change (chargement terminé, session expirée…)
effect(() => {
  void authReady.value;
  void session.value;
  route(location.pathname);
});
