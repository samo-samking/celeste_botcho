// Détail d'une commande (panneau latéral) : cliente, articles, totaux (avec alerte d'écart),
// historique des statuts, note interne, actions (étape suivante, annulation avec motif, paiement,
// WhatsApp, impression du bon de livraison).
import { html, nothing, type TemplateResult } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { alertTriangle, check, mapPin, phone as phoneIcon, printer, statusCancelled, whatsapp } from '@celeste/shared/icons';
import {
  nextStatus,
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  type Order,
  type OrderStatus,
  type Product,
  type WithId,
} from '@celeste/shared/models';
import { orderRepository } from '@celeste/shared/repositories/order.repository';
import { orderTotal, subtotal as itemsSubtotal } from '@celeste/shared/domain/pricing';
import { buildCustomerLink } from '@celeste/shared/services/whatsapp';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { formatPhone } from '@celeste/shared/utils/phone';
import { formatDateTime } from '../../app/format';
import { confirmDialog, openDialog, promptDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { printSlip } from './order-print';

/** Libellé du bouton qui fait passer à l'étape suivante. */
const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirmer la commande',
  preparing: 'Passer en préparation',
  shipped: 'Marquer comme expédiée',
  delivered: 'Marquer comme livrée',
};

/** Message WhatsApp proposé selon l'étape de la commande. */
export function customerMessage(o: Order): string {
  const first = o.customer.name.split(/\s+/)[0] ?? o.customer.name;
  const ref = `votre commande ${o.orderNumber}`;
  switch (o.status) {
    case 'new':
      return `Bonjour ${first}, ici Céleste Bôtchô. Nous avons bien reçu ${ref} (${formatFcfa(o.total)}). Pouvez-vous nous confirmer l'adresse de livraison : ${o.customer.address}, ${o.customer.city} ?`;
    case 'confirmed':
      return `Bonjour ${first}, ${ref} est confirmée. Nous la préparons et vous prévenons dès son départ.`;
    case 'preparing':
      return `Bonjour ${first}, ${ref} est en préparation. Livraison prévue très bientôt.`;
    case 'shipped':
      return `Bonjour ${first}, ${ref} est en route (${o.delivery.zoneName}). Montant à régler : ${formatFcfa(o.total)}.`;
    case 'delivered':
      return `Bonjour ${first}, merci pour ${ref} ! N'hésitez pas à nous écrire si vous avez la moindre question.`;
    case 'cancelled':
      return `Bonjour ${first}, ${ref} a été annulée${o.cancelReason ? ` (${o.cancelReason})` : ''}. Écrivez-nous si vous souhaitez la reprendre.`;
  }
}

/** Écarts : total incohérent, ou prix différents du catalogue actuel (information, pas une erreur). */
function discrepancies(o: Order, products: Map<string, WithId<Product>>) {
  const recomputed = orderTotal({ subtotal: itemsSubtotal(o.items), discount: o.discount, deliveryFee: o.delivery.fee });
  const priceChanges = o.items
    .map((i) => {
      const v = products.get(i.productId)?.variants.find((x) => x.sku === i.sku);
      return v && v.price !== i.unitPrice && !o.discount ? `${i.name} (${i.variantLabel}) : ${formatFcfa(i.unitPrice)} dans la commande, ${formatFcfa(v.price)} au catalogue` : null;
    })
    .filter((x): x is string => !!x);
  return { totalMismatch: recomputed !== o.total ? recomputed : null, priceChanges };
}

export function openOrderDetail(order: WithId<Order>, products: Map<string, WithId<Product>>, onChanged: () => void) {
  let o = order;
  let busy = false;
  let note = o.adminNote;
  let noteSaved = o.adminNote;

  const refresh = async () => {
    const fresh = await orderRepository.get(o.orderNumber);
    if (fresh) o = fresh;
    note = noteSaved = o.adminNote;
    draw();
    onChanged();
  };

  const act = async (fn: () => Promise<unknown>, done: string) => {
    if (busy) return;
    busy = true;
    draw();
    try {
      await fn();
      toast.success(done);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      busy = false;
      draw();
    }
  };

  const advance = async () => {
    const next = nextStatus(o.status);
    if (!next) return;
    if (next === 'confirmed') {
      const ok = await confirmDialog({
        title: 'Confirmer la commande ?',
        message: 'Le stock des formats suivis sera diminué des quantités commandées.',
        confirmLabel: 'Confirmer',
      });
      if (!ok) return;
    }
    await act(() => orderRepository.setStatus(o.orderNumber, next), `Commande ${o.orderNumber} : ${ORDER_STATUS_LABELS[next].toLowerCase()}.`);
  };

  const cancel = async () => {
    const reason = await promptDialog({
      title: `Annuler la commande ${o.orderNumber} ?`,
      message: o.stockDeducted ? 'La commande sera conservée (jamais supprimée) et le stock restitué.' : 'La commande sera conservée (jamais supprimée), avec son motif.',
      label: "Motif de l'annulation",
      placeholder: 'Ex. cliente injoignable après 3 appels',
      confirmLabel: 'Annuler la commande',
      danger: true,
      suggestions: ['Cliente injoignable', 'Annulée par la cliente', 'Adresse hors zone', 'Produit en rupture', 'Commande en double'],
    });
    if (reason) await act(() => orderRepository.setStatus(o.orderNumber, 'cancelled', { reason }), `Commande ${o.orderNumber} annulée.`);
  };

  const saveNote = () => act(() => orderRepository.setAdminNote(o.orderNumber, note), 'Note enregistrée.');

  const timeline = () => {
    const reached = new Map(o.statusHistory.map((h) => [h.status, h]));
    const steps: OrderStatus[] = o.status === 'cancelled' ? [...o.statusHistory.map((h) => h.status)] : ORDER_FLOW;
    return html`
      <ol class="od-timeline">
        ${steps.map((s) => {
          const h = reached.get(s);
          return html`<li class="od-timeline__step ${h ? 'is-done' : ''} ${s === o.status ? 'is-current' : ''} ${s === 'cancelled' ? 'is-cancelled' : ''}">
            <span class="od-timeline__dot" aria-hidden="true">${h ? icon(s === 'cancelled' ? statusCancelled : check) : nothing}</span>
            <span class="od-timeline__label">${ORDER_STATUS_LABELS[s]}</span>
            <span class="od-timeline__at">${h ? formatDateTime(h.at) : ''}</span>
          </li>`;
        })}
      </ol>
    `;
  };

  const content = (): TemplateResult => {
    const { totalMismatch, priceChanges } = discrepancies(o, products);
    const next = nextStatus(o.status);
    const finished = o.status === 'delivered' || o.status === 'cancelled';
    return html`
      <div class="od">
        <div class="od__head">
          <span class="order-pill order-pill--${o.status}">${ORDER_STATUS_LABELS[o.status]}</span>
          <span class="od__date">Passée le ${formatDateTime(o.createdAt)}</span>
        </div>

        ${totalMismatch !== null
          ? html`<p class="od-alert od-alert--danger" role="alert">${icon(alertTriangle)}<span><strong>Écart de total :</strong> la commande indique ${formatFcfa(o.total)}, le calcul donne ${formatFcfa(totalMismatch)}. Vérifiez avec la cliente avant de confirmer.</span></p>`
          : nothing}
        ${priceChanges.length
          ? html`<div class="od-alert">${icon(alertTriangle)}<div><strong>Prix différents du catalogue actuel</strong><ul>${priceChanges.map((c) => html`<li>${c}</li>`)}</ul><p>La commande garde les prix au moment où elle a été passée.</p></div></div>`
          : nothing}
        ${o.status === 'cancelled' && o.cancelReason ? html`<p class="od-alert">${icon(statusCancelled)}<span><strong>Motif :</strong> ${o.cancelReason}</span></p>` : nothing}

        <section class="od-card">
          <h3 class="od-card__title">Cliente</h3>
          <p class="od-customer__name">${o.customer.name}</p>
          <p class="od-customer__line">${icon(phoneIcon)} <a href="tel:${o.customer.phone}">${formatPhone(o.customer.phone)}</a></p>
          <p class="od-customer__line">${icon(mapPin)} ${o.customer.address}, ${o.customer.city}</p>
          ${o.customer.email ? html`<p class="od-customer__line"><a href="mailto:${o.customer.email}">${o.customer.email}</a></p>` : nothing}
          ${o.customerNote ? html`<p class="od-customer__note">« ${o.customerNote} »</p>` : nothing}
          <a class="btn btn--secondary btn--sm od-wa" href=${buildCustomerLink(o.customer.phone, customerMessage(o))} target="_blank" rel="noopener">
            ${icon(whatsapp)} Écrire à la cliente sur WhatsApp
          </a>
        </section>

        <section class="od-card">
          <h3 class="od-card__title">Articles</h3>
          <table class="od-items">
            <thead><tr><th scope="col">Produit</th><th scope="col">Qté</th><th scope="col">Prix</th><th scope="col">Total</th></tr></thead>
            <tbody>
              ${o.items.map(
                (i) => html`<tr>
                  <td><strong>${i.name}</strong><small>${i.variantLabel} · ${i.sku}</small></td>
                  <td>${i.qty}</td>
                  <td>${formatFcfa(i.unitPrice, { short: true })}</td>
                  <td>${formatFcfa(i.lineTotal, { short: true })}</td>
                </tr>`,
              )}
            </tbody>
          </table>
          <dl class="od-totals">
            <div><dt>Sous-total</dt><dd>${formatFcfa(o.subtotal)}</dd></div>
            ${o.discount ? html`<div><dt>Remise${o.promoCode ? ` (${o.promoCode})` : ''}</dt><dd>− ${formatFcfa(o.discount)}</dd></div>` : nothing}
            <div><dt>Livraison · ${o.delivery.zoneName}</dt><dd>${o.delivery.fee ? formatFcfa(o.delivery.fee) : 'Gratuite'}</dd></div>
            <div class="od-totals__total"><dt>Total</dt><dd>${formatFcfa(o.total)}</dd></div>
          </dl>
          <label class="od-paid">
            <input type="checkbox" .checked=${o.payment.status === 'paid'} ?disabled=${busy}
              @change=${(e: Event) => {
                const paid = (e.target as HTMLInputElement).checked;
                void act(() => orderRepository.setPaid(o.orderNumber, paid), paid ? 'Paiement reçu.' : 'Paiement marqué en attente.');
              }} />
            <span>${PAYMENT_LABELS[o.payment.method]} — <strong>${o.payment.status === 'paid' ? 'payée' : 'en attente'}</strong></span>
          </label>
        </section>

        <section class="od-card">
          <h3 class="od-card__title">Suivi</h3>
          ${timeline()}
        </section>

        <section class="od-card">
          <h3 class="od-card__title"><label for="od-note">Note interne</label></h3>
          <p class="od-card__hint">Visible seulement dans l’admin.</p>
          <textarea id="od-note" class="field__input field__input--multiline od-note" rows="3" maxlength="1000" placeholder="Ex. livrer après 18 h, payé par Wave…"
            .value=${note} @input=${(e: InputEvent) => { note = (e.target as HTMLTextAreaElement).value; draw(); }}></textarea>
          ${note.trim() !== noteSaved.trim()
            ? html`<button class="btn btn--secondary btn--sm" type="button" ?disabled=${busy} @click=${saveNote}>Enregistrer la note</button>`
            : nothing}
        </section>

        <div class="modal__actions od-actions">
          <button class="btn btn--secondary" type="button" @click=${() => printSlip(o)}>${icon(printer)} Bon de livraison</button>
          ${finished ? nothing : html`<button class="btn btn--danger-outline" type="button" ?disabled=${busy} @click=${cancel}>Annuler la commande</button>`}
          ${next ? html`<button class="btn btn--primary" type="button" ?disabled=${busy} @click=${advance}>${busy ? 'Enregistrement…' : NEXT_ACTION[next]}</button>` : nothing}
        </div>
      </div>
    `;
  };

  const dialog = openDialog(`Commande ${o.orderNumber}`, content(), {
    panel: true,
    wide: true,
    beforeClose: () =>
      note.trim() === noteSaved.trim() ||
      confirmDialog({ title: 'Abandonner la note ?', message: 'La note interne n’a pas été enregistrée.', confirmLabel: 'Abandonner', danger: true }),
  });
  const draw = () => dialog.update(content());
}
