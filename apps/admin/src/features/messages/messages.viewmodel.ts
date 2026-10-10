// ViewModel des Messages : boîte de réception en temps réel, filtre par statut, recherche.
import { computed, signal } from '@preact/signals-core';
import type { Message, MessageStatus, Product, WithId } from '@celeste/shared/models';
import { messageRepository } from '@celeste/shared/repositories/message.repository';
import { productRepository } from '@celeste/shared/repositories/product.repository';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export class MessagesViewModel {
  readonly messages = signal<WithId<Message>[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<MessageStatus | 'all'>('all');
  readonly search = signal('');
  products = new Map<string, WithId<Product>>();
  private stop: (() => void) | null = null;

  readonly counts = computed(() => {
    const c: Record<MessageStatus | 'all', number> = { all: 0, new: 0, read: 0, done: 0 };
    for (const m of this.messages.value) {
      c.all++;
      c[m.status]++;
    }
    return c;
  });

  readonly shown = computed(() => {
    const q = normalize(this.search.value.trim());
    return this.messages.value.filter(
      (m) =>
        (this.filter.value === 'all' || m.status === this.filter.value) &&
        (!q || normalize(`${m.name} ${m.phone} ${m.subject} ${m.body}`).includes(q)),
    );
  });

  start() {
    this.stop = messageRepository.watch(
      (list) => {
        this.messages.value = list;
        this.loading.value = false;
        this.error.value = null;
      },
      () => {
        this.loading.value = false;
        this.error.value = 'Connexion perdue avec la boîte de réception. Elle se mettra à jour dès le retour du réseau.';
      },
    );
    void productRepository
      .listAll()
      .then((list) => (this.products = new Map(list.map((p) => [p.id, p]))))
      .catch(() => undefined);
  }

  dispose() {
    this.stop?.();
  }

  setStatus(m: WithId<Message>, status: MessageStatus) {
    return messageRepository.setStatus(m.id, status);
  }

  remove(m: WithId<Message>) {
    return messageRepository.remove(m.id);
  }
}
