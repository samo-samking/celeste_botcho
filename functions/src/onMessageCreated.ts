// Envoie un e-mail au propriétaire à chaque nouveau message du formulaire de contact.
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';
import {
  REGION,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  MAIL_FROM_NAME,
  MAIL_TO_OWNER,
} from './config.js';

interface ContactMessage {
  name: string;
  phone: string;
  subject: string;
  body: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const onMessageCreated = onDocumentCreated(
  { document: 'messages/{id}', region: REGION, secrets: [SMTP_USER, SMTP_PASSWORD] },
  async event => {
    const msg = event.data?.data() as ContactMessage | undefined;
    if (!msg) return;

    const port = SMTP_PORT.value();
    const transport = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
    });

    const waNumber = msg.phone.replace(/\D/g, '');
    await transport.sendMail({
      from: `"${MAIL_FROM_NAME.value()}" <${SMTP_USER.value()}>`,
      to: MAIL_TO_OWNER.value(),
      subject: `Nouveau message : ${msg.subject}`,
      text: `De : ${msg.name} (${msg.phone})\n\n${msg.body}`,
      html: `<p><strong>De :</strong> ${escapeHtml(msg.name)} — ${escapeHtml(msg.phone)}</p>
<p><strong>Sujet :</strong> ${escapeHtml(msg.subject)}</p>
<p style="white-space:pre-wrap">${escapeHtml(msg.body)}</p>
<p><a href="https://wa.me/${waNumber}">Répondre sur WhatsApp</a></p>`,
    });

    logger.info('E-mail de contact envoyé', { messageId: event.params.id });
  },
);
