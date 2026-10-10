// Compteurs en temps réel pour toute la session admin : commandes nouvelles et messages non lus.
// À chaque nouvelle commande (ou nouveau message) : son, notification du navigateur (si autorisée)
// et compteur dans l'onglet « (3) … ». Les navigateurs n'autorisent le son qu'après un premier clic.
import { signal } from '@preact/signals-core';
import type { Message, Order, WithId } from '@celeste/shared/models';
import { messageRepository } from '@celeste/shared/repositories/message.repository';
import { orderRepository } from '@celeste/shared/repositories/order.repository';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { disablePush, enablePush, pushState, type PushState } from '@celeste/shared/services/push.service';

export const newOrders = signal(0);
export const newMessages = signal(0);
/** Son activé (préférence conservée sur cet appareil). */
export const soundOn = signal(readPref('cb-admin-sound', true));
/** Notifications du navigateur : 'granted' | 'denied' | 'default' | 'unsupported'. */
export const notifyPermission = signal<NotificationPermission | 'unsupported'>('Notification' in window ? Notification.permission : 'unsupported');

function readPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export function setSound(on: boolean) {
  soundOn.value = on;
  try {
    localStorage.setItem('cb-admin-sound', on ? '1' : '0');
  } catch {
    /* sans conséquence */
  }
  if (on) chime();
}

/** Notifications push sur cet appareil (reçues même quand l'admin est fermé). */
export const push = signal<PushState | 'loading'>('loading');
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

export async function refreshPush() {
  push.value = VAPID_KEY ? await pushState().catch(() => 'off' as const) : 'unsupported';
}

/** Active ou désactive les alertes push de cet appareil ; renvoie un message pour la personne. */
export async function togglePush(): Promise<string> {
  if (push.value === 'on') {
    push.value = await disablePush();
    return 'Cet appareil ne recevra plus les alertes.';
  }
  push.value = 'loading';
  push.value = await enablePush(VAPID_KEY).catch(() => 'off' as const);
  notifyPermission.value = 'Notification' in window ? Notification.permission : 'unsupported';
  if (push.value === 'on') return 'Alertes activées : cet appareil sera prévenu de chaque nouvelle commande et de chaque message.';
  if (push.value === 'denied') return 'Notifications bloquées : autorisez-les dans les réglages du navigateur (icône du cadenas), puis réessayez.';
  return 'Impossible d’activer les alertes sur ce navigateur.';
}

// --- Son : deux notes douces générées (aucun fichier à charger) ------------------------------
let audio: AudioContext | null = null;
const unlock = () => {
  audio ??= new AudioContext();
  void audio.resume();
};
document.addEventListener('pointerdown', unlock, { once: true });
document.addEventListener('keydown', unlock, { once: true });

export function chime() {
  if (!audio || audio.state !== 'running') return;
  const t = audio.currentTime;
  [880, 1318.5].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.16);
    gain.gain.linearRampToValueAtTime(0.18, t + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.5);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t + i * 0.16);
    osc.stop(t + i * 0.16 + 0.55);
  });
}

function notify(title: string, body: string, tag: string, onClick: () => void) {
  // écran visible : le son et la liste suffisent ; push actif : la notification vient du serveur
  if (notifyPermission.value !== 'granted' || document.hasFocus() || push.value === 'on') return;
  const n = new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  n.onclick = () => {
    window.focus();
    onClick();
    n.close();
  };
}

// --- Titre de l'onglet --------------------------------------------------------------------------
let baseTitle = '';
function updateTitle() {
  const n = newOrders.value + newMessages.value;
  baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = n ? `(${n}) ${baseTitle}` : baseTitle;
}
new MutationObserver(() => {
  const n = newOrders.value + newMessages.value;
  if (n && !/^\(\d+\)/.test(document.title)) updateTitle();
}).observe(document.querySelector('title') ?? document.head, { childList: true, subtree: true, characterData: true });

// --- Écoute -------------------------------------------------------------------------------------
let stops: (() => void)[] = [];

/** Démarre l'écoute pour la session (appelé à l'affichage de la coque admin). */
export function startLive(goTo: (path: string) => void) {
  stopLive();
  void refreshPush();
  let knownOrders: Set<string> | null = null;
  let knownMessages: Set<string> | null = null;

  stops.push(
    orderRepository.watchActive(
      (orders: WithId<Order>[]) => {
        const fresh = orders.filter((o) => o.status === 'new');
        newOrders.value = fresh.length;
        if (knownOrders) {
          const arrived = fresh.filter((o) => !knownOrders!.has(o.id));
          if (arrived.length) {
            if (soundOn.value) chime();
            const o = arrived[0]!;
            notify(
              arrived.length > 1 ? `${arrived.length} nouvelles commandes` : 'Nouvelle commande',
              `${o.customer.name} · ${formatFcfa(o.total)} · ${o.delivery.zoneName}`,
              'order',
              () => goTo('/commandes'),
            );
          }
        }
        knownOrders = new Set(orders.map((o) => o.id));
        updateTitle();
      },
      () => undefined,
    ),
  );

  stops.push(
    messageRepository.watch(
      (messages: WithId<Message>[]) => {
        const unread = messages.filter((m) => m.status === 'new');
        newMessages.value = unread.length;
        if (knownMessages) {
          const arrived = unread.filter((m) => !knownMessages!.has(m.id));
          if (arrived.length) {
            if (soundOn.value) chime();
            notify('Nouveau message', `${arrived[0]!.name} : ${arrived[0]!.subject}`, 'message', () => goTo('/messages'));
          }
        }
        knownMessages = new Set(messages.map((m) => m.id));
        updateTitle();
      },
      () => undefined,
    ),
  );
}

export function stopLive() {
  stops.forEach((s) => s());
  stops = [];
  newOrders.value = 0;
  newMessages.value = 0;
  updateTitle();
}
