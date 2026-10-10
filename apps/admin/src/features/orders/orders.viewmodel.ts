// ViewModel des Commandes : commandes en cours en temps réel (alerte à chaque nouvelle commande),
// historique filtré et paginé, recherche par numéro ou téléphone, export CSV, actions sur une commande.
import { computed, signal } from '@preact/signals-core';
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, type Order, type OrderStatus, type Product, type WithId } from '@celeste/shared/models';
import { orderRepository, type HistoryFilter, type OrdersPage } from '@celeste/shared/repositories/order.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';
import { normalizeOrderNumber } from '@celeste/shared/utils/order-number';
import { normalizePhone } from '@celeste/shared/utils/phone';

export type OrdersTab = 'active' | 'history';
export type Period = 'today' | '7d' | 'month' | 'all' | 'custom';

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function periodRange(period: Period, custom: { from: Date | null; to: Date | null }): { from?: Date; to?: Date } {
  const today = startOfDay();
  switch (period) {
    case 'today':
      return { from: today };
    case '7d':
      return { from: new Date(today.getTime() - 6 * 86_400_000) };
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1) };
    case 'custom':
      return {
        from: custom.from ?? undefined,
        to: custom.to ? new Date(custom.to.getTime() + 86_400_000) : undefined, // fin incluse
      };
    case 'all':
      return {};
  }
}

export class OrdersViewModel {
  readonly tab = signal<OrdersTab>('active');

  // --- En cours (temps réel)
  readonly active = signal<WithId<Order>[]>([]);
  readonly activeLoading = signal(true);
  readonly activeError = signal<string | null>(null);
  readonly activeFilter = signal<OrderStatus | 'all'>('all');
  /** Numéros arrivés depuis l'ouverture de l'écran (mis en évidence). */
  readonly fresh = signal<Set<string>>(new Set());
  readonly newCount = computed(() => this.active.value.filter((o) => o.status === 'new').length);
  readonly activeShown = computed(() =>
    this.activeFilter.value === 'all' ? this.active.value : this.active.value.filter((o) => o.status === this.activeFilter.value),
  );

  // --- Historique
  readonly history = signal<WithId<Order>[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly status = signal<OrderStatus | ''>('');
  readonly period = signal<Period>('month');
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);
  readonly hasMore = signal(false);
  private cursor: OrdersPage['cursor'] = null;

  // --- Recherche
  readonly search = signal('');
  readonly searchResults = signal<WithId<Order>[] | null>(null);
  readonly searching = signal(false);

  /** Catalogue actuel : comparaison des prix d'une commande avec les prix du jour. */
  products: Map<string, WithId<Product>> = new Map();

  private stop: (() => void) | null = null;
  private seen: Set<string> | null = null;

  startLive(onNewOrders: (orders: WithId<Order>[]) => void) {
    this.stop?.();
    this.activeLoading.value = true;
    this.stop = orderRepository.watchActive(
      (orders) => {
        this.activeLoading.value = false;
        this.activeError.value = null;
        // première réception : référence ; ensuite, toute commande « nouvelle » inconnue déclenche l'alerte
        if (this.seen) {
          const arrived = orders.filter((o) => o.status === 'new' && !this.seen!.has(o.id));
          if (arrived.length) {
            this.fresh.value = new Set([...this.fresh.value, ...arrived.map((o) => o.id)]);
            onNewOrders(arrived);
          }
        }
        this.seen = new Set([...(this.seen ?? []), ...orders.map((o) => o.id)]);
        this.active.value = orders;
      },
      () => {
        this.activeLoading.value = false;
        this.activeError.value = 'Connexion perdue avec les commandes en cours. Elles se mettront à jour dès le retour du réseau.';
      },
    );
    void productRepository
      .listAll()
      .then((list) => (this.products = new Map(list.map((p) => [p.id, p]))))
      .catch(() => undefined);
  }

  stopLive() {
    this.stop?.();
    this.stop = null;
  }

  private filter(): HistoryFilter {
    return { status: this.status.value || undefined, ...periodRange(this.period.value, { from: this.customFrom.value, to: this.customTo.value }) };
  }

  async loadHistory(more = false) {
    this.historyLoading.value = true;
    this.historyError.value = null;
    try {
      const page = await orderRepository.listHistory(this.filter(), more ? this.cursor : null);
      this.history.value = more ? [...this.history.value, ...page.orders] : page.orders;
      this.cursor = page.cursor;
      this.hasMore.value = !!page.cursor;
    } catch {
      this.historyError.value = 'Impossible de charger l’historique. Vérifiez votre connexion.';
    } finally {
      this.historyLoading.value = false;
    }
  }

  /** Recherche par numéro (CB-…) ou par téléphone ; message d'aide si la saisie n'est ni l'un ni l'autre. */
  async runSearch(): Promise<string | null> {
    const q = this.search.value.trim();
    if (!q) {
      this.searchResults.value = null;
      return null;
    }
    const number = normalizeOrderNumber(q);
    const phone = number ? null : normalizePhone(q);
    if (!number && !phone) return 'Saisissez un numéro de commande (CB-261006-7K3F) ou un téléphone (07 07 00 00 01).';
    this.searching.value = true;
    try {
      this.searchResults.value = number ? [await orderRepository.get(number)].filter((o): o is WithId<Order> => !!o) : await orderRepository.byPhone(phone!);
      return null;
    } finally {
      this.searching.value = false;
    }
  }

  clearSearch() {
    this.search.value = '';
    this.searchResults.value = null;
  }

  /** CSV de la période filtrée (séparateur « ; », UTF-8 avec BOM pour Excel). */
  async exportCsv(): Promise<{ name: string; csv: string; count: number }> {
    const { from, to } = this.filter();
    const all = await orderRepository.listBetween(from ?? new Date(2020, 0, 1), to ?? new Date(Date.now() + 86_400_000));
    const rows = this.status.value ? all.filter((o) => o.status === this.status.value) : all;
    const cell = (v: unknown) => {
      const s = String(v ?? '');
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ['Numéro', 'Date', 'Statut', 'Cliente', 'Téléphone', 'Ville', 'Adresse', 'Articles', 'Sous-total', 'Remise', 'Code promo', 'Zone', 'Livraison', 'Total', 'Paiement', 'Payé', 'Note cliente', 'Note interne', 'Motif annulation'];
    const lines = rows.map((o) =>
      [
        o.orderNumber,
        o.createdAt ? o.createdAt.toLocaleString('fr-FR') : '',
        ORDER_STATUS_LABELS[o.status],
        o.customer.name,
        o.customer.phone,
        o.customer.city,
        o.customer.address,
        o.items.map((i) => `${i.qty} × ${i.name} (${i.variantLabel})`).join(' | '),
        o.subtotal,
        o.discount,
        o.promoCode ?? '',
        o.delivery.zoneName,
        o.delivery.fee,
        o.total,
        PAYMENT_LABELS[o.payment.method],
        o.payment.status === 'paid' ? 'oui' : 'non',
        o.customerNote,
        o.adminNote,
        o.cancelReason ?? '',
      ]
        .map(cell)
        .join(';'),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    return { name: `commandes-${stamp}.csv`, csv: `﻿${[head.join(';'), ...lines].join('\r\n')}`, count: rows.length };
  }

  /** Après une action dans le détail : l'historique affiché est rechargé (l'onglet En cours se met à jour seul). */
  async refreshAfterChange() {
    if (this.tab.value === 'history') await this.loadHistory();
    if (this.searchResults.value) await this.runSearch();
  }
}
