// Commande depuis le panier, en plein écran : formulaire (coordonnées, zone, paiement, CGV) et récapitulatif ; calcul sur
// le catalogue relu dans Firestore (jamais sur les prix affichés), enregistrement, confirmation avec
// le numéro de commande et l'envoi du récapitulatif sur WhatsApp. Coordonnées retenues sur le téléphone.
import { html, nothing } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { computed, signal } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, arrowLeft, bag, check, home, mapPin, phone, sigCash, sigMobileMoney, user, whatsapp } from '@celeste/shared/icons';
import type { DeliveryZone, PaymentMethod, Promotion } from '@celeste/shared/models';
import { quoteOrder, type CheckoutQuote } from '@celeste/shared/domain/checkout';
import { DELIVERY_MODE_LABELS } from '@celeste/shared/domain/delivery';
import { CHECKOUT_LIMITS, validateCheckout, type CheckoutInput } from '@celeste/shared/validation/order.validation';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { formatPhone } from '@celeste/shared/utils/phone';
import { cartLines, cartOpen, clearCart } from '../../stores/cart.store';
import { refreshCatalog, type Catalog } from '../../stores/catalog.store';
import { settingsReady, siteContact } from '../../stores/settings.store';
import { openLegal } from '../legal-dialog/legal-dialog';

export type CheckoutStep = 'cart' | 'form' | 'done';
export const step = signal<CheckoutStep>('cart');

/** Zone utilisée tant qu'aucune n'est configurée dans l'admin : frais convenus ensuite. */
const ZONE_TO_AGREE: DeliveryZone = { id: 'a-convenir', name: 'Frais de livraison à convenir', mode: 'local', fee: 0 };
const SAVED_KEY = 'cb-customer-v1';

type Form = Omit<CheckoutInput, 'consent'> & { consent: boolean };

function savedCustomer(): Partial<Form> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '{}') as Partial<Form>;
  } catch {
    return {};
  }
}

const form = signal<Form>({ name: '', phone: '', zoneId: '', city: '', address: '', note: '', payment: 'cash_on_delivery', consent: false });
const errors = signal<Record<string, string>>({});
const fresh = signal<Catalog | null>(null);
const promos = signal<Promotion[]>([]);
const loading = signal(false);
const submitting = signal(false);
const failure = signal<string | null>(null);
const done = signal<{ orderNumber: string; total: number; whatsapp: string } | null>(null);

const zones = computed(() => (siteContact.value.deliveryZones.length ? siteContact.value.deliveryZones : [ZONE_TO_AGREE]));
const zone = computed(() => zones.value.find((z) => z.id === form.value.zoneId) ?? null);

export const quote = computed<CheckoutQuote | null>(() => {
  const c = fresh.value;
  if (!c) return null;
  return quoteOrder({ lines: cartLines.value, products: c.products, promos: promos.value, zone: zone.value }); // promotions automatiques
});

const set = <K extends keyof Form>(key: K, value: Form[K]) => {
  form.value = { ...form.value, [key]: value };
  if (errors.value[key]) {
    const rest = { ...errors.value };
    delete rest[key];
    errors.value = rest;
  }
};

/** Passe au formulaire : relit le catalogue, les promos et les zones (prix et stocks du moment). */
export async function startCheckout() {
  step.value = 'form';
  failure.value = null;
  form.value = { ...form.value, ...savedCustomer(), consent: false };
  loading.value = true;
  try {
    const [catalog, active] = await Promise.all([
      refreshCatalog(),
      import('@celeste/shared/repositories/promotion.repository').then((m) => m.promotionRepository.listActive()).catch(() => []),
      settingsReady(),
    ]);
    fresh.value = catalog;
    promos.value = active;
    if (!zones.value.some((z) => z.id === form.value.zoneId)) set('zoneId', zones.value.length === 1 ? zones.value[0]!.id : '');
  } catch {
    failure.value = 'Impossible de préparer la commande. Vérifiez votre connexion, puis réessayez.';
  } finally {
    loading.value = false;
  }
}

/** Après la commande : ferme l'écran de confirmation et remonte en haut de la boutique. */
function backToShop() {
  cartOpen.value = false;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }), 300);
}

export function backToCart() {
  step.value = 'cart';
  errors.value = {};
}

/** Après la confirmation, le panneau revient au panier (vide) à sa prochaine ouverture. */
export function resetCheckout() {
  if (step.value === 'done') {
    step.value = 'cart';
    done.value = null;
  }
}

function summaryMessage(orderNumber: string, q: CheckoutQuote, f: Form, z: DeliveryZone) {
  const lines = q.items.map((i) => `• ${i.qty} × ${i.name} (${i.variantLabel})`).join('\n');
  return [
    `Bonjour Céleste Bôtchô, je viens de passer la commande ${orderNumber} sur le site :`,
    lines,
    q.discount ? `Remise : −${formatFcfa(q.discount)}` : '',
    `Livraison : ${z.name}${z.fee ? ` (${formatFcfa(z.fee)})` : ''}`,
    `Total : ${formatFcfa(q.total)}`,
    `Adresse : ${f.address}, ${f.city}`,
    `${f.name} · ${f.phone}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function submit() {
  const f = form.value;
  const checked = validateCheckout(f);
  if (!checked.ok) {
    errors.value = checked.errors;
    queueMicrotask(() => document.querySelector<HTMLElement>('.checkout [aria-invalid="true"], .checkout .is-error input')?.focus());
    return;
  }
  submitting.value = true;
  failure.value = null;
  try {
    // dernière relecture : la commande part avec les prix et les stocks de cet instant
    fresh.value = await refreshCatalog();
    const q = quote.value!;
    const z = zone.value!;
    if (!q.items.length) throw new Error('Les produits de votre panier ne sont plus disponibles.');
    const c = checked.value;
    const { checkoutRepository } = await import('@celeste/shared/repositories/checkout.repository');
    const orderNumber = await checkoutRepository.create({
      customer: { name: c.name, phone: c.phone, city: c.city, address: c.address, email: null },
      items: q.items,
      subtotal: q.subtotal,
      discount: q.discount,
      promoCode: q.promoCode,
      delivery: { mode: z.mode, zoneId: z.id, zoneName: z.name, fee: z.fee },
      total: q.total,
      payment: { method: c.payment, status: 'pending' },
      customerNote: c.note,
    });
    try {
      const { name, phone: tel, zoneId, city, address, payment } = c;
      localStorage.setItem(SAVED_KEY, JSON.stringify({ name, phone: formatPhone(tel), zoneId, city, address, payment }));
    } catch {
      /* sans conséquence */
    }
    done.value = {
      orderNumber,
      total: q.total,
      whatsapp: buildContactLink(siteContact.value.whatsappNumber, summaryMessage(orderNumber, q, { ...f, phone: formatPhone(c.phone) }, z)),
    };
    clearCart();
    form.value = { ...form.value, note: '', consent: false };
    step.value = 'done';
  } catch (e) {
    failure.value =
      e instanceof Error && e.message.startsWith('Les produits')
        ? e.message
        : 'La commande n’a pas pu être envoyée. Vérifiez votre connexion et réessayez, ou commandez sur WhatsApp.';
  } finally {
    submitting.value = false;
  }
}

// --- Gabarits ---------------------------------------------------------------------------------
const field = (id: keyof Form, label: string, input: unknown, hint?: string) => html`
  <div class="ck-field ${errors.value[id] ? 'is-error' : ''}">
    <label class="ck-field__label" for="ck-${id}">${label}</label>
    ${input}
    ${errors.value[id] ? html`<p class="ck-field__error" id="ck-${id}-error">${icon(alertCircle)} ${errors.value[id]}</p>` : hint ? html`<p class="ck-field__hint">${hint}</p>` : nothing}
  </div>
`;
const text = (id: 'name' | 'phone' | 'city' | 'address', opts: { autocomplete: string; inputmode?: string; placeholder: string; max: number; ico: string }) => html`
  <span class="ck-input">
    ${icon(opts.ico)}
    <input id="ck-${id}" type=${id === 'phone' ? 'tel' : 'text'} autocomplete=${opts.autocomplete} inputmode=${opts.inputmode ?? 'text'}
      maxlength=${opts.max} placeholder=${opts.placeholder} .value=${live(form.value[id])}
      aria-invalid=${errors.value[id] ? 'true' : 'false'} aria-describedby=${errors.value[id] ? `ck-${id}-error` : nothing}
      @input=${(e: InputEvent) => set(id, (e.target as HTMLInputElement).value)} />
  </span>
`;

export function checkoutBody() {
  if (step.value === 'done') return doneTemplate();
  if (loading.value && !fresh.value) return html`<div class="checkout checkout--loading" aria-busy="true"><p role="status">Préparation de votre commande…</p></div>`;
  const q = quote.value;
  const f = form.value;
  const list = zones.value;
  const modes = (['local', 'shipping'] as const).filter((m) => list.some((z) => z.mode === m));
  return html`
    <div class="ck-layout">
    <form class="checkout" novalidate @submit=${(e: SubmitEvent) => { e.preventDefault(); void submit(); }} id="checkout-form">
      <button class="checkout__back" type="button" @click=${backToCart}>${icon(arrowLeft)} Retour au panier</button>
      ${q?.unavailable.length
        ? html`<p class="checkout__alert" role="alert">${icon(alertCircle)} ${q.unavailable.length > 1 ? `${q.unavailable.length} articles ne sont plus disponibles et ne seront pas commandés.` : 'Un article n’est plus disponible et ne sera pas commandé.'}</p>`
        : nothing}

      <fieldset class="checkout__group">
        <legend>Vos coordonnées</legend>
        ${field('name', 'Nom et prénom', text('name', { autocomplete: 'name', placeholder: 'Awa Koné', max: CHECKOUT_LIMITS.name, ico: user }))}
        ${field('phone', 'Téléphone', text('phone', { autocomplete: 'tel', inputmode: 'tel', placeholder: '07 07 00 00 00', max: 20, ico: phone }), 'Le livreur vous appellera à ce numéro.')}
      </fieldset>

      <fieldset class="checkout__group">
        <legend>Livraison</legend>
        ${field(
          'zoneId',
          'Zone de livraison',
          html`<span class="ck-input ck-input--select">
            ${icon(mapPin)}
            <select id="ck-zoneId" .value=${live(f.zoneId)} aria-invalid=${errors.value.zoneId ? 'true' : 'false'}
              @change=${(e: Event) => set('zoneId', (e.target as HTMLSelectElement).value)}>
              <option value="" ?selected=${!f.zoneId}>Choisir…</option>
              ${modes.map(
                (m) => html`<optgroup label=${DELIVERY_MODE_LABELS[m]}>
                  ${list.filter((z) => z.mode === m).map((z) => html`<option value=${z.id} ?selected=${f.zoneId === z.id}>${z.name}${z.fee ? ` — ${formatFcfa(z.fee, { short: true })}` : z.id === ZONE_TO_AGREE.id ? '' : ' — offerte'}</option>`)}
                </optgroup>`,
              )}
            </select>
          </span>`,
          zone.value?.id === ZONE_TO_AGREE.id ? 'Nous vous indiquerons les frais de livraison en confirmant la commande.' : undefined,
        )}
        ${field('city', 'Commune ou ville', text('city', { autocomplete: 'address-level2', placeholder: 'Cocody', max: CHECKOUT_LIMITS.city, ico: mapPin }))}
        ${field(
          'address',
          'Adresse et repères',
          html`<textarea id="ck-address" class="ck-textarea" rows="2" maxlength=${CHECKOUT_LIMITS.address} autocomplete="street-address"
            placeholder="Riviera 2, près de la pharmacie…" .value=${live(f.address)} aria-invalid=${errors.value.address ? 'true' : 'false'}
            @input=${(e: InputEvent) => set('address', (e.target as HTMLTextAreaElement).value)}></textarea>`,
        )}
        ${field(
          'note',
          'Note pour la livraison (facultatif)',
          html`<textarea id="ck-note" class="ck-textarea" rows="2" maxlength=${CHECKOUT_LIMITS.note} placeholder="Appeler avant de passer, livrer après 18 h…"
            .value=${live(f.note)} @input=${(e: InputEvent) => set('note', (e.target as HTMLTextAreaElement).value)}></textarea>`,
        )}
      </fieldset>

      <fieldset class="checkout__group">
        <legend>Paiement</legend>
        <div class="ck-pay" role="radiogroup">
          ${([
            ['cash_on_delivery', 'À la livraison', 'En espèces, à la réception du colis.', sigCash],
            ['mobile_money', 'Mobile money', 'Modalités convenues avec vous sur WhatsApp.', sigMobileMoney],
          ] as [PaymentMethod, string, string, string][]).map(
            ([value, label, desc, ico]) => html`<label class="ck-pay__opt ${f.payment === value ? 'is-active' : ''}">
              <input type="radio" name="ck-payment" .checked=${f.payment === value} @change=${() => set('payment', value)} />
              <span class="ck-pay__icon" aria-hidden="true">${icon(ico, { size: 34 })}</span>
              <span><strong>${label}</strong><small>${desc}</small></span>
            </label>`,
          )}
        </div>
      </fieldset>


      <label class="ck-consent ${errors.value.consent ? 'is-error' : ''}">
        <input type="checkbox" .checked=${f.consent} @change=${(e: Event) => set('consent', (e.target as HTMLInputElement).checked)} />
        <span>J’accepte les <a href="#cgv" @click=${(e: MouseEvent) => { e.preventDefault(); openLegal('cgv', siteContact.value.contactEmail); }}>conditions de vente</a>
          et la <a href="#confidentialite" @click=${(e: MouseEvent) => { e.preventDefault(); openLegal('confidentialite', siteContact.value.contactEmail); }}>politique de confidentialité</a>.</span>
      </label>
      ${errors.value.consent ? html`<p class="ck-field__error">${icon(alertCircle)} ${errors.value.consent}</p>` : nothing}
      ${failure.value ? html`<p class="checkout__alert" role="alert">${icon(alertCircle)} ${failure.value}</p>` : nothing}
    </form>
    ${summary()}
    </div>
  `;
}

/** Récapitulatif (à droite sur ordinateur, en bas sur téléphone) : articles, totaux, confirmation. */
function summary() {
  const q = quote.value;
  if (!q) return nothing;
  const z = zone.value;
  const byId = fresh.value?.byId;
  return html`
    <aside class="ck-summary" aria-labelledby="ck-summary-title">
      <h3 class="ck-summary__title" id="ck-summary-title">Votre commande</h3>
      <ul class="ck-items">
        ${q.items.map((i) => {
          const product = byId?.get(i.productId);
          const photo = product?.variants.find((v) => v.sku === i.sku)?.image ?? product?.image;
          return html`<li class="ck-item">
            <span class="ck-item__thumb">${photo ? html`<img src=${photo.src} alt="" loading="lazy" />` : icon(bag)}<span class="ck-item__qty">${i.qty}</span></span>
            <span class="ck-item__name">${i.name}<small>${i.variantLabel}</small></span>
            <span class="ck-item__price">${formatFcfa(i.lineTotal, { short: true })}</span>
          </li>`;
        })}
      </ul>
      <div class="ck-summary__totals">
      <div class="cart__row"><span>Sous-total</span><strong>${formatFcfa(q.subtotal)}</strong></div>
      ${q.discount ? html`<div class="cart__row cart__row--discount"><span>Promotion</span><strong>−${formatFcfa(q.discount)}</strong></div>` : nothing}
      <div class="cart__row cart__row--muted"><span>Livraison</span><span>${z ? (z.id === ZONE_TO_AGREE.id ? 'À convenir' : z.fee ? formatFcfa(z.fee) : 'Offerte') : 'Choisissez votre zone'}</span></div>
      <div class="cart__row cart__row--total"><span>Total</span><strong>${formatFcfa(q.total)}</strong></div>
      </div>
      <div class="ck-summary__actions">
      <button class="btn btn--primary cart__order" type="submit" form="checkout-form" ?disabled=${submitting.value || !q.items.length}>
        ${submitting.value ? 'Envoi de la commande…' : `Confirmer la commande · ${formatFcfa(q.total, { short: true })}`}
      </button>
      <p class="checkout__reassure">Rien à payer maintenant : vous réglez à la livraison.</p>
      </div>
    </aside>
  `;
}

function doneTemplate() {
  const d = done.value;
  if (!d) return nothing;
  return html`
    <div class="checkout-done" role="status">
      <span class="checkout-done__icon" aria-hidden="true">${icon(check)}</span>
      <p class="checkout-done__title">Merci, votre commande est envoyée !</p>
      <p class="checkout-done__number">N° <strong>${d.orderNumber}</strong></p>
      <p class="checkout-done__text">Total : <strong>${formatFcfa(d.total)}</strong>, à régler à la livraison. Nous vous contactons très vite pour confirmer.</p>
      <a class="btn btn--primary checkout-done__wa" href=${d.whatsapp} target="_blank" rel="noopener">${icon(whatsapp)} Envoyer le récapitulatif sur WhatsApp</a>
      <p class="checkout-done__hint">Conseillé : la confirmation est encore plus rapide.</p>
      <button class="btn btn--secondary checkout-done__home" type="button" @click=${backToShop}>${icon(home)} Retour à la boutique</button>
    </div>
  `;
}

/** Téléphone : barre fixe en bas de l'écran (total + confirmation), visible pendant toute la saisie. */
export function checkoutBar() {
  const q = quote.value;
  if (step.value !== 'form' || !q) return nothing;
  return html`
    <div class="ck-bar">
      <span class="ck-bar__total"><small>Total</small><strong>${formatFcfa(q.total, { short: true })}</strong></span>
      <button class="btn btn--primary ck-bar__btn" type="submit" form="checkout-form" ?disabled=${submitting.value || !q.items.length}>
        ${submitting.value ? 'Envoi…' : 'Confirmer la commande'}
      </button>
    </div>
  `;
}

