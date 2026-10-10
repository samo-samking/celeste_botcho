// Réglage des alertes, partagé par Commandes, Messages et le tableau de bord : son de l'onglet
// ouvert, et notifications push sur cet appareil (même admin fermé).
import { html, nothing } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { bell, check, volume, volumeOff } from '@celeste/shared/icons';
import { toast } from '../components/toast/toast';
import { push, setSound, soundOn, togglePush } from './live';

const onToggle = async () => {
  const message = await togglePush();
  if (push.value === 'on' || push.value === 'off') toast.success(message);
  else toast.error(message);
};

export function alertsControl() {
  const state = push.value;
  return html`
    <div class="order-alerts">
      <button class="btn btn--secondary btn--sm" type="button" aria-pressed=${soundOn.value ? 'true' : 'false'} @click=${() => setSound(!soundOn.value)}
        title=${soundOn.value ? 'Couper le son des alertes' : 'Activer le son des alertes'}>
        ${icon(soundOn.value ? volume : volumeOff)} ${soundOn.value ? 'Son activé' : 'Son coupé'}
      </button>
      ${state === 'on'
        ? html`<button class="btn btn--secondary btn--sm alerts-on" type="button" title="Ne plus recevoir les alertes sur cet appareil" @click=${onToggle}>
            ${icon(check)} Alertes sur cet appareil</button>`
        : state === 'off' || state === 'loading'
          ? html`<button class="btn btn--primary btn--sm" type="button" ?disabled=${state === 'loading'} @click=${onToggle}>
              ${icon(bell)} ${state === 'loading' ? 'Activation…' : 'Recevoir les alertes sur cet appareil'}</button>`
          : state === 'denied'
            ? html`<span class="order-alerts__note">Notifications bloquées dans ce navigateur</span>`
            : nothing}
    </div>
  `;
}
