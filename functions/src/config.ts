// Paramètres et secrets des Cloud Functions.
// - defineString : valeur non sensible, lue dans functions/.env
// - defineSecret : valeur sensible, stockée dans Google Secret Manager
//   (en local, lue dans functions/.secret.local)
import { defineSecret, defineString, defineInt } from 'firebase-functions/params';

export { REGION } from './region.js';

// --- E-mail (formulaire de contact → propriétaire)
export const SMTP_HOST = defineString('SMTP_HOST', { default: 'mail.celestebotcho.com' });
export const SMTP_PORT = defineInt('SMTP_PORT', { default: 465 });
export const MAIL_FROM_NAME = defineString('MAIL_FROM_NAME', { default: 'Céleste Bôtchô — Site' });
export const MAIL_TO_OWNER = defineString('MAIL_TO_OWNER');
export const SMTP_USER = defineSecret('SMTP_USER');
export const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');

// --- Cloudinary (signature d'upload et suppression d'images côté serveur)
export const CLOUDINARY_CLOUD_NAME = defineString('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY = defineString('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = defineSecret('CLOUDINARY_API_SECRET');

// --- reCAPTCHA (vérification serveur hors App Check)
export const RECAPTCHA_SECRET_KEY = defineSecret('RECAPTCHA_SECRET_KEY');

// --- WhatsApp Business (lot 3)
export const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
