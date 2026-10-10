// Vue de l'accueil : en-tête, hero piloté par le défilement, produits, étapes de commande, pied de page.
import '../../main';
import './home.css';
import './hero/hero.css';
import '../../components/site-header/site-header.css';
import './vitrine/vitrine.css';
import '../../components/cart-drawer/cart-drawer.css';
import '../../components/site-footer/site-footer.css';
import '../../components/faq/faq.css';
import '../../components/legal-dialog/legal-dialog.css';

import { html, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { bag, whatsapp } from '@celeste/shared/icons';
import { siteHeader, setHeaderState, trackSections } from '../../components/site-header/site-header';
import { initCart } from '../../components/cart-drawer/cart-entry';
import { siteFooter } from '../../components/site-footer/site-footer';
import { faqSection } from '../../components/faq/faq';
import { watchLegalHash } from '../../components/legal-dialog/legal-dialog';
import { mountLottie } from '../../components/lottie/lottie-player';
import contactBubbleUrl from '@celeste/shared/lotties/contact-bubble.json?url';
import { HERO, HERO_BLOCKS, HERO_PRODUCTS, ORDER_STEPS, WHATSAPP_MESSAGES } from './config';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { effect } from '@preact/signals-core';
import { siteContact } from '../../stores/settings.store';
import { HomeViewModel } from './home.viewmodel';
import { initHero } from './hero/hero';
import { createHeroText, heroTextTemplate } from './hero/hero-text';
import { createHeroProducts, heroProductsTemplate } from './hero/hero-products';
import { vitrineSkeleton } from './vitrine/vitrine-skeleton';

const vm = new HomeViewModel();
const pad = (n: number) => String(n).padStart(2, '0');

const NAV = [
  { href: '#produits', label: 'Produits' },
  { href: '#commander', label: 'Comment commander' },
  { href: '#contact', label: 'Contact' },
];

const heroTemplate = () => html`
  <section class="hero" aria-label="Présentation">
    <div class="hero__sticky">
      <div class="hero__media">
        <canvas class="hero__canvas" role="img" aria-label=${HERO.canvasLabel}></canvas>
        <img class="hero__still" alt=${HERO.canvasLabel} width="1280" height="720" />
        <div class="hero__edges" aria-hidden="true"></div>
        <div class="hero__mask" aria-hidden="true"></div>
      </div>
      <div class="hero__shade" aria-hidden="true"></div>
      ${heroTextTemplate(HERO_BLOCKS)} ${heroProductsTemplate(HERO_PRODUCTS)}
      <div class="hero-progress" aria-hidden="true">
        <div class="hero-progress__rail">
          <span class="hero-progress__fill"></span>
          ${HERO.stages.map((s) => html`<span class="hero-progress__mark" style="--at: ${s.debut}"></span>`)}
        </div>
        <p class="hero-progress__count">
          <span class="hero-progress__index">01</span><span class="hero-progress__total">/ ${pad(HERO.stages.length)}</span>
        </p>
        <p class="hero-progress__label">${HERO.stages[0]!.label}</p>
      </div>
    </div>
  </section>
`;

// Vitrine des catégories : squelette tout de suite, données et animation chargées à l'approche.
const vitrineTemplate = () => html`<section class="vitrine" id="produits" aria-labelledby="vitrine-title"></section>`;

const stepsTemplate = () => html`
  <section class="home-section" id="commander" aria-labelledby="commander-titre">
    <div class="container">
      <p class="home-section__kicker">Simple et rapide</p>
      <h2 class="home-section__title title-gold" id="commander-titre">Comment commander</h2>
      <ol class="steps">
        ${ORDER_STEPS.map(
          (s, i) => html`
            <li class="step">
              <span class="step__number" aria-hidden="true">${i + 1}</span>
              <h3 class="step__title">${s.titre}</h3>
              <p class="step__text">${s.texte}</p>
            </li>
          `,
        )}
      </ol>
      <div class="steps__ctas">
        <a class="btn btn--primary" href="#produits">${icon(bag)} Commander sur le site</a>
        <a class="btn btn--secondary" href=${vm.whatsappHref} target="_blank" rel="noopener">${icon(whatsapp)} Commander sur WhatsApp</a>
      </div>
    </div>
  </section>
`;

const app = document.getElementById('app')!;

render(
  html`
    <a class="skip-link" href="#produits">Aller aux produits</a>
    ${siteHeader(NAV, vm.whatsappHref)}
    <main>${heroTemplate()} ${vitrineTemplate()} ${stepsTemplate()}<div class="faq-slot"></div></main>
    <div class="footer-slot"></div>
  `,
  app,
);

// FAQ et pied de page : contenus de la Configuration (mis à jour quand ils arrivent)
const footerSlot = app.querySelector<HTMLElement>('.footer-slot')!;
const faqSlot = app.querySelector<HTMLElement>('.faq-slot')!;
effect(() => {
  const c = siteContact.value;
  const whatsappHref = buildContactLink(c.whatsappNumber, WHATSAPP_MESSAGES.general);
  render(faqSection(c.faq), faqSlot);
  render(
    siteFooter({
      phones: c.phones,
      email: c.contactEmail,
      whatsappHref,
      whatsappPhone: `+${c.whatsappNumber}`,
      socials: c.socials,
      businessHours: c.businessHours,
      slogan: c.slogan,
    }),
    footerSlot,
  );
});
// bulle animée du bandeau WhatsApp : montée une fois (le pied de page est redessiné sur place),
// jouée seulement quand elle est à l'écran ; image fixe si les animations sont réduites
const bubble = footerSlot.querySelector<HTMLElement>('.footer-cta__visual');
if (bubble) void mountLottie(bubble, contactBubbleUrl, { stillFrame: 30 });
// textes légaux : adresse directe (#cgv, #mentions-legales, #confidentialite)
watchLegalHash(() => siteContact.value.contactEmail);

// La vitrine (et le SDK Firebase) ne se charge qu'à l'approche de la section : le hero reste léger.
const vitrineEl = app.querySelector<HTMLElement>('.vitrine')!;
render(vitrineSkeleton(), vitrineEl); // même conteneur que mountVitrine : le vrai contenu remplace le squelette
const vitrineObserver = new IntersectionObserver(
  (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    vitrineObserver.disconnect();
    void import('./vitrine/vitrine-view').then((m) => m.mountVitrine(vitrineEl));
  },
  { rootMargin: '800px 0px' },
);
vitrineObserver.observe(vitrineEl);
// Le catalogue se charge pendant que la cliente regarde le hero :
// il est prêt quand elle arrive à la vitrine (sinon : protection anti-robots + Firestore ≈ 4 s d'attente).
const prefetchCatalog = () => void import('../../stores/catalog.store').then((m) => m.loadCatalog()).catch(() => undefined);
// dès la fin du chargement de la page (attendre le repos serait trop tard : l'animation du hero l'occupe)
if (document.readyState === 'complete') prefetchCatalog();
else window.addEventListener('load', prefetchCatalog, { once: true });

// --- Animation du hero (le DOM ci-dessus est rendu une seule fois)
const header = app.querySelector<HTMLElement>('.site-header')!;
const heroEl = app.querySelector<HTMLElement>('.hero')!;
const sticky = heroEl.querySelector<HTMLElement>('.hero__sticky')!;
const progressFill = heroEl.querySelector<HTMLElement>('.hero-progress__fill')!;
const progressMarks = [...heroEl.querySelectorAll<HTMLElement>('.hero-progress__mark')];
const progressIndex = heroEl.querySelector<HTMLElement>('.hero-progress__index')!;
const progressLabel = heroEl.querySelector<HTMLElement>('.hero-progress__label')!;
trackSections(header);
initCart(header); // compteur du panier ; le panneau se charge à la première ouverture
const products = createHeroProducts(sticky);
// hero est créé juste après ; scrollToProgress ne sert qu'au clavier, bien plus tard
const text = createHeroText(heroEl.querySelector<HTMLElement>('.hero__text')!, HERO_BLOCKS, (p) => hero.scrollToProgress(p));
let activeStage = -1;

const hero = initHero(heroEl, (p) => {
  text.update(p);
  products.update(p);
  if (p === null) {
    // animation désactivée : tout est dans le flux, le bouton WhatsApp reste visible
    setHeaderState(header, { showWhatsapp: true, solid: true });
    return;
  }
  let stage = 0;
  HERO.stages.forEach((s, i) => {
    if (p >= s.debut) stage = i;
  });
  progressFill.style.transform = `scaleY(${p.toFixed(4)})`;
  if (stage !== activeStage) {
    progressMarks.forEach((m, i) => {
      m.classList.toggle('is-active', i === stage);
      m.classList.toggle('is-passed', i < stage);
    });
    progressIndex.textContent = pad(stage + 1);
    progressLabel.textContent = HERO.stages[stage]!.label;
    activeStage = stage;
  }
  setHeaderState(header, { showWhatsapp: p >= 0.999, solid: p >= 0.999 });
});
