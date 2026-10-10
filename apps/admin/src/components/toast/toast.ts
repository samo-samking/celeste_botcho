// Notifications : succès, erreur, info. Disparaissent après 4 s, annoncées aux lecteurs d'écran.
import { html, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, check, close, info } from '@celeste/shared/icons';

type Kind = 'success' | 'error' | 'info';
interface Item {
  id: number;
  kind: Kind;
  message: string;
}

const ICONS = { success: check, error: alertCircle, info } as const;
let items: Item[] = [];
let nextId = 1;
let host: HTMLElement | null = null;

/** Un panneau ou une boîte de dialogue modale est toujours dessiné au premier plan : des notifications
 *  restées dans la page s'afficheraient DERRIÈRE lui, donc invisibles. On les place dans la dernière
 *  boîte ouverte (ou dans la page s'il n'y en a pas). */
function placeHost() {
  // un panneau en train de se fermer va disparaître : il ne doit pas emporter les notifications
  const topDialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]:not(.is-closing)')].at(-1);
  const parent = topDialog ?? document.body;
  if (host!.parentElement !== parent) parent.append(host!);
}

function draw() {
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
  }
  placeHost();
  render(
    html`${items.map(
      (t) => html`
        <div class="toast toast--${t.kind}">
          <span class="toast__icon">${icon(ICONS[t.kind])}</span>
          <p class="toast__message">${t.message}</p>
          <button class="toast__close" type="button" @click=${() => dismiss(t.id)}>${icon(close, { label: 'Fermer' })}</button>
        </div>
      `,
    )}`,
    host,
  );
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  draw();
}

function push(kind: Kind, message: string) {
  const id = nextId++;
  items = [...items.slice(-2), { id, kind, message }]; // 3 au plus
  draw();
  window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000);
}

export const toast = {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m),
  info: (m: string) => push('info', m),
};

/** Message d'erreur lisible à partir d'une exception. */
export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'permission-denied') return "Action refusée : votre compte n'a pas les droits nécessaires.";
  if (code === 'unavailable') return 'Pas de connexion internet. Réessayez dans un instant.';
  return e instanceof Error && e.message ? e.message : 'Une erreur est survenue. Réessayez.';
}
