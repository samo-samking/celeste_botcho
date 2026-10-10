// Textes légaux (Configuration › Textes légaux de l'admin) : ouverts depuis le pied de page dans un
// panneau de lecture (<dialog> natif). Adresse partageable : #mentions-legales, #cgv, #confidentialite.
// Mise en forme simple (# titre, ## sous-titre, - liste, **gras**) rendue par lit-html : aucun HTML
// saisi n'est interprété.
import { html, nothing, render, type TemplateResult } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { close } from '@celeste/shared/icons';
import type { LegalSettings } from '@celeste/shared/models';

export type LegalKey = 'mentionsLegales' | 'cgv' | 'confidentialite';

export const LEGAL_PAGES: { key: LegalKey; hash: string; title: string }[] = [
  { key: 'mentionsLegales', hash: 'mentions-legales', title: 'Mentions légales' },
  { key: 'cgv', hash: 'cgv', title: 'Conditions générales de vente' },
  { key: 'confidentialite', hash: 'confidentialite', title: 'Politique de confidentialité' },
];

let legal: Promise<LegalSettings> | null = null;
const loadLegal = () =>
  (legal ??= import('@celeste/shared/repositories/settings.repository')
    .then((m) => m.settingsRepository.getLegal())
    .catch((e) => {
      legal = null;
      throw e;
    }));

/** **gras** dans une ligne. */
function inline(text: string): (string | TemplateResult)[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part) => (/^\*\*[^*]+\*\*$/.test(part) ? html`<strong>${part.slice(2, -2)}</strong>` : part));
}

/** Titre deviné dans un texte tapé sans mise en forme : « CONDITIONS GÉNÉRALES… » (majuscules)
 *  ou « 1. Commande » (numéro + quelques mots, sans point final). */
const isCapsTitle = (l: string) => l.length <= 90 && /[A-ZÀ-Ý]/.test(l) && l === l.toUpperCase() && !/[a-zà-ÿ]/.test(l);
const isNumberedTitle = (l: string) => /^\d{1,2}[.)]\s+\S/.test(l) && l.length <= 60 && !/[.:;!?]$/.test(l);

/** Mise en forme simple → gabarits lit-html : titres, intertitres, listes ; une ligne = un paragraphe. */
function renderMarkdown(source: string): TemplateResult[] {
  const out: TemplateResult[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) out.push(html`<ul>${list.map((l) => html`<li>${inline(l)}</li>`)}</ul>`);
    list = [];
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^[-*•] /.test(line)) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (!line) continue;
    if (line.startsWith('## ')) out.push(html`<h3>${inline(line.slice(3))}</h3>`);
    else if (line.startsWith('# ')) out.push(html`<h2>${inline(line.slice(2))}</h2>`);
    else if (isCapsTitle(line)) out.push(html`<h2>${inline(line)}</h2>`);
    else if (isNumberedTitle(line)) out.push(html`<h3>${inline(line)}</h3>`);
    else out.push(html`<p>${inline(line)}</p>`);
  }
  flushList();
  return out;
}

let dialog: HTMLDialogElement | null = null;

export function openLegal(key: LegalKey, contactEmail = '') {
  const page = LEGAL_PAGES.find((p) => p.key === key)!;
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'legal';
    dialog.setAttribute('aria-labelledby', 'legal-title');
    dialog.addEventListener('click', (e) => e.target === dialog && dialog?.close());
    dialog.addEventListener('close', () => {
      if (LEGAL_PAGES.some((p) => location.hash === `#${p.hash}`)) history.replaceState(null, '', location.pathname + location.search);
    });
    document.body.append(dialog);
  }
  const draw = (body: unknown) =>
    render(
      html`
        <header class="legal__head">
          <h2 class="legal__title" id="legal-title">${page.title}</h2>
          <button class="legal__close" type="button" @click=${() => dialog!.close()}>${icon(close, { label: 'Fermer' })}</button>
        </header>
        <nav class="legal__tabs" aria-label="Textes légaux">
          ${LEGAL_PAGES.map(
            (p) => html`<a href="#${p.hash}" aria-current=${p.key === key ? 'page' : 'false'}
              @click=${(e: MouseEvent) => { e.preventDefault(); openLegal(p.key, contactEmail); }}>${p.title.replace('Conditions générales de vente', 'CGV').replace('Politique de confidentialité', 'Confidentialité')}</a>`,
          )}
        </nav>
        <div class="legal__body">${body}</div>
      `,
      dialog!,
    );
  draw(html`<p class="legal__loading" role="status">Chargement…</p>`);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.legal__body')?.scrollTo(0, 0);
  history.replaceState(null, '', `#${page.hash}`);

  loadLegal()
    .then((l) => {
      const text = l[key].trim();
      draw(
        text
          ? html`${renderMarkdown(text)}${l.updatedAt ? html`<p class="legal__updated">Mis à jour le ${l.updatedAt.toLocaleDateString('fr-FR')}</p>` : nothing}`
          : html`<p>Ce texte sera publié très prochainement.</p>
              ${contactEmail ? html`<p>Pour toute question : <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>` : nothing}`,
      );
    })
    .catch(() => draw(html`<p>Le texte ne peut pas s’afficher pour le moment. Vérifiez votre connexion et réessayez.</p>`));
}

/** Ouvre le texte demandé dans l'adresse (#cgv…) à l'arrivée sur la page ou quand elle change. */
export function watchLegalHash(getEmail: () => string) {
  const check = () => {
    const page = LEGAL_PAGES.find((p) => location.hash === `#${p.hash}`);
    if (page) openLegal(page.key, getEmail());
  };
  window.addEventListener('hashchange', check);
  check();
}
