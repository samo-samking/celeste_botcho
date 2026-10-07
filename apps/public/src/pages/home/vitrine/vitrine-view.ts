// Vue de la vitrine des catégories : rendu unique, puis animation par classes et data-state.
// Relais entre produits (le produit actif s'envole, la vignette du suivant grandit jusqu'au centre),
// changement de catégorie (sortie échelonnée par le haut, entrée par le bas, couleur de fond qui fond).
import { html, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { arrowRight, bagPlus, chevronLeft, chevronRight, whatsapp } from '@celeste/shared/icons';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { addToCart } from '../../../stores/cart.store';
import { flyToCart } from '../../../components/cart-drawer/cart-fly';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { WHATSAPP_MESSAGES, WHATSAPP_NUMBER } from '../config';
import { itemState, VitrineState, type Move } from './vitrine';
import { loadVitrine, type VitrineCategory } from './vitrine-data';
import type { CatalogProduct } from '../../../stores/catalog.store';

const DURATION = 800;
const STAGGER = 60; // décalage entre produits qui sortent / entrent
const SWAP_AT = 400; // remplacement des textes au milieu du mouvement
const SWIPE_MIN = 50;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const orderLink = (name: string, price: string) => buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.product(name, price));

function message(section: HTMLElement, title: string, text: string) {
  render(
    html`
      <div class="vitrine__inner vitrine__inner--message">
        <div class="vitrine__lottie" aria-hidden="true"></div>
        <h2 class="vitrine__cat" id="vitrine-title">${title}</h2>
        <p class="vitrine__desc">${text}</p>
        <a class="btn btn--primary" href=${buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.general)} target="_blank" rel="noopener">
          ${icon(whatsapp)} Commander sur WhatsApp
        </a>
      </div>
    `,
    section,
  );
  // pot de bonbons animé : lecteur Lottie chargé seulement ici
  const jar = section.querySelector<HTMLElement>('.vitrine__lottie')!;
  void import('./vitrine-lottie').then((m) => m.mountCandyJar(jar));
}

export async function mountVitrine(section: HTMLElement): Promise<void> {
  let data: VitrineCategory[];
  try {
    data = await loadVitrine();
  } catch {
    return message(section, 'Nos produits', 'La vitrine ne peut pas s’afficher pour le moment. Écrivez-nous sur WhatsApp, nous vous répondons vite.');
  }
  if (!data.length) {
    return message(section, 'Nos produits arrivent', 'La boutique se prépare. En attendant, commandez directement sur WhatsApp.');
  }

  const state = new VitrineState(data.map((c) => c.products.length));
  const first = data[0]!;

  render(
    html`
      <div class="vitrine__inner">
        <h2 class="visually-hidden" id="vitrine-title">Nos produits par catégorie</h2>
        <div class="vitrine__tabs" role="tablist" aria-label="Catégories">
          ${data.map(
            (c, i) => html`
              <button class="vitrine__tab" role="tab" type="button" id="vitrine-tab-${i}" aria-controls="vitrine-panel"
                aria-selected=${i === 0 ? 'true' : 'false'} tabindex=${i === 0 ? '0' : '-1'} data-cat=${i}>
                ${c.name}
              </button>
            `,
          )}
        </div>

        <div class="vitrine__panel" id="vitrine-panel" role="tabpanel" aria-labelledby="vitrine-tab-0">
          <p class="visually-hidden" id="vitrine-help">Flèches gauche et droite : produit précédent ou suivant. Touches 1 à ${data.length} : catégories.</p>
          <div class="vitrine__copy">
            <div class="vitrine__catblock">
              <p class="vitrine__kicker">Catégorie</p>
              <h3 class="vitrine__cat" data-ref="cat">${first.name}</h3>
              <p class="vitrine__desc" data-ref="desc">${first.description}</p>
            </div>
            <span class="vitrine__rule" aria-hidden="true"></span>
            <div class="vitrine__productblock">
              <p class="vitrine__pname" data-ref="pname"></p>
              <p class="vitrine__price" data-ref="price"></p>
              <div class="vitrine__formats" data-ref="formats" role="group" aria-label="Format"></div>
            </div>
            <div class="vitrine__actions">
              <button class="btn vitrine__order" type="button" data-ref="add">${icon(bagPlus)} <span data-ref="addlabel">Ajouter au panier</span></button>
              <span class="vitrine__links">
                <a class="vitrine__all" data-ref="order" href="#" target="_blank" rel="noopener">${icon(whatsapp)} Commander sur WhatsApp</a>
                <a class="vitrine__all" data-ref="all" href="#">Voir toute la catégorie ${icon(arrowRight)}</a>
              </span>
            </div>
          </div>

          <div class="vitrine__stage" data-ref="stage" tabindex="0" role="group" aria-roledescription="carrousel"
            aria-label="Produits de la catégorie" aria-describedby="vitrine-help">
            ${data.map(
              (c, ci) => html`
                <div class="vitrine__group ${ci === 0 ? 'is-current' : ''}" data-cat=${ci}>
                  ${c.products.map(
                    (p, pi) => html`
                      <figure class="vitrine__item" data-state=${ci === 0 ? itemState(pi, 0) : 'in'}>
                        <span class="vitrine__shadow" aria-hidden="true"></span>
                        ${p.image
                          ? html`<img alt=${p.image.alt} data-src=${p.image.src} decoding="async" draggable="false" />`
                          : html`<span class="vitrine__noimg" aria-hidden="true">${p.name.slice(0, 1)}</span>`}
                      </figure>
                    `,
                  )}
                </div>
              `,
            )}
          </div>

          <div class="vitrine__nav">
            <button class="vitrine__arrow" type="button" data-ref="prev">${icon(chevronLeft, { label: 'Produit précédent' })}</button>
            <p class="vitrine__count" aria-hidden="true"><span data-ref="index">1</span> / <span data-ref="total">${first.products.length}</span></p>
            <button class="vitrine__arrow" type="button" data-ref="next">${icon(chevronRight, { label: 'Produit suivant' })}</button>
          </div>
        </div>
        <p class="visually-hidden" aria-live="polite" data-ref="live"></p>
      </div>
    `,
    section,
  );

  const $ = <T extends HTMLElement = HTMLElement>(ref: string) => section.querySelector<T>(`[data-ref="${ref}"]`)!;
  const tabs = [...section.querySelectorAll<HTMLButtonElement>('.vitrine__tab')];
  const groups = [...section.querySelectorAll<HTMLElement>('.vitrine__group')];
  const copy = section.querySelector<HTMLElement>('.vitrine__copy')!;
  const panel = section.querySelector<HTMLElement>('.vitrine__panel')!;
  const items = (cat: number) => [...groups[cat]!.querySelectorAll<HTMLElement>('.vitrine__item')];
  let busy = false;
  /** Format choisi pour chaque produit (par défaut : le premier disponible). */
  const chosen = new Map<string, string>();
  const variantOf = (p: CatalogProduct) => {
    const sku = chosen.get(p.id) ?? p.variants.find((v) => v.available)?.sku ?? p.variants[0]!.sku;
    return p.variants.find((v) => v.sku === sku) ?? p.variants[0]!;
  };

  /** Charge l'image d'un produit (et précharge les voisines). */
  const ensureImages = (cat: number, around: number) => {
    items(cat).forEach((el, i) => {
      if (Math.abs(i - around) > 1 && i !== around + 2) return;
      const img = el.querySelector<HTMLImageElement>('img[data-src]');
      if (img && !img.src) img.src = img.dataset.src!;
    });
  };

  const applyColors = (cat: number) => {
    const c = data[cat]!;
    section.style.setProperty('--tint', c.tint);
    section.style.setProperty('--accent', c.color);
    section.style.setProperty('--accent-text', c.accentText);
  };

  const setStates = (cat: number, active: number) => items(cat).forEach((el, i) => (el.dataset.state = itemState(i, active)));

  const updateCopy = () => {
    const c = data[state.cat]!;
    const p = c.products[state.product]!;
    $('cat').textContent = c.name;
    $('desc').textContent = c.description;
    const v = variantOf(p);
    const price = formatFcfa(v.price);
    $('pname').textContent = p.name;
    $('price').textContent = p.variants.length > 1 ? price : `${v.label} · ${price}`;
    renderFormats(p, v.sku);
    const add = $<HTMLButtonElement>('add');
    add.disabled = !v.available;
    $('addlabel').textContent = v.available ? 'Ajouter au panier' : 'Format épuisé';
    $<HTMLAnchorElement>('order').href = orderLink(`${p.name} (${v.label})`, price);
    $<HTMLAnchorElement>('all').href = `/catalogue/${c.slug}`;
    $('index').textContent = String(state.product + 1);
    $('total').textContent = String(c.products.length);
    tabs.forEach((t, i) => {
      t.setAttribute('aria-selected', i === state.cat ? 'true' : 'false');
      t.tabIndex = i === state.cat ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `vitrine-tab-${state.cat}`);
    $('live').textContent = `${c.name} : ${p.name}, ${v.label}, ${price}. Produit ${state.product + 1} sur ${c.products.length}.`;
  };

  /** Boutons de format (seulement s'il y en a plusieurs). */
  function renderFormats(p: CatalogProduct, sku: string) {
    render(
      p.variants.length > 1
        ? html`${p.variants.map(
            (v) => html`
              <button class="vitrine__format ${v.sku === sku ? 'is-selected' : ''}" type="button" aria-pressed=${v.sku === sku ? 'true' : 'false'}
                ?disabled=${!v.available} @click=${() => {
                  chosen.set(p.id, v.sku);
                  updateCopy();
                }}>
                <span>${v.label}</span>
                <small>${v.available ? formatFcfa(v.price, { short: true }) : 'épuisé'}</small>
              </button>
            `,
          )}`
        : html``,
      $('formats'),
    );
  }

  async function play(move: Move | null) {
    if (!move) return;
    busy = true;
    const fast = reduced();
    const duration = fast ? 200 : DURATION;

    if (move.kind === 'product') {
      ensureImages(move.cat, move.to);
      copy.classList.add('is-dim');
      setStates(move.cat, move.to);
      await wait(fast ? 100 : SWAP_AT);
      updateCopy();
      copy.classList.remove('is-dim');
      await wait(duration - (fast ? 100 : SWAP_AT));
    } else {
      const out = groups[move.fromCat]!;
      const into = groups[move.toCat]!;
      ensureImages(move.toCat, move.toProduct);
      copy.classList.add('is-fade');
      applyColors(move.toCat);

      // l'ancienne catégorie sort par le haut, produit après produit
      out.classList.add('is-leaving');
      items(move.fromCat).forEach((el, i) => {
        el.style.transitionDelay = fast ? '0ms' : `${i * STAGGER}ms`;
        el.dataset.state = 'out';
      });
      // la nouvelle entre par le bas : position de départ sans transition, puis états normaux
      const incoming = items(move.toCat);
      incoming.forEach((el) => {
        el.classList.add('no-transition');
        el.style.transitionDelay = '0ms';
        el.dataset.state = 'in';
      });
      into.classList.add('is-current');
      void into.offsetWidth; // applique la position de départ avant de lancer la transition
      incoming.forEach((el, i) => {
        el.classList.remove('no-transition');
        el.style.transitionDelay = fast ? '0ms' : `${100 + i * STAGGER}ms`;
        el.dataset.state = itemState(i, move.toProduct);
      });

      await wait(fast ? 100 : SWAP_AT);
      updateCopy();
      copy.classList.remove('is-fade');
      const longest = fast ? 200 : DURATION + 100 + STAGGER * Math.max(incoming.length, items(move.fromCat).length);
      await wait(longest - (fast ? 100 : SWAP_AT));
      out.classList.remove('is-current', 'is-leaving');
      [...items(move.fromCat), ...incoming].forEach((el) => (el.style.transitionDelay = '0ms'));
    }
    busy = false;
  }

  const go = (fn: () => Move | null) => {
    if (busy) return; // clics ignorés pendant une transition
    void play(fn());
  };

  // --- Panier -------------------------------------------------------------------------------
  $('add').addEventListener('click', () => {
    const p = data[state.cat]!.products[state.product]!;
    const v = variantOf(p);
    if (!v.available) return;
    if (!addToCart(p.id, v.sku)) {
      $('live').textContent = 'Votre panier est plein (20 produits différents au maximum).';
      return;
    }
    const img = groups[state.cat]!.querySelector<HTMLImageElement>('.vitrine__item[data-state="active"] img');
    flyToCart(img, `${p.name} (${v.label}) ajouté au panier.`);
  });

  // --- Commandes ------------------------------------------------------------------------
  $('prev').addEventListener('click', () => go(() => state.prev()));
  $('next').addEventListener('click', () => go(() => state.next()));
  tabs.forEach((t, i) => t.addEventListener('click', () => go(() => state.goTo(i))));

  // la vignette du produit suivant est cliquable
  $('stage').addEventListener('click', (e) => {
    if ((e.target as Element).closest('.vitrine__item[data-state="next"]')) go(() => state.next());
  });

  // clavier : onglets (flèches, Début, Fin) ; dans la vitrine, flèches = produits, 1…n = catégories
  section.addEventListener('keydown', (e) => {
    const onTab = (e.target as Element).closest('[role="tab"]');
    if (onTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const n = data.length;
      const target = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (state.cat + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
      tabs[target]!.focus();
      go(() => state.goTo(target));
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(() => (e.key === 'ArrowRight' ? state.next() : state.prev()));
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= data.length) {
      go(() => state.goTo(Number(e.key) - 1));
    }
  });

  // balayage horizontal au doigt
  let startX = 0;
  let startY = 0;
  const stage = $('stage');
  stage.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(e.clientY - startY)) return;
    go(() => (dx < 0 ? state.next() : state.prev()));
  });

  applyColors(0);
  updateCopy();
  ensureImages(0, 0);
  section.classList.add('is-ready');
}
