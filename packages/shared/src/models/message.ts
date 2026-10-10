// Message du formulaire de contact.
export type MessageStatus = 'new' | 'read' | 'done';

export interface Message {
  name: string;
  phone: string; // +225XXXXXXXXXX
  email: string | null;
  subject: string;
  body: string; // 2 000 caractères maximum
  productId: string | null; // produit concerné (question posée depuis une fiche)
  status: MessageStatus;
  createdAt: Date | null;
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  new: 'Nouveau',
  read: 'Lu',
  done: 'Traité',
};
export const MESSAGE_BODY_MAX = 2000;
