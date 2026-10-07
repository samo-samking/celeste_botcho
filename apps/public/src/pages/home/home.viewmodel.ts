// ViewModel de l'accueil. Les produits sont affichés par la vitrine (vitrine/), lue dans Firestore.
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { WHATSAPP_MESSAGES, WHATSAPP_NUMBER } from './config';

export class HomeViewModel {
  readonly whatsappHref = buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.general);
}
