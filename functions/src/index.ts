import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Alertes push aux admins : aucune clé secrète requise.
export { onMessagePush } from './onMessagePush.js';
export { onOrderCreated } from './onOrderCreated.js';

// E-mail au propriétaire pour chaque message (onMessageCreated.ts) : activé en Phase 5, une fois les
// secrets SMTP enregistrés (firebase functions:secrets:set SMTP_USER / SMTP_PASSWORD). L'exporter ici
// avant obligerait à fournir tous les secrets de config.ts à chaque déploiement.
