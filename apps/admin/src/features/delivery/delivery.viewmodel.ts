// ViewModel de la Livraison : zones (nom, mode, tarif) dans settings/public.deliveryZones.
// Modifiable par la propriétaire (règles : seule elle écrit settings) ; consultable par les gestionnaires.
import { computed, signal } from '@preact/signals-core';
import type { DeliveryMode, DeliveryZone } from '@celeste/shared/models';
import { settingsRepository } from '@celeste/shared/repositories/settings.repository';
import { validateDeliveryZones } from '@celeste/shared/validation/settings.validation';

export interface ZoneRow {
  key: number;
  id: string; // vide pour une nouvelle zone (dérivé du nom à l'enregistrement)
  name: string;
  mode: DeliveryMode;
  fee: string;
}

let key = 0;
export const newZone = (mode: DeliveryMode = 'local'): ZoneRow => ({ key: ++key, id: '', name: '', mode, fee: '' });
const toRows = (zones: DeliveryZone[]): ZoneRow[] => zones.map((z) => ({ key: ++key, id: z.id, name: z.name, mode: z.mode, fee: String(z.fee) }));
const toZones = (rows: ZoneRow[]): DeliveryZone[] =>
  rows.map((r) => ({ id: r.id, name: r.name, mode: r.mode, fee: r.fee.trim() === '' ? -1 : Number(r.fee) }));

export class DeliveryViewModel {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly version = signal(0);
  rows: ZoneRow[] = [];
  private saved = '';

  readonly dirty = computed(() => {
    void this.version.value;
    return JSON.stringify(toZones(this.rows)) !== this.saved;
  });

  touch() {
    this.version.value = this.version.peek() + 1;
  }

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const s = await settingsRepository.getPublic();
      this.rows = toRows(s.deliveryZones);
      this.saved = JSON.stringify(toZones(this.rows));
      this.errors.value = {};
    } catch {
      this.error.value = 'Impossible de charger les zones de livraison. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
      this.touch();
    }
  }

  move(i: number, to: number) {
    if (to < 0 || to >= this.rows.length) return;
    this.rows.splice(to, 0, this.rows.splice(i, 1)[0]!);
    this.touch();
  }

  async save(): Promise<boolean> {
    const checked = validateDeliveryZones(toZones(this.rows));
    this.errors.value = checked.ok ? {} : checked.errors;
    this.touch();
    if (!checked.ok) return false;
    this.saving.value = true;
    try {
      const n = checked.value.length;
      await settingsRepository.saveDeliveryZones(checked.value, `${n} zone${n > 1 ? 's' : ''} de livraison`);
      this.rows = toRows(checked.value);
      this.saved = JSON.stringify(toZones(this.rows));
      return true;
    } finally {
      this.saving.value = false;
      this.touch();
    }
  }
}
