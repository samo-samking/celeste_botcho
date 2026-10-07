// Rendu d'une icône SVG dans un gabarit lit-html.
//   import { bag } from '@celeste/shared/icons';
//   html`<button>${icon(bag)} Panier</button>`
//   html`<button>${icon(close, { label: 'Fermer' })}</button>`   ← bouton sans texte
import { unsafeSVG } from 'lit-html/directives/unsafe-svg.js';

interface IconOptions {
  /** Taille en px ; par défaut l'icône suit la taille du texte (1.25em). */
  size?: number;
  /** Texte lu par les lecteurs d'écran ; sans label, l'icône est décorative. */
  label?: string;
  class?: string;
}

export function icon(source: string, { size, label, class: cls }: IconOptions = {}) {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  const dims = size ? `width="${size}" height="${size}"` : '';
  // width/height retirés de la balise <svg> seulement : les <rect> en ont besoin
  const svg = source.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace('<svg ', `<svg class="icon${cls ? ' ' + cls : ''}" ${dims} ${a11y} focusable="false" `),
  );
  return unsafeSVG(svg);
}
