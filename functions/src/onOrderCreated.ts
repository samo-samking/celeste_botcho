// Nouvelle commande passée sur le site : alerte push aux admins.
// (L'e-mail de confirmation et la vérification du total arriveront en Phase 5.)
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION } from './region.js';
import { notifyAdmins } from './push.js';

interface NewOrder {
  orderNumber: string;
  customer: { name: string; city?: string };
  items: { qty: number }[];
  total: number;
  delivery?: { zoneName?: string };
}

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/ /g, ' ')} F`;

export const onOrderCreated = onDocumentCreated({ document: 'orders/{id}', region: REGION }, async (event) => {
  const o = event.data?.data() as NewOrder | undefined;
  if (!o) return;
  const count = o.items?.reduce((n, i) => n + (i.qty ?? 0), 0) ?? 0;
  await notifyAdmins({
    title: `🛍️ Nouvelle commande · ${fcfa(o.total)}`,
    body: `${o.customer?.name ?? 'Cliente'} · ${count} article${count > 1 ? 's' : ''}${o.delivery?.zoneName ? ` · ${o.delivery.zoneName}` : ''}\n${o.orderNumber}`,
    path: '/commandes',
    tag: `order-${event.params.id}`,
  });
});
