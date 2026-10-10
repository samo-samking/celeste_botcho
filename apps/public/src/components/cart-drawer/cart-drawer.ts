// Panneau du panier : à droite sur ordinateur, feuille en bas sur mobile (<dialog> natif : focus
// piégé, Échap, retour du focus). Lignes relues du catalogue (prix à jour, produit retiré signalé),
// quantités − / +, sous-total, paiement à la livraison, bouton « Commander ».
// Panier vide : animation du sac (Lottie) et retour à la vitrine.
import { html, nothing, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { effect, signal } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, bag, close, minus, plus, refresh, sigCash, trash } from '@celeste/shared/icons';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { categoryColor, darkenToContrast, lightenToContrast } from '@celeste/shared/utils/color';
import emptyBagUrl from '@celeste/shared/lotties/empty-bag.json?url';
import { cartCount, cartLines, cartOpen, MAX_QTY, removeLine, setQty, type CartLine } from '../../stores/cart.store';
import { loadCatalog, type Catalog, type CatalogProduct, type CatalogVariant } from '../../stores/catalog.store';
import { mountLottie } from '../lottie/lottie-player';
import { backToCart, checkoutBar, checkoutBody, resetCheckout, startCheckout, step } from './checkout';

interface ResolvedLine {
  line: CartLine;
  product: CatalogProduct | null;
  variant: CatalogVariant | null;
  /** Produit retiré, format désactivé ou épuisé : la ligne ne compte pas dans le total. */
  unavailable: boolean;
  /** Couleur de la catégorie du produit (bordure, fond, prix). */
  colors: LineColors | null;
}

const catalog = signal<Catalog | null>(null);
const loadError = signal(false);
let dialog: HTMLDialogElement;
let stopLottie: (() => void) | null = null;
let lottieHost: HTMLElement | null = null;

function fetchCatalog() {
  loadError.value = false;
  loadCatalog()
    .then((c) => (catalog.value = c))
    .catch(() => (loadError.value = true));
}

/** Couleurs de chaque catégorie (mêmes teintes que la vitrine), calculées une fois par catalogue. */
type LineColors = { '--lc': string; '--lt': string; '--la': string };
const colorCache = new WeakMap<Catalog, Map<string, LineColors>>();
function colorsOf(c: Catalog, categoryId: string | undefined): LineColors | null {
  let map = colorCache.get(c);
  if (!map) {
    map = new Map(
      c.categories.map((cat, i) => {
        const color = categoryColor(cat.color, i);
        return [cat.id, { '--lc': color, '--lt': darkenToContrast(color), '--la': lightenToContrast(color) }];
      }),
    );
    colorCache.set(c, map);
  }
  return (categoryId && map.get(categoryId)) || null;
}

function resolve(c: Catalog): ResolvedLine[] {
  return cartLines.value.map((line) => {
    const product = c.byId.get(line.productId) ?? null;
    const variant = product?.variants.find((v) => v.sku === line.sku) ?? null;
    return { line, product, variant, unavailable: !variant || !variant.available, colors: colorsOf(c, product?.categoryId) };
  });
}

function lineTemplate({ line, product, variant, unavailable, colors }: ResolvedLine) {
  const name = product?.name ?? 'Produit retiré';
  const photo = variant?.image ?? product?.image; // photo du format choisi, sinon celle du produit
  return html`
    <li class="cart-line ${unavailable ? 'is-unavailable' : ''} ${colors ? 'has-color' : ''}" style=${styleMap(colors ?? {})}>
      <span class="cart-line__thumb">
        ${photo ? html`<img src=${photo.src} alt="" loading="lazy" />` : html`${icon(bag)}`}
      </span>
      <div class="cart-line__main">
        <p class="cart-line__name">${name}</p>
        <p class="cart-line__meta">
          ${variant ? html`${variant.label} · ${formatFcfa(variant.price, { short: true })}` : nothing}
          ${unavailable ? html`<span class="cart-line__warn">${icon(alertCircle)} Plus disponible</span>` : nothing}
        </p>
        ${unavailable
          ? nothing
          : html`
              <div class="stepper" role="group" aria-label="Quantité de ${name}">
                <button type="button" ?disabled=${line.qty <= 1} @click=${() => setQty(line.productId, line.sku, line.qty - 1)}>
                  ${icon(minus, { label: 'Retirer un' })}
                </button>
                <span class="stepper__value" aria-live="polite">${line.qty}</span>
                <button type="button" ?disabled=${line.qty >= MAX_QTY} @click=${() => setQty(line.productId, line.sku, line.qty + 1)}>
                  ${icon(plus, { label: 'Ajouter un' })}
                </button>
              </div>
            `}
      </div>
      <div class="cart-line__side">
        <span class="cart-line__total">${variant && !unavailable ? formatFcfa(variant.price * line.qty, { short: true }) : '—'}</span>
        <button class="cart-line__remove" type="button" @click=${() => removeLine(line.productId, line.sku)}>
          ${icon(trash, { label: `Retirer ${name} du panier` })}
        </button>
      </div>
    </li>
  `;
}

function emptyTemplate() {
  return html`
    <div class="cart-empty">
      <div class="cart-empty__visual" aria-hidden="true">${icon(bag)}</div>
      <p class="cart-empty__title">Votre panier est vide</p>
      <p class="cart-empty__text">Nos bonbons vous attendent : choisissez un format dans la vitrine et ajoutez-le ici.</p>
      <button class="btn btn--primary" type="button" @click=${discover}>Découvrir nos produits</button>
    </div>
  `;
}

/** Ferme le panier et emmène vers la vitrine. */
function discover() {
  cartOpen.value = false;
  const vitrine = document.getElementById('produits');
  if (vitrine) window.setTimeout(() => vitrine.scrollIntoView({ behavior: 'smooth' }), 300);
  else location.href = '/#produits';
}

function template() {
  const count = cartCount.value;
  const c = catalog.value;
  const empty = cartLines.value.length === 0;
  const lines = c ? resolve(c) : [];
  const subtotal = lines.filter((l) => !l.unavailable).reduce((s, l) => s + l.variant!.price * l.line.qty, 0);
  const orderable = lines.some((l) => !l.unavailable);

  // commande en cours ou confirmée : le panneau montre le formulaire, puis la confirmation
  if (step.value !== 'cart' && (!empty || step.value === 'done')) {
    return html`
      <div class="cart__head">
        <h2 class="cart__title" id="cart-title">${step.value === 'done' ? 'Commande envoyée' : 'Finaliser ma commande'}</h2>
        <button class="cart__close" type="button" @click=${() => (cartOpen.value = false)}>${icon(close, { label: 'Fermer' })}</button>
      </div>
      <div class="cart__body">${checkoutBody()}</div>
      ${checkoutBar()}
    `;
  }
  if (step.value === 'form' && empty) backToCart();

  let body;
  if (empty) body = emptyTemplate();
  else if (loadError.value)
    body = html`<div class="cart-empty">
      <p class="cart-empty__title">Le panier ne peut pas se charger</p>
      <p class="cart-empty__text">Vérifiez votre connexion internet, puis réessayez.</p>
      <button class="btn btn--secondary" type="button" @click=${fetchCatalog}>${icon(refresh)} Réessayer</button>
    </div>`;
  else if (!c) body = html`<ul class="cart-lines" aria-busy="true">${cartLines.value.map(() => html`<li class="cart-line cart-line--skeleton"></li>`)}</ul>`;
  else body = html`<ul class="cart-lines">${lines.map(lineTemplate)}</ul>`;

  return html`
    <div class="cart__head">
      <h2 class="cart__title" id="cart-title">Mon panier ${count ? html`<span class="cart__count">${count}</span>` : nothing}</h2>
      <button class="cart__close" type="button" @click=${() => (cartOpen.value = false)}>${icon(close, { label: 'Fermer le panier' })}</button>
    </div>
    <div class="cart__body">${body}</div>
    ${!empty && c
      ? html`
          <div class="cart__foot">
            <div class="cart__row"><span>Sous-total</span><strong>${formatFcfa(subtotal)}</strong></div>
            <div class="cart__row cart__row--muted"><span>Livraison</span><span>Calculée à l'étape suivante</span></div>
            <div class="cart__pay">
              <span class="cart__pay-icon" aria-hidden="true">${icon(sigCash, { size: 40 })}</span>
              <span><strong>Paiement à la livraison</strong><br />Vous payez en espèces à la réception de votre commande.</span>
            </div>
            <button class="btn btn--primary cart__order" type="button" ?disabled=${!orderable} @click=${() => void startCheckout()}>
              Commander · ${formatFcfa(subtotal, { short: true })}
            </button>
            <button class="cart__continue" type="button" @click=${() => (cartOpen.value = false)}>Continuer mes achats</button>
          </div>
        `
      : nothing}
  `;
}

/** Sac animé du panier vide : monté à l'apparition, arrêté à la disparition. */
function syncLottie() {
  const host = dialog.querySelector<HTMLElement>('.cart-empty__visual');
  if (host === lottieHost) return;
  stopLottie?.();
  stopLottie = null;
  lottieHost = host;
  if (host) void mountLottie(host, emptyBagUrl, { stillFrame: 0 }).then((stop) => (stopLottie = stop));
}

function closeAnimated() {
  if (!dialog.open) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return dialog.close();
  dialog.classList.add('is-closing');
  const done = () => dialog.open && dialog.close();
  dialog.addEventListener('animationend', (e) => e.target === dialog && done(), { once: true });
  window.setTimeout(done, 450);
}

export function mountCartDrawer() {
  dialog = document.createElement('dialog');
  dialog.className = 'cart';
  dialog.setAttribute('aria-labelledby', 'cart-title');
  document.body.append(dialog);

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault(); // Échap : fermeture animée
    cartOpen.value = false;
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) cartOpen.value = false; // clic sur le fond
  });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('is-closing');
    cartOpen.value = false;
    resetCheckout();
  });

  effect(() => {
    // commande : le panneau passe en plein écran
    dialog.classList.toggle('cart--full', step.value !== 'cart');
    render(template(), dialog);
    syncLottie();
  });
  effect(() => {
    if (cartOpen.value) {
      if (!dialog.open) {
        dialog.showModal();
        if (!catalog.value) fetchCatalog();
      }
    } else closeAnimated();
  });
}
