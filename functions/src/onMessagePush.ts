// Nouveau message du formulaire de contact : alerte push aux admins
// (séparée de l'e-mail, qui dépend de la configuration SMTP).
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION } from './region.js';
import { notifyAdmins } from './push.js';

interface NewMessage {
  name: string;
  subject: string;
  body: string;
}

export const onMessagePush = onDocumentCreated({ document: 'messages/{id}', region: REGION }, async (event) => {
  const m = event.data?.data() as NewMessage | undefined;
  if (!m) return;
  const excerpt = m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body;
  await notifyAdmins({
    title: `💬 Message de ${m.name}`,
    body: `${m.subject}\n${excerpt}`,
    path: '/messages',
    tag: `message-${event.params.id}`,
  });
});
