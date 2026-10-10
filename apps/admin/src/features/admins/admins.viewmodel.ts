// ViewModel des Comptes admin (propriétaire) : liste, renommage, activation / désactivation.
import { signal } from '@preact/signals-core';
import type { Admin, WithId } from '@celeste/shared/models';
import { adminRepository } from '@celeste/shared/repositories/admin.repository';

export class AdminsViewModel {
  readonly admins = signal<WithId<Admin>[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pending = signal<string | null>(null);

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      this.admins.value = await adminRepository.listAll();
    } catch {
      this.error.value = 'Impossible de charger les comptes. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  private async run(a: WithId<Admin>, fn: () => Promise<void>) {
    this.pending.value = a.id;
    try {
      await fn();
      await this.load();
    } finally {
      this.pending.value = null;
    }
  }

  setActive(a: WithId<Admin>, isActive: boolean) {
    return this.run(a, () => adminRepository.setActive(a, isActive));
  }

  rename(a: WithId<Admin>, name: string) {
    return this.run(a, () => adminRepository.rename(a, name));
  }
}
