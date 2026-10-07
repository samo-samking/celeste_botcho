// Routeur minimal (History API). La réécriture `**` → index.html est dans firebase.json.
export const ROUTES = {
  login: '/connexion',
  home: '/',
  products: '/produits',
  categories: '/categories',
} as const;

type Listener = (path: string) => void;
let listener: Listener = () => undefined;

/** `path` peut contenir une requête (« /categories?nouveau ») ; l'écran la lit au montage. */
export function navigate(path: string, { replace = false } = {}) {
  if (path === location.pathname + location.search) return listener(location.pathname);
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  listener(location.pathname);
}

/** Écoute les changements d'URL ; les liens [data-link] naviguent sans recharger la page. */
export function startRouter(onChange: Listener) {
  listener = onChange;
  window.addEventListener('popstate', () => listener(location.pathname));
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest?.<HTMLAnchorElement>('a[data-link]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || link.target === '_blank') return;
    e.preventDefault();
    navigate(link.pathname + link.search);
  });
  listener(location.pathname);
}
