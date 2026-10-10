// Vue de la vitrine des catégories : rendu unique, puis animation par classes et data-state.
// Relais entre produits (le produit actif s'envole, la vignette du suivant grandit jusqu'au centre),
// changement de catégorie (sortie échelonnée par le haut, entrée par le bas, couleur de fond qui fond).
import { html, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { bagPlus, chevronLeft, chevronRight, whatsapp } from '@celeste/shared/icons';
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
        <p class="vitrine__kicker" id="vitrine-tabs-label">Catégorie</p>
        <div class="vitrine__tabs" role="tablist" aria-labelledby="vitrine-tabs-label">
          <span class="vitrine__pill" aria-hidden="true"></span>
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
          <!-- à gauche : la catégorie seule -->
          <div class="vitrine__copy">
            <h3 class="vitrine__cat" data-ref="cat">${first.name}</h3>
            <p class="vitrine__desc" data-ref="desc">${first.description}</p>
            <span class="vitrine__rule" aria-hidden="true"></span>
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

          <!-- à droite de la photo : la carte du produit affiché -->
          <div class="vitrine__card">
            <p class="vitrine__pname" data-ref="pname"></p>
            <p class="vitrine__price" data-ref="price"></p>
            <div class="vitrine__formats" data-ref="formats" role="group" aria-label="Format"></div>
            <p class="vitrine__vdesc" data-ref="vdesc"></p>
            <button class="btn vitrine__order" type="button" data-ref="add">${icon(bagPlus)} <span data-ref="addlabel">Ajouter au panier</span></button>
            <a class="vitrine__all vitrine__wa" data-ref="order" href="#" target="_blank" rel="noopener">${icon(whatsapp)} Commander sur WhatsApp</a>
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
  const tablist = section.querySelector<HTMLElement>('.vitrine__tabs')!;

  /** Place la pastille sous l'onglet actif (elle glisse grâce à la transition CSS). */
  const placePill = () => {
    const tab = tabs[state.cat];
    if (!tab) return;
    tablist.style.setProperty('--pill-x', `${tab.offsetLeft}px`);
    tablist.style.setProperty('--pill-w', `${tab.offsetWidth}px`);
    tablist.classList.toggle('is-scrollable', tablist.scrollWidth > tablist.clientWidth + 1);
    // liste plus large que l'écran (mobile) : l'onglet actif reste visible
    const left = tab.offsetLeft - tablist.clientWidth / 2 + tab.offsetWidth / 2;
    tablist.scrollTo({ left: Math.max(0, left), behavior: reduced() ? 'auto' : 'smooth' });
  };
  new ResizeObserver(placePill).observe(tablist);
  void document.fonts?.ready.then(placePill); // la largeur des onglets change quand la police arrive
  const groups = [...section.querySelectorAll<HTMLElement>('.vitrine__group')];
  const copy = section.querySelector<HTMLElement>('.vitrine__copy')!;
  const card = section.querySelector<HTMLElement>('.vitrine__card')!;
  const panel = section.querySelector<HTMLElement>('.vitrine__panel')!;
  const items = (cat: number) => [...groups[cat]!.querySelectorAll<HTMLElement>('.vitrine__item')];
  let busy = false;
  /** Format choisi pour chaque produit (par défaut : le premier disponible). */
  const chosen = new Map<string, string>();
  const variantOf = (p: CatalogProduct) => {
    const sku = chosen.get(p.id) ?? p.variants.find((v) => v.available)?.sku ?? p.variants[0]!.sku;
    return p.variants.find((v) => v.sku === sku) ?? p.variants[0]!;
  };

  /** Photo à montrer : celle du format choisi par la cliente, sinon la photo principale du produit. */
  const photoOf = (p: CatalogProduct) => (chosen.has(p.id) ? variantOf(p).image : null) ?? p.image;

  /** Remplace en fondu la photo du produit affiché quand on change de format. */
  const showPhoto = (cat: number, index: number) => {
    const p = data[cat]!.products[index]!;
    const target = photoOf(p);
    const img = items(cat)[index]?.querySelector<HTMLImageElement>('img');
    if (!target || !img || img.dataset.src === target.src) return;
    img.dataset.src = target.src;
    const swap = () => {
      img.src = target.src;
      img.alt = target.alt;
      img.classList.remove('is-swapping');
    };
    // la nouvelle photo est chargée AVANT le fondu : l'ancienne reste visible en attendant
    const next = new Image();
    next.src = target.src;
    void next
      .decode()
      .catch(() => undefined)
      .then(async () => {
        if (img.dataset.src !== target.src) return; // un autre format a été choisi entre-temps
        if (!reduced()) {
          img.classList.add('is-swapping');
          await wait(180);
          if (img.dataset.src !== target.src) return;
        }
        swap();
      });
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

  /** Remplace un texte : l'ancien monte et s'efface, le nouveau arrive par le bas. */
  const rollText = (el: HTMLElement, text: string) => {
    if (el.textContent === text) return;
    el.getAnimations().forEach((a) => a.cancel());
    if (reduced()) {
      el.textContent = text;
      return;
    }
    const out = el.animate(
      [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-45%)', opacity: 0 }],
      { duration: 140, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    );
    out.onfinish = () => {
      el.textContent = text;
      out.cancel();
      el.animate(
        [{ transform: 'translateY(45%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    };
  };

  /** Remplace la description du format en fondu, la hauteur s'ajuste en douceur (pas de saut). */
  const fadeBlock = (el: HTMLElement, text: string) => {
    if (el.textContent === text) return;
    el.getAnimations().forEach((a) => a.cancel());
    const from = el.offsetHeight;
    el.textContent = text;
    if (reduced() || !text) return;
    const to = el.offsetHeight;
    el.animate(
      [
        { blockSize: `${from}px`, opacity: 0, transform: 'translateY(6px)', overflow: 'hidden' },
        { blockSize: `${to}px`, opacity: 1, transform: 'none', overflow: 'hidden' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  };

  /** `animate` : changement de format dans la carte (sinon la carte est déjà en fondu). */
  const updateCopy = (animate = false) => {
    const c = data[state.cat]!;
    const p = c.products[state.product]!;
    $('cat').textContent = c.name;
    $('desc').textContent = c.description;
    const v = variantOf(p);
    const price = formatFcfa(v.price);
    $('pname').textContent = p.name;
    const priceText = p.variants.length > 1 ? price : `${v.label} · ${price}`;
    // description de la photo du format choisi (« Petit pot transparent de 30 boules… »)
    const photo = chosen.has(p.id) ? v.image : null;
    const vdesc = photo && photo.alt !== p.name ? photo.alt : '';
    if (animate) {
      rollText($('price'), priceText);
      fadeBlock($('vdesc'), vdesc);
    } else {
      $('price').textContent = priceText;
      $('vdesc').textContent = vdesc;
    }
    renderFormats(p, v.sku);
    placeFormatPill(p.id);
    const add = $<HTMLButtonElement>('add');
    add.disabled = !v.available;
    $('addlabel').textContent = v.available ? 'Ajouter au panier' : 'Format épuisé';
    $<HTMLAnchorElement>('order').href = orderLink(`${p.name} (${v.label})`, price);
    $('index').textContent = String(state.product + 1);
    $('total').textContent = String(c.products.length);
    tabs.forEach((t, i) => {
      t.setAttribute('aria-selected', i === state.cat ? 'true' : 'false');
      t.tabIndex = i === state.cat ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `vitrine-tab-${state.cat}`);
    placePill();
    $('live').textContent = `${c.name} : ${p.name}, ${v.label}, ${price}. Produit ${state.product + 1} sur ${c.products.length}.`;
  };

  /** Pastille derrière le format choisi : elle glisse d'un format à l'autre, saute d'un produit à l'autre. */
  let pillProduct = '';
  function placeFormatPill(productId: string) {
    const box = $('formats');
    const chip = box.querySelector<HTMLElement>('.vitrine__format.is-selected');
    if (!chip) return;
    box.classList.toggle('is-jump', productId !== pillProduct);
    pillProduct = productId;
    box.style.setProperty('--fx', `${chip.offsetLeft}px`);
    box.style.setProperty('--fy', `${chip.offsetTop}px`);
    box.style.setProperty('--fw', `${chip.offsetWidth}px`);
    box.style.setProperty('--fh', `${chip.offsetHeight}px`);
  }
  new ResizeObserver(() => placeFormatPill(pillProduct)).observe($('formats'));

  /** Boutons de format (seulement s'il y en a plusieurs). */
  function renderFormats(p: CatalogProduct, sku: string) {
    render(
      p.variants.length > 1
        ? html`<span class="vitrine__fpill" aria-hidden="true"></span>${p.variants.map(
            (v) => html`
              <button class="vitrine__format ${v.sku === sku ? 'is-selected' : ''}" type="button" aria-pressed=${v.sku === sku ? 'true' : 'false'}
                ?disabled=${!v.available} @click=${() => {
                  if (variantOf(p).sku === v.sku && chosen.has(p.id)) return;
                  chosen.set(p.id, v.sku);
                  updateCopy(true);
                  showPhoto(state.cat, state.product);
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
      card.classList.add('is-dim');
      setStates(move.cat, move.to);
      await wait(fast ? 100 : SWAP_AT);
      updateCopy();
      card.classList.remove('is-dim');
      await wait(duration - (fast ? 100 : SWAP_AT));
    } else {
      const out = groups[move.fromCat]!;
      const into = groups[move.toCat]!;
      ensureImages(move.toCat, move.toProduct);
      copy.classList.add('is-fade');
      card.classList.add('is-fade');
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
      card.classList.remove('is-fade');
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
