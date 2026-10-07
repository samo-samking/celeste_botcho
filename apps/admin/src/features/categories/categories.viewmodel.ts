// ViewModel des catégories : liste ordonnée, création / modification, activation, ordre, suppression.
import { signal } from '@preact/signals-core';
import type { Category, WithId } from '@celeste/shared/models';
import { categoryRepository } from '@celeste/shared/repositories/category.repository';
import { validateCategory, type CategoryInput } from '@celeste/shared/validation/category.validation';

export class CategoriesViewModel {
  readonly list = signal<WithId<Category>[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Identifiant de la catégorie en cours de modification rapide (activation, ordre). */
  readonly pending = signal<string | null>(null);

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      this.list.value = await categoryRepository.listAll();
    } catch {
      this.error.value = 'Impossible de charger les catégories. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  /** Enregistre ; renvoie les erreurs par champ, ou null si tout s'est bien passé. */
  async save(input: CategoryInput, previous?: WithId<Category>): Promise<Record<string, string> | null> {
    const checked = validateCategory(input);
    if (!checked.ok) return checked.errors;
    if (await categoryRepository.slugTaken(checked.value.slug, previous?.id)) {
      return { slug: 'Cette adresse est déjà utilisée par une autre catégorie.' };
    }
    const next = this.list.value.reduce((max, c) => Math.max(max, c.sortOrder + 1), 0);
    await categoryRepository.save(checked.value, previous, next);
    await this.load();
    return null;
  }

  async toggle(category: WithId<Category>) {
    this.pending.value = category.id;
    try {
      await categoryRepository.setActive(category.id, !category.isActive);
      this.list.value = this.list.value.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c));
    } finally {
      this.pending.value = null;
    }
  }

  /** Déplace d'un cran (delta −1 / +1) ou vers un index précis (glisser-déposer). */
  async move(id: string, to: number) {
    const list = [...this.list.value];
    const from = list.findIndex((c) => c.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    list.splice(to, 0, list.splice(from, 1)[0]!);
    const previous = this.list.value;
    this.list.value = list.map((c, i) => ({ ...c, sortOrder: i })); // affichage immédiat
    this.pending.value = id;
    try {
      await categoryRepository.reorder(list.map((c) => c.id));
    } catch (e) {
      this.list.value = previous;
      throw e;
    } finally {
      this.pending.value = null;
    }
  }

  async remove(category: WithId<Category>) {
    await categoryRepository.remove(category.id);
    this.list.value = this.list.value.filter((c) => c.id !== category.id);
  }
}
