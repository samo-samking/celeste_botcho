// ViewModel du Journal (propriétaire) : actions des admins par pages de 50, filtre par type d'action
// et par auteur (sur les pages chargées), export des données de la boutique en JSON.
import { computed, signal } from '@preact/signals-core';
import type { Admin, AuditLog, WithId } from '@celeste/shared/models';
import { adminRepository } from '@celeste/shared/repositories/admin.repository';
import { auditLogRepository } from '@celeste/shared/repositories/audit-log.repository';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { orderRepository } from '@celeste/shared/repositories/order.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';
import { promotionRepository } from '@celeste/shared/repositories/promotion.repository';
import { settingsRepository } from '@celeste/shared/repositories/settings.repository';

/** Familles d'actions (préfixe de `action`). */
export const ACTION_GROUPS: Record<string, string> = {
  product: 'Produits',
  category: 'Catégories',
  order: 'Commandes',
  promotion: 'Promotions',
  settings: 'Configuration',
  delivery: 'Livraison',
  admin: 'Comptes',
};

export const ACTION_LABELS: Record<string, string> = {
  'product.create': 'Produit créé',
  'product.publish': 'Produit publié',
  'product.unpublish': 'Produit repassé en brouillon',
  'product.archive': 'Produit archivé',
  'product.price': 'Prix modifié',
  'product.delete': 'Produit supprimé',
  'category.create': 'Catégorie créée',
  'category.update': 'Catégorie modifiée',
  'category.delete': 'Catégorie supprimée',
  'order.status': 'Statut de commande',
  'order.cancel': 'Commande annulée',
  'promotion.create': 'Promotion créée',
  'promotion.update': 'Promotion modifiée',
  'promotion.enable': 'Promotion activée',
  'promotion.disable': 'Promotion désactivée',
  'promotion.delete': 'Promotion supprimée',
  'settings.update': 'Configuration modifiée',
  'delivery.update': 'Zones de livraison modifiées',
  'admin.enable': 'Compte réactivé',
  'admin.disable': 'Compte désactivé',
  'admin.rename': 'Compte renommé',
};

export class JournalViewModel {
  readonly logs = signal<WithId<AuditLog>[]>([]);
  readonly admins = signal<Map<string, WithId<Admin>>>(new Map());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly group = signal('');
  readonly actor = signal('');
  private cursor: Awaited<ReturnType<typeof auditLogRepository.list>>['cursor'] = null;

  readonly shown = computed(() =>
    this.logs.value.filter(
      (l) => (!this.group.value || l.action.startsWith(`${this.group.value}.`)) && (!this.actor.value || l.actorUid === this.actor.value),
    ),
  );

  async load(more = false) {
    this.loading.value = true;
    this.error.value = null;
    try {
      const [page, admins] = await Promise.all([
        auditLogRepository.list(more ? this.cursor : null),
        this.admins.value.size ? Promise.resolve(null) : adminRepository.listAll(),
      ]);
      if (admins) this.admins.value = new Map(admins.map((a) => [a.id, a]));
      this.logs.value = more ? [...this.logs.value, ...page.logs] : page.logs;
      this.cursor = page.cursor;
      this.hasMore.value = !!page.cursor;
    } catch {
      this.error.value = 'Impossible de charger le journal. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  actorName(uid: string): string {
    return this.admins.value.get(uid)?.displayName ?? (uid === 'inconnu' ? 'Inconnu' : 'Compte supprimé');
  }

  /** Sauvegarde manuelle : catalogue, promotions, réglages et toutes les commandes, en un fichier JSON. */
  async exportData(): Promise<{ name: string; json: string; counts: Record<string, number> }> {
    const [categories, products, promotions, settings, legal, orders] = await Promise.all([
      categoryRepository.listAll(),
      productRepository.listAll(),
      promotionRepository.listAll(),
      settingsRepository.getPublic(),
      settingsRepository.getLegal(),
      orderRepository.listBetween(new Date(2020, 0, 1), new Date(Date.now() + 86_400_000)),
    ]);
    const data = { exportedAt: new Date().toISOString(), categories, products, promotions, settings, legal, orders };
    return {
      name: `celeste-botcho-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
      json: JSON.stringify(data, null, 2),
      counts: { catégories: categories.length, produits: products.length, promotions: promotions.length, commandes: orders.length },
    };
  }
}
