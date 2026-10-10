// Bon de livraison imprimable : une page A5/A4 sobre (noir sur blanc), imprimée via la feuille de
// style @media print (orders.css) ; seul le bon est visible à l'impression.
import { html, nothing, render } from 'lit-html';
import { PAYMENT_LABELS, type Order } from '@celeste/shared/models';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { formatPhone } from '@celeste/shared/utils/phone';
import { formatDateTime } from '../../app/format';

export function printSlip(o: Order) {
  let host = document.getElementById('print-slip');
  if (!host) {
    host = document.createElement('div');
    host.id = 'print-slip';
    document.body.append(host);
  }
  render(
    html`
      <article class="slip">
        <header class="slip__head">
          <img src="/brand/logo.png" alt="Céleste Bôtchô" />
          <div>
            <p class="slip__title">Bon de livraison</p>
            <p><strong>${o.orderNumber}</strong> · ${formatDateTime(o.createdAt)}</p>
          </div>
        </header>
        <section class="slip__block">
          <p class="slip__label">Cliente</p>
          <p><strong>${o.customer.name}</strong> · ${formatPhone(o.customer.phone)}</p>
          <p>${o.customer.address}, ${o.customer.city}</p>
          <p>Zone : ${o.delivery.zoneName}</p>
          ${o.customerNote ? html`<p>Note : ${o.customerNote}</p>` : nothing}
        </section>
        <table class="slip__items">
          <thead><tr><th>Article</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead>
          <tbody>
            ${o.items.map((i) => html`<tr><td>${i.name} — ${i.variantLabel}</td><td>${i.qty}</td><td>${formatFcfa(i.unitPrice, { short: true })}</td><td>${formatFcfa(i.lineTotal, { short: true })}</td></tr>`)}
          </tbody>
        </table>
        <dl class="slip__totals">
          <div><dt>Sous-total</dt><dd>${formatFcfa(o.subtotal)}</dd></div>
          ${o.discount ? html`<div><dt>Remise</dt><dd>− ${formatFcfa(o.discount)}</dd></div>` : nothing}
          <div><dt>Livraison</dt><dd>${formatFcfa(o.delivery.fee)}</dd></div>
          <div class="slip__total"><dt>${o.payment.status === 'paid' ? 'Total (payé)' : 'À encaisser'}</dt><dd>${formatFcfa(o.total)}</dd></div>
        </dl>
        <p class="slip__pay">${PAYMENT_LABELS[o.payment.method]}</p>
        <footer class="slip__sign">
          <div>Signature de la cliente</div>
          <div>Date et heure de remise</div>
        </footer>
      </article>
    `,
    host,
  );
  window.print();
}
